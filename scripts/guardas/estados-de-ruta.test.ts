import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Toda página de `(app)` tiene un esqueleto mientras carga: su `loading.tsx` o el de una carpeta de arriba, sin pasar de
// `src/app/(app)` (el de ahí es el de la app entera). Sin él, la navegación deja la pantalla anterior congelada o en blanco
// (docs/UX.md › «Cargando»). Auditoría AA, 9.12-1: hoy vale el heredado; la parte 4 lo endurece a «propio».
const RAIZ = join(process.cwd(), 'src', 'app', '(app)')

function paginas(carpeta: string): string[] {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(carpeta, entrada.name)
    if (entrada.isDirectory()) return paginas(ruta)
    return entrada.name === 'page.tsx' ? [ruta] : []
  })
}

function tieneEsqueleto(pagina: string): boolean {
  for (let carpeta = dirname(pagina); ; carpeta = dirname(carpeta)) {
    if (existsSync(join(carpeta, 'loading.tsx'))) return true
    if (carpeta === RAIZ || !carpeta.startsWith(RAIZ)) return false
  }
}

describe('los esqueletos de ruta', () => {
  const todas = paginas(RAIZ)

  it('recorre las páginas de (app)', () => {
    expect(todas.length).toBeGreaterThan(20)
  })

  it('toda página de (app) tiene un loading.tsx propio o heredado', () => {
    const sinEsqueleto = todas
      .filter((pagina) => !tieneEsqueleto(pagina))
      .map((pagina) => relative(process.cwd(), pagina))
    expect(sinEsqueleto).toEqual([])
  })
})
