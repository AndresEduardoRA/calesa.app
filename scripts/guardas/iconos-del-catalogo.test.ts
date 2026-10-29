import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { CLAVES_DE_ICONO } from '../../src/shared/lib/iconos'
import { definicionSql } from '../lib/definicion-sql'
import { importacionesDe, resolver } from './barriles'

// El catálogo de iconos vive en TRES lugares que tienen que decir lo mismo: `src/shared/lib/iconos.ts` (la lista que ofrece el selector y
// que dibuja la interfaz), `_iconos_del_catalogo()` en la base (lo que aceptan las RPC) y los trazos de `ui/icono-del-catalogo/trazos.tsx`
// (el tipo `Record<ClaveDeIcono, …>` lo exige al compilar). Esta prueba compara el primero con el segundo: una clave que sólo tiene uno de
// los dos es un icono que se elige y la base rechaza, o uno que la base acepta y la pantalla no ofrece.

const RAIZ = process.cwd()
const leer = (ruta: string) => readFileSync(join(RAIZ, ruta), 'utf8')

// La definición vigente de la función es la que vale.
function clavesDeLaBase(): string[] {
  const cuerpo =
    /select array\[([\s\S]*?)\];/.exec(definicionSql('_iconos_del_catalogo').texto)?.[1] ?? ''
  return [...cuerpo.matchAll(/'([a-z]+)'/g)].map((m) => m[1] ?? '')
}

describe('el catálogo de iconos', () => {
  it('la base y el código dicen las mismas claves, en el mismo orden', () => {
    expect(clavesDeLaBase()).toEqual([...CLAVES_DE_ICONO])
  })

  it('la siembra sólo usa claves del catálogo', () => {
    const seed = leer('supabase/seed.sql')
    const usadas = [...seed.matchAll(/\('[a-z_]+', '[^']+', '([a-z]+)', \d+\)/g)].map(
      (m) => m[1] ?? '',
    )
    expect(usadas.length).toBeGreaterThan(5)
    for (const clave of usadas) {
      expect(CLAVES_DE_ICONO as readonly string[], `la siembra usa «${clave}»`).toContain(clave)
    }
  })
})

// El catálogo se carga con lo que dibuja un nombre, no con el marco de toda pantalla: lo que importa `src/app/(app)/layout.tsx` viaja en
// el JS de todas, y los 24 trazos no tienen que estar ahí (ni en el alta, que dibuja `<select>`: una `<option>` no lleva un SVG).
function alcanzados(entrada: string): string[] {
  const lector = (ruta: string) => (existsSync(join(RAIZ, ruta)) ? leer(ruta) : undefined)
  const vistos = new Set<string>([entrada])
  const pendientes = [entrada]
  while (pendientes.length > 0) {
    const actual = pendientes.shift() ?? ''
    for (const especificador of importacionesDe(lector(actual) ?? '')) {
      const ruta = resolver(actual, especificador, lector)
      if (ruta !== undefined && !vistos.has(ruta)) {
        vistos.add(ruta)
        pendientes.push(ruta)
      }
    }
  }
  return [...vistos]
}

describe('dónde no llega el catálogo de iconos', () => {
  const CATALOGO = 'src/shared/ui/icono-del-catalogo/'
  it.each([
    ['el layout (app): el marco de toda pantalla', 'src/app/(app)/layout.tsx'],
    ['la entrada del shell de leads: el botón «Nuevo lead»', 'src/modules/leads/shell.ts'],
  ])('%s no importa el catálogo', (_nombre, entrada) => {
    expect(existsSync(join(RAIZ, entrada)), entrada).toBe(true)
    const llegan = alcanzados(entrada).filter((ruta) => ruta.startsWith(CATALOGO))
    expect(llegan).toEqual([])
  })

  it('el detector ve el catálogo cuando sí está a la vista (el selector lo importa)', () => {
    expect(
      alcanzados('src/shared/ui/selector-de-icono.tsx').some((r) => r.startsWith(CATALOGO)),
    ).toBe(true)
  })
})
