import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

import { pruebasEnOrden } from './pruebas-de-la-base.mjs'

// `db:probar` corre su lista fija y, después, toda prueba SQL de un área (`supabase/tests/areas/**`), sin que el área edite la lista (4.15-7).
const raiz = mkdtempSync(join(tmpdir(), 'pruebas-de-la-base-'))
afterAll(() => rmSync(raiz, { recursive: true, force: true }))

function arbol(nombre: string, archivos: string[]): string {
  const dir = join(raiz, nombre)
  for (const a of archivos) {
    mkdirSync(join(dir, a, '..'), { recursive: true })
    writeFileSync(join(dir, a), '-- @test x\nselect 1;\n')
  }
  mkdirSync(dir, { recursive: true })
  return dir
}

const FIJA = ['humo.sql', 'escala.sql']

describe('pruebasEnOrden', () => {
  it('corre la lista fija primero y después las de las áreas, en orden alfabético de la ruta y a cualquier profundidad', () => {
    const dir = arbol('con-areas', [
      'humo.sql',
      'escala.sql',
      'areas/papelera/b.sql',
      'areas/final/a.sql',
      'areas/final/sub/c.sql',
      'areas/papelera/notas.md',
      'areas/papelera/datos.json',
    ])
    expect(pruebasEnOrden(FIJA, dir)).toEqual([
      'humo.sql',
      'escala.sql',
      'areas/final/a.sql',
      'areas/final/sub/c.sql',
      'areas/papelera/b.sql',
    ])
  })

  it('sin la carpeta de áreas, sólo la lista fija', () => {
    expect(pruebasEnOrden(FIJA, arbol('sin-areas', ['humo.sql']))).toEqual(FIJA)
  })

  it('con SOLO corre sólo esas, también por la ruta relativa de un área', () => {
    const dir = arbol('solo', ['areas/papelera/b.sql', 'areas/final/a.sql'])
    expect(pruebasEnOrden(FIJA, dir, ['escala.sql', 'areas/papelera/b.sql'])).toEqual([
      'escala.sql',
      'areas/papelera/b.sql',
    ])
  })
})
