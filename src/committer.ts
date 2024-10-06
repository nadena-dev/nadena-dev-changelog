import * as core from '@actions/core'

export const GIT_COMMITTER = core.getInput('git-committer')
export const GIT_EMAIL = core.getInput('git-email')

export const COMMITTER = {
  name: GIT_COMMITTER,
  email: GIT_EMAIL
}
