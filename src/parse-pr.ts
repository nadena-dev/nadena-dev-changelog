export function strip_html_comments(body: string): string {
  return body.replace(/<!--[\s\S]*?-->/gm, '')
}

const changelog_regex =
  /^(`{3,})CHANGELOG-([a-z-]+)\s*?\n\s*([\s\S]+?\S)\s*?\n\s*\1\s*$/gm

export interface Changelog {
  lang: string
  body: string
}

export function extract_changelog(body: string): Changelog[] {
  const matches = [...body.matchAll(changelog_regex)]
  return matches.map(match => {
    return { lang: match[2], body: match[3] }
  })
}
