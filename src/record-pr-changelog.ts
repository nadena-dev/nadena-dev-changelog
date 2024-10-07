import { Octokit } from '@octokit/action'
import * as core from '@actions/core'
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods'
import { extract_changelog, strip_html_comments } from './parse-pr.js'
import { COMMITTER } from './committer.js'
import { Base64 } from 'js-base64'
import { PullMeta } from './meta.js'

const no_changelog = /^NO-CHANGELOG\s*$/m
const prerel_only = /^CHANGELOG:\s*prerelease-only\s*$/m
const heading_re = /^\s*?#+?\s*?(\s.+?)\s*?\n+?/m

async function write_one(
  octokit: Octokit,
  path: string,
  content: string
): Promise<void> {
  const combined_repo = core.getInput('repository')
  const [owner, repo] = combined_repo.split('/')

  console.log(
    `Writing ${path} to ${owner}/${repo}:meta-changelog; contents:\n${content}`
  )
  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    branch: 'meta-changelog',
    message: 'Ingest changelog',
    content: Base64.encode(content),
    committer: COMMITTER
  })
}

export async function record_pr_changelog(): Promise<void> {
  const MyOctokit = Octokit.plugin(restEndpointMethods)
  const octokit = new MyOctokit()

  const combined_repo = core.getInput('repository')
  const pull_number = core.getInput('pull_request_id')

  const [owner, repo] = combined_repo.split('/')

  const pull = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: +pull_number
  })

  core.debug('body:\n' + JSON.stringify(pull.data, null, 2))

  if (!pull.data.merged) {
    console.log('PR not merged - skipping')
    return
  }

  let body = pull.data.body ?? ''
  body = strip_html_comments(body)

  const changelogs = extract_changelog(body)

  if (body.match(no_changelog)) {
    if (changelogs.length > 0) {
      core.setFailed(
        'Found CHANGELOG in PR body, but PR body contains NO-CHANGELOG'
      )
    }
    return
  } else {
    for (const changelog of changelogs) {
      core.debug(`Found changelog in ${changelog.lang}:\n${changelog.body}`)
    }

    if (changelogs.length === 0) {
      core.setFailed('No CHANGELOG found in the PR body')
    }
  }

  let heading: string | null = null
  const is_prerelease_only = body.match(prerel_only)

  for (const changelog of changelogs) {
    const processed = changelog.body.replace(heading_re, match => {
      if (changelog.lang == 'en-US') {
        heading = match.trim()
      }
      return ''
    })

    await write_one(
      octokit,
      `pr/${pull_number}/${changelog.lang}.md`,
      processed
    )
  }

  const meta: PullMeta = { tags: [] }
  if (is_prerelease_only) {
    meta.tags.push('prerelease-only')
  }
  if (heading !== null) {
    meta.heading = heading
  }

  await write_one(
    octokit,
    `pr/${pull_number}/meta.json`,
    JSON.stringify(meta, null, 2)
  )
}
