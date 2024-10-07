/**
 * The entrypoint for the action.
 */
import * as core from '@actions/core'

import { check_changelog } from './check-changelog.js'
import { record_pr_changelog } from './record-pr-changelog.js'
import parseArgs from 'minimist'
import { update_changelog } from './update-changelogs.js'

export async function run(): Promise<void> {
  try {
    const command: string = core.getInput('command')

    switch (command) {
      case 'check_changelog':
        await check_changelog()
        break
      case 'record_pr_changelog':
        await record_pr_changelog()
        break
      default:
        core.setFailed('Unknown command: ' + command)
        break
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

console.log(JSON.stringify(process.argv, null, 2))

if (process.argv.length > 2) {
  const args = parseArgs(process.argv)
  console.info(args)

  switch (args['command']) {
    case 'update-changelog':
      await update_changelog(args)
      break
    default:
      console.error('Unknown command: ' + args['command'])
      process.exit(1)
      break
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run()
