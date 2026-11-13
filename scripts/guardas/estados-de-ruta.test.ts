import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Toda página de `(app)` tiene su propio esqueleto mientras carga: el `loading.tsx` de su carpeta, que repite la forma de lo que la
// página dibuja después. Sin él, la navegación deja la pantalla anterior congelada o en blanco (docs/UX.md › «Cargando»), y uno
// heredado dibuja lo de otra pantalla. Auditoría AA, 9.12-4: desde aquí no vale el heredado.
const RAIZ = join(process.cwd(), 'src', 'app', '(app)')

function archivos(carpeta: string, nombre: string): string[] {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap((entrada) => {
    const ruta = join(carpeta, entrada.name)
    if (entrada.isDirectory()) return archivos(ruta, nombre)
    return entrada.name === nombre ? [ruta] : []
  })
}

const leer = (ruta: string) => readFileSync(join(process.cwd(), ruta), 'utf8')
const relativa = (ruta: string) => relative(process.cwd(), ruta)

describe('los esqueletos de ruta', () => {
  const paginas = archivos(RAIZ, 'page.tsx')
  const esqueletos = archivos(RAIZ, 'loading.tsx')

  it('recorre las páginas de (app)', () => {
    expect(paginas.length).toBeGreaterThan(20)
  })

  it('toda página de (app) tiene su propio loading.tsx', () => {
    const sinEsqueleto = paginas
      .filter((pagina) => !existsSync(join(dirname(pagina), 'loading.tsx')))
      .map(relativa)
    expect(sinEsqueleto).toEqual([])
  })

  it('todo loading.tsx dibuja un esqueleto y exporta su pantalla', () => {
    const vacios = esqueletos
      .filter((ruta) => {
        const texto = readFileSync(ruta, 'utf8')
        return !/export default/.test(texto) || !/Esqueleto|Skeleton/.test(texto)
      })
      .map(relativa)
    expect(vacios).toEqual([])
  })

  it('ningún loading.tsx queda sin su page.tsx', () => {
    const huerfanos = esqueletos
      .filter((ruta) => !existsSync(join(dirname(ruta), 'page.tsx')))
      .map(relativa)
    expect(huerfanos).toEqual([])
  })
})

// Un esqueleto avisa a un lector de pantalla que algo carga: `role="status"` con `aria-busy` y un `aria-label` «Cargando …». Un `aria-label` en un
// `div` sin rol no se lee (auditoría AA, 9.12-5, D4 de la 9.12-4). Valen los de `shared/ui/esqueletos/` y el de las pantallas de acceso.
describe('los esqueletos compartidos', () => {
  const esqueletos = [
    ...readdirSync(join(process.cwd(), 'src', 'shared', 'ui', 'esqueletos'))
      .filter((nombre) => /^esqueleto-.*\.tsx$/.test(nombre))
      .map((nombre) => `src/shared/ui/esqueletos/${nombre}`),
    'src/app/(acceso)/esqueleto-acceso.tsx',
  ]

  it('recorre los cinco de shared/ui y el de acceso', () => {
    expect(esqueletos.length).toBe(6)
  })

  it('todo esqueleto lleva role="status", aria-busy y un aria-label «Cargando …»', () => {
    const sinAviso = esqueletos.filter((ruta) => {
      const texto = leer(ruta)
      return (
        !/role="status"/.test(texto) ||
        !/aria-busy="true"/.test(texto) ||
        !/aria-label="Cargando /.test(texto)
      )
    })
    expect(sinAviso).toEqual([])
  })
})

// La transición entre pantallas es un fundido corto; con movimiento reducido no se anima (docs/UX.md › «Movimiento»).
describe('la transición de página', () => {
  it('el template de (app) envuelve cada pantalla en TransicionPagina', () => {
    expect(leer('src/app/(app)/template.tsx')).toMatch(/TransicionPagina/)
  })

  it('con prefers-reduced-motion: reduce apaga las animaciones de la transición', () => {
    const css = leer('src/app/globals.css')
    const bloque = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(bloque).toMatch(/::view-transition-old\(\*\)/)
    expect(bloque).toMatch(/::view-transition-new\(\*\)/)
    expect(bloque).toMatch(/animation:\s*none/)
  })

  it('con prefers-reduced-motion: reduce las duraciones valen 0 ms', () => {
    const tokens = leer('design/tokens.css')
    const bloque = tokens.slice(tokens.indexOf('@media (prefers-reduced-motion: reduce)'))
    expect(bloque).toMatch(/--dur-pagina:\s*0ms/)
    expect(bloque).toMatch(/--dur-rapida:\s*0ms/)
  })
})
