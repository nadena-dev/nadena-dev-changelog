import FileHound from 'filehound'
import { PullMeta } from './meta.js'
import { ParsedArgs } from 'minimist'
import { readFileSync, writeFileSync } from 'fs'

interface PRInfo {
  meta?: PullMeta
  inserted?: boolean
  changelog?: string
}

// Dictionary of PR number to PRInfo
type PRDict = { [key: string]: PRInfo }

const re_meta_file = /\/(\d+)\/meta\.json$/
const re_sentinel = /\/(\d+)\/inserted$/
const re_changelog = /\/(\d+)\/([a-zA-Z-]+)\.md$/
const re_pr_start = /^<!--\s*PR-(\d+)\s*-->\s*$/m
const re_heading = /^##\s+(.*?)\s*$/
const re_end = /^<!--\s*END\s*-->\s*$/

async function load_metadata(
  meta_path: string,
  target_lang: string,
  fallback_lang: string
): Promise<PRDict> {
  const pr_dict: PRDict = {}

  const files = await FileHound.create().paths(meta_path).find()

  for (const file of files) {
    let match = re_meta_file.exec(file)
    if (match) {
      const pr_number = match[1]
      const body = readFileSync(file, 'utf8')
      const meta = JSON.parse(body)

      if (!pr_dict[pr_number]) {
        pr_dict[pr_number] = {}
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
        pr_dict[pr_number] = {}
      }

      if (
        lang === target_lang ||
        (lang === fallback_lang && !pr_dict[pr_number].changelog)
      ) {
        pr_dict[pr_number].changelog = body
      }
    }

    match = re_sentinel.exec(file)
    if (match) {
      const pr_number = match[1]
      if (!pr_dict[pr_number]) {
        pr_dict[pr_number] = {}
      }
      pr_dict[pr_number].inserted = true
    }
  }

  return pr_dict
}

export async function update_changelog(args: ParsedArgs): Promise<void> {
  console.log('update_changelog')
  const meta_root = args['meta']
  const changelog = args['changelog']
  const lang = args['lang']
  const fallback_lang = args['fallback-lang']

  const metadata = await load_metadata(meta_root, lang, fallback_lang)

  console.log(JSON.stringify(metadata, null, 2))

  let changelog_string = readFileSync(changelog, 'utf8')

  const { present_prs, unreleased_headings } = parse_known_prs(changelog_string)

  console.info({
    metadata,
    present_prs,
    unreleased_headings
  })

  for (const pr_number of present_prs) {
    if (metadata[pr_number]) {
      metadata[pr_number].inserted = true
    }
  }

  for (const pr_number of [...Object.keys(metadata)]) {
    const pr = metadata[pr_number]
    if (!pr.changelog) {
      delete metadata[pr_number]
    }
  }

  changelog_string = insert_unknown_prs(
    changelog_string,
    metadata,
    unreleased_headings
  )

  writeFileSync(changelog, changelog_string)

  for (const pr_number of Object.keys(metadata)) {
    const pr = metadata[pr_number]
    if (pr.inserted) {
      writeFileSync(`${meta_root}/${pr_number}/inserted`, '')
    }
  }
}

function format_pr(pr_number: string, pr: PRInfo): string[] {
  const lines = []

  if (pr.meta) {
    lines.push(JSON.stringify(pr.meta))
  }

  lines.push(`<!-- PR-${pr_number} -->`)
  lines.push(pr.changelog ?? '')
  lines.push('<!-- END -->')

  return lines
}

function insert_unknown_prs(
  changelog_string: string,
  metadata: PRDict,
  unreleased_headings: Set<string>
): string {
  const lines = changelog_string.split('\n')
  const output_lines = []
  let toplevel_section_count = 0
  let cur_heading: string | undefined = undefined

  const heading_to_pr = new Map<string, string[]>()

  for (const pr_number of Object.keys(metadata)) {
    const pr = metadata[pr_number]
    if (!pr.inserted) {
      const heading = pr.meta?.heading ?? 'Uncategorized'

      if (!heading_to_pr.has(heading)) {
        heading_to_pr.set(heading, [])
      }
      heading_to_pr.get(heading)?.push(pr_number)
    }
  }

  let line: string | undefined
  while ((line = lines.shift())) {
    if (line.startsWith('# ')) {
      output_lines.push(line)

      toplevel_section_count++

      if (toplevel_section_count === 1) {
        for (const heading of Object.keys(heading_to_pr)) {
          if (!unreleased_headings.has(heading)) {
            output_lines.push(`## ${heading}`)

            for (const pr_number of heading_to_pr.get(heading) ?? '') {
              const pr = metadata[pr_number]
              output_lines.push(...format_pr(pr_number, pr))
            }
          }
        }
      } else if (toplevel_section_count > 1) {
        lines.unshift(output_lines.pop() ?? '')
        break
      }
      continue
    }

    const heading_match = re_heading.exec(line)
    if (heading_match) {
      console.log(`encountered heading: ${heading_match[1]}`)
      // Before we move to the next heading, we need to 1) remove any blank lines at the end,
      // and 2) flush any new entries for this heading
      while (
        output_lines.length > 0 &&
        output_lines[output_lines.length - 1].trim() === ''
      ) {
        output_lines.pop()
      }

      const new_prs = heading_to_pr.get(heading_match[1])
      if (new_prs) {
        for (const pr_number of new_prs) {
          const pr = metadata[pr_number]
          output_lines.push(...format_pr(pr_number, pr))
        }
      }

      output_lines.push('')

      cur_heading = heading_match[1]
    }

    const pr_match = re_pr_start.exec(line)
    if (
      pr_match &&
      Object.prototype.hasOwnProperty.call(metadata, pr_match[1])
    ) {
      while (!re_end.exec(lines[0])) {
        lines.shift()
      }
      output_lines.push(line)

      const pr = metadata[pr_match[1]]
      output_lines.push(...format_pr(pr_match[1], pr))

      // Allow the end line to flush below
    }

    output_lines.push(line)
  }

  // Flush the last encountered section
  const new_prs = heading_to_pr.get(cur_heading ?? '')
  if (new_prs) {
    for (const pr_number of new_prs) {
      const pr = metadata[pr_number]
      output_lines.push(...format_pr(pr_number, pr))
    }
  }

  // Flush any remaining lines
  output_lines.push(...lines)

  return output_lines.join('\n') + '\n'
}

function parse_known_prs(changelog_string: string): {
  present_prs: Set<string>
  unreleased_headings: Set<string>
} {
  const present_prs = new Set<string>()
  const unreleased_headings = new Set<string>()

  const lines = changelog_string.split('\n')
  let toplevel_section_count = 0

  for (const line of lines) {
    const match = re_pr_start.exec(line)
    if (match) {
      const pr_number = match[1]
      present_prs.add(pr_number)
    }

    if (line.startsWith('# ')) {
      toplevel_section_count++
    }

    const heading_match = re_heading.exec(line)
    if (heading_match && toplevel_section_count === 1) {
      unreleased_headings.add(heading_match[1])
    }
  }

  return { present_prs, unreleased_headings }
}
