// Compila os dois testes com esbuild e roda cada um.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
// Chama o JS do esbuild direto pelo node: o wrapper .cmd quebra com espacos no caminho.
const esbuild = path.join(root, 'node_modules', 'esbuild', 'bin', 'esbuild')

const suites = [
  { src: 'tests/smoke.ts', out: '.tmp-smoke.cjs' },
  { src: 'tests/render.tsx', out: '.tmp-render.cjs' },
]

let failed = 0
for (const s of suites) {
  execFileSync(
    process.execPath,
    [
      esbuild,
      s.src,
      '--bundle',
      '--platform=node',
      '--format=cjs',
      '--jsx=automatic',
      `--outfile=${s.out}`,
      '--log-level=error',
      '--loader:.css=empty',
    ],
    { cwd: root, stdio: 'inherit' },
  )
  try {
    execFileSync(process.execPath, [s.out], { cwd: root, stdio: 'inherit' })
  } catch {
    failed++
  }
  fs.rmSync(path.join(root, s.out), { force: true })
}

process.exit(failed ? 1 : 0)
