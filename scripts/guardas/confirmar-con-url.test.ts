import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CONFIRMAR_CON_URL } from './confirmar-con-url'

// Todo diálogo de confirmación tiene su URL (`.claude/rules/ui.md`): se abre con su `?panel=`, «atrás» lo cierra, la recarga lo
// reabre y el foco vuelve a quien lo abrió. Un `<Confirmar>` con un `useState(false)` no cumple nada de eso. Esta prueba lista cada
// `<Confirmar>` del árbol y exige que figure en `confirmar-con-url.ts` con lo que lo abre por la URL.

const RAIZ = process.cwd()

function* archivos(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, e.name)
    if (e.isDirectory()) {
      yield* archivos(ruta)
    } else if (/\.tsx?$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) {
      yield ruta
    }
  }
}

const aRelativa = (ruta: string) => relative(RAIZ, ruta).replaceAll('\\', '/')
const leer = (archivo: string) => readFileSync(join(RAIZ, archivo), 'utf8')

describe('los diálogos de confirmación tienen su URL', () => {
  const conConfirmar = [...archivos(join(RAIZ, 'src'))]
    .map(aRelativa)
    .filter((archivo) => archivo.endsWith('.tsx') && archivo !== 'src/shared/ui/confirmar.tsx')
    .filter((archivo) => /<Confirmar[\s>]/.test(leer(archivo)))
    .sort()

  it('cada <Confirmar> de src/ figura en el registro, y el registro no tiene de más', () => {
    expect(conConfirmar).toEqual(Object.keys(CONFIRMAR_CON_URL).sort())
  })

  it('lo que lo abre escribe la URL y nombra su panel', () => {
    for (const [archivo, { abre, senal }] of Object.entries(CONFIRMAR_CON_URL)) {
      const texto = leer(abre)
      expect(texto, `${archivo}: ${abre} debe nombrar «${senal}»`).toContain(senal)
      expect(
        /usePanelPorUrl|useQueryStates?\(/.test(texto),
        `${archivo}: ${abre} debe llevar el estado en la URL (usePanelPorUrl o nuqs)`,
      ).toBe(true)
    }
  })
})
