import { Octokit } from '@octokit/action'
import * as core from '@actions/core'
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods'

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

  //const body = pull.data

  console.log('body:\n' + JSON.stringify(pull.data, null, 2))
}
