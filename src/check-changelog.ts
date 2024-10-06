import { Octokit } from '@octokit/action'
import * as core from '@actions/core'
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods'
import { extract_changelog, strip_html_comments } from './parse-pr.js'
const MyOctokit = Octokit.plugin(restEndpointMethods)
const octokit = new MyOctokit()

export async function check_changelog(): Promise<void> {
  const combined_repo = core.getInput('repository')
  const pull_number = core.getInput('pull_request_id')

  const [owner, repo] = combined_repo.split('/')

  const pull = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: +pull_number
  })

  core.debug('body:\n' + JSON.stringify(pull.data, null, 2))

  let body = pull.data.body ?? ''
  body = strip_html_comments(body)

  const changelogs = extract_changelog(body)

  for (const changelog of changelogs) {
    core.debug(`Found changelog in ${changelog.lang}:\n${changelog.body}`)
  }

  if (changelogs.length === 0) {
    throw new Error('No CHANGELOG found in the PR body')
  }
}
