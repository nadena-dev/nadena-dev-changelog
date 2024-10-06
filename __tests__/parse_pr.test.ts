import {
  Changelog,
  extract_changelog,
  strip_html_comments
} from '../src/parse-pr'
import { expect, test } from '@jest/globals'

test('strip_html_comment should remove HTML comments from a string', () => {
  const input = '<p>This is a <!-- comment --> test.</p>'
  const expected = '<p>This is a  test.</p>'
  const result = strip_html_comments(input)
  expect(result).toBe(expected)
})

test('strip_html_comment should remove multiple HTML comments from a string', () => {
  const input =
    '<!-- Comment 1 --><p>This is a <!-- Comment 2 --> test.</p><!-- Comment 3 -->'
  const expected = '<p>This is a  test.</p>'
  const result = strip_html_comments(input)
  expect(result).toBe(expected)
})

test('strip_html_comment should handle empty string input', () => {
  const input = ''
  const expected = ''
  const result = strip_html_comments(input)
  expect(result).toBe(expected)
})

test('strip_html_comment should handle input without HTML comments', () => {
  const input = '<p>This is a test.</p>'
  const expected = '<p>This is a test.</p>'
  const result = strip_html_comments(input)
  expect(result).toBe(expected)
})

test('strip_html_comment should handle multi-line input', () => {
  const input = `a<!--
FOO
-->b`
  const expected = 'ab'
  const result = strip_html_comments(input)
  expect(result).toBe(expected)
})

test('extract_changelog should extract a single changelog', () => {
  const input = '```CHANGELOG-en\n# Changelog\n\n- Foo\n- Bar\n```'
  const expected = [{ lang: 'en', body: '# Changelog\n\n- Foo\n- Bar' }]
  const result = extract_changelog(input)
  expect(result).toEqual(expected)
})

test('extract_changelog strips leading and trailing whitespace', () => {
  const input =
    '```CHANGELOG-en\n   \t \n# Changelog\n\n- Foo\n- Bar\n\t\t  \t\n```'
  const expected = [{ lang: 'en', body: '# Changelog\n\n- Foo\n- Bar' }]
  const result = extract_changelog(input)
  expect(result).toEqual(expected)
})

test('extract_changelog should extract multiple changelogs', () => {
  const input =
    '```CHANGELOG-en\n# Changelog\n\n- Foo\n- Bar\n```\n```CHANGELOG-de\n# Änderungen\n\n- Foo\n- Bar\n```'
  const expected = [
    { lang: 'en', body: '# Changelog\n\n- Foo\n- Bar' },
    { lang: 'de', body: '# Änderungen\n\n- Foo\n- Bar' }
  ]
  const result = extract_changelog(input)
  expect(result).toEqual(expected)
})

test('extract_changelog should handle empty input', () => {
  const input = ''
  const expected: Changelog[] = []
  const result = extract_changelog(input)
  expect(result).toEqual(expected)
})

test('extract_changelog should handle input without changelogs', () => {
  const input = 'This is a test.'
  const expected: Changelog[] = []
  const result = extract_changelog(input)
  expect(result).toEqual(expected)
})
