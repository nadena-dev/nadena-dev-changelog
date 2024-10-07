import { Changelog } from './parse-pr.js'
import FileHound from 'filehound'
import { PullMeta } from './meta.js'
import { readFileSync } from 'fs'
import { ParsedArgs } from 'minimist'

interface PRInfo {
  meta?: PullMeta
  changelogs: { [lang: string]: Changelog }
}

// Dictionary of PR number to PRInfo
type PRDict = { [key: string]: PRInfo }

const re_meta_file = /\/(\d+)\/meta\.json$/
const re_changelog = /\/(\d+)\/([a-zA-Z-]+)\.md$/

async function load_metadata(meta_path: string): Promise<PRDict> {
  const pr_dict: PRDict = {}

  const files = await FileHound.create().paths(meta_path).find()

  for (const file of files) {
    let match = re_meta_file.exec(file)
    if (match) {
      const pr_number = match[1]
      const meta = JSON.parse(file)

      if (!pr_dict[pr_number]) {
        pr_dict[pr_number] = { changelogs: {} }
      }
      pr_dict[pr_number].meta = meta
    }

    match = re_changelog.exec(file)
    if (match) {
      const pr_number = match[1]
      const lang = match[2]
      // read file
      const body = readFileSync(file, 'utf8')

      if (!pr_dict[pr_number]) {
        pr_dict[pr_number] = { changelogs: {} }
      }
      pr_dict[pr_number].changelogs[lang] = { lang, body }
    }
  }

  return pr_dict
}

export async function update_changelog(args: ParsedArgs): Promise<void> {
  console.log('update_changelog')
  const meta_root = args['meta']
  //const changelog = args['changelog']

  const metadata = await load_metadata(meta_root)

  console.log(JSON.stringify(metadata, null, 2))
}
