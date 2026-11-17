// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SERVER = join(__dirname, '..', '..', 'src', 'server')

function sources(dir: string): string[] {
  return readdirSync(join(SERVER, dir), { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.ts'))
    .map((e) => join(SERVER, dir, e.name))
}

const importsOf = (file: string) =>
  [...readFileSync(file, 'utf8').matchAll(/^\s*(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]/gm)].map((m) => m[1])

describe('layering (the old ArchUnit rules)', () => {
  it('domain/ and engine/ stay framework-free: only each other, errors and plain TypeScript', () => {
    for (const file of [...sources('domain'), ...sources('engine')]) {
      for (const spec of importsOf(file)) {
        const ok = spec.startsWith('.') && !/\/(services|http|ismis|datasource|db|config)(\/|$)/.test(spec)
        expect(ok, `${file} must not import "${spec}"`).toBe(true)
      }
    }
  })

  it('nothing but the HTTP/route layer touches Next.js', () => {
    for (const dir of ['domain', 'engine', 'ismis', 'datasource', 'services']) {
      for (const file of sources(dir)) {
        expect(importsOf(file).filter((s) => s.startsWith('next')), file).toEqual([])
      }
    }
  })

  it('only the persistence-facing modules import the database client', () => {
    for (const dir of ['domain', 'engine', 'ismis', 'datasource']) {
      for (const file of sources(dir)) {
        expect(importsOf(file).filter((s) => s.includes('prisma') || s.endsWith('/db')), file).toEqual([])
      }
    }
  })
})
