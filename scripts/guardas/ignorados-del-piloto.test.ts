import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Un worktree vive en `.claude/worktrees/` y el piloto escribe en `.piloto/`: ninguno es código de este árbol. `.gitignore` solo no
// alcanza: `tsc` (`include: **/*.ts`) y el ESLint plano (no ignora carpetas con punto) los leerían y el `typecheck` y el `lint` de
// otra sesión caerían por archivos que no son suyos; Prettier tampoco lee `.gitignore` de forma por defecto aquí.
const RAIZ = process.cwd()
const leer = (archivo: string) => readFileSync(join(RAIZ, archivo), 'utf8')
const lineas = (archivo: string) =>
  leer(archivo)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))

describe('lo que el piloto y los worktrees dejan fuera de las herramientas', () => {
  it('.gitignore ignora .piloto, los worktrees y la huella del hook Stop', () => {
    const ignoradas = lineas('.gitignore')
    for (const ruta of ['.piloto/', '.claude/worktrees/', '.claude/.verificado-stop']) {
      expect(ignoradas, ruta).toContain(ruta)
    }
  })

  it('tsconfig.json los excluye de tsc', () => {
    const { exclude } = JSON.parse(leer('tsconfig.json')) as { exclude: string[] }
    expect(exclude).toContain('.claude/worktrees')
    expect(exclude).toContain('.piloto')
  })

  it('eslint.config.mjs los ignora globalmente', () => {
    const config = leer('eslint.config.mjs')
    expect(config).toContain("'.claude/worktrees/**'")
    expect(config).toContain("'.piloto/**'")
  })

  it('.prettierignore los ignora', () => {
    const ignoradas = lineas('.prettierignore')
    expect(ignoradas).toContain('.claude/worktrees')
    expect(ignoradas).toContain('.piloto')
  })

  it('.worktreeinclude copia sólo el .env.local', () => {
    expect(lineas('.worktreeinclude')).toEqual(['.env.local'])
  })
})
