# `main` branch

The primary changelog file on the main branch looks like this:

```
[header stuff]

# UNRELEASED

## Added
<!-- PR-1234 -->
- Changed a thing ([#1234](https://...)) (author)
<!-- END -->

## Changed
<!-- PR-1234 -->
- Changed a thing ([#1234](https://...)) (author)
<!-- END -->

# 1.2.3

## Removed
<!-- PR-1234 -->
- Changed a thing ([#1234](https://...)) (author)
<!-- END -->

```

A periodic action updates this file based on changelog metadata stored in the
`meta-changelog` branch. This branch is structured as a series of independent
files:

```
# file: /pr/1234/meta.json
{ 'tags': [prerelease-only] }

# file: /pr/1234/lang/en-US.md
- Changed a thing ([#1234](https://...)) (author)

file: /pr/1234/lang/ja-JP.md
- 何かを変更 ([#1234](https://...)) (author)
```

# PR merges

On a PR merge
(`github.event_name == 'pull_request' && github.event.action == 'closed' && github.event.pull_request.merged == true`)
we extract the changelog from the PR description and store it in the
`meta-changelog` branch.

PRs have changelog tags that look like this in the description:

````

```CHANGELOG-en-US
## Changed
- Changed a thing ([#PR]) (#author)
```

````

The `([#PR])` and `(#author)` tags are replaced appropriately on merge.

There are some other meta-directives:

```
CHANGELOG: prerelease-only
```

```
NO-CHANGELOG
```

# Localization sync

Updating the `meta-changelog` branch triggers a localization sync workflow. This
workflow (which also runs periodically) generates a merged translation JSON file
compatible with crowdin (https://store.crowdin.com/yaml), and uploads it to the
Crowdin API directly (along with all committed translations)

[TODO]

# Primary changelog generation

A daily sync script runs to update the `CHANGELOG.md` and
`CHANGELOG-prerelease.md` in the main repository. Here we:

- Download the current changelog
- Add any PRs not previously added in the changelog to the UNRELEASED section
  (with commented markers to identify them)
- Commit the result back to the repo, if changed
- Mark the PRs that we added with a sentinel file (`/pr/1234/added`) in the
  `meta-changelog` branch

On release, we also run this script, and abort the release if any PRs have not
yet been added.

# Back-syncing changelog contents

When changes are made to CHANGELOG.md or CHANGELOG-prerelease.md themselves, we
sync the change to the meta branch. We require that both CHANGELOG and
CHANGELOG-prerelease have the same contents for a PR (if present).

# Translation generation

As part of docs generation, we generate changelogs for other languages. This
primarily means just replacing the tagged sections of the changelog with the
appropriate translated version, if available.
