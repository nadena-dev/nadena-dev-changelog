import { Octokit } from '@octokit/action'
import * as core from '@actions/core'
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods'

const filter_comment = /<!--.*?-->/gm
const changelog_en = /^(`{3,})CHANGELOG-([a-z-]+)\s*?\n\s*([\s\S]+?)\n\1\s*$/gm

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

  let body = pull.data.body ?? ''
  body = body.replaceAll(filter_comment, '')

  const matches = [...body.matchAll(changelog_en)]
  for (const match of matches) {
    console.log('match:\n' + JSON.stringify(match, null))
  }

  if (matches.length === 0) {
    throw new Error('No CHANGELOG found in the PR body')
  }

  //const body = pull.data

  console.log('body:\n' + JSON.stringify(pull.data, null, 2))
}
