import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const projectRoot = resolve(root, '..')

const scanRoots = [
  join(root, 'src'),
  join(projectRoot, 'backend/routers'),
  join(projectRoot, 'backend/tests'),
]

const sourceExtensions = new Set(['.js', '.jsx', '.py'])

const mojibakeFragments = [
  '\u7481',
  '\u9428',
  '\u7edb',
  '\u95bf',
  '\u5a06',
  '\u59ab',
  '\u6d63',
  '\u934d',
  '\u6fc2',
  '\u6af3',
  '\u6b7f',
  '\ufffd',
  '\u951b',
  '\u9286',
  '\u6d93',
  '\u4e36',
  '\u6d60',
]

function listSourceFiles(dir) {
  return readdirSync(dir).flatMap(name => {
    const file = join(dir, name)
    const stats = statSync(file)
    if (stats.isDirectory()) return listSourceFiles(file)
    return sourceExtensions.has(extname(file)) ? [file] : []
  })
}

describe('visible source copy', () => {
  it('does not contain common mojibake fragments', () => {
    const files = scanRoots.flatMap(listSourceFiles)

    for (const file of files) {
      const source = readFileSync(file, 'utf8')
      for (const fragment of mojibakeFragments) {
        expect(source, `${file} contains mojibake fragment ${fragment}`).not.toContain(fragment)
      }
    }
  })
})
