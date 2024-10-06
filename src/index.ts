/**
 * The entrypoint for the action.
 */
import * as core from '@actions/core'

import { check_changelog } from './check-changelog.js'

export async function run(): Promise<void> {
  try {
    const command: string = core.getInput('command')

    switch (command) {
      case 'check-changelog':
        await check_changelog()
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

// eslint-disable-next-line @typescript-eslint/no-floating-promises
run()
