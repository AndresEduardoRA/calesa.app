import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// `supabase db reset` aplica las migraciones por el orden de su nombre. Los prefijos del repo van por delante de la fecha real (las
// primeras partes se numeraron con la fecha de un día que todavía no había llegado: hoy el último es `20261019003300`), así que
// `supabase migration new` pondría el de hoy y la migración nueva quedaría ANTES de las que ya la necesitan: el reset falla lejos de
// donde se cometió el error. Lo que se agrega respecto de HEAD (sin commitear o recién agregado) lleva un prefijo mayor que el de
// toda migración que HEAD ya tiene. Lo de antes no se toca: renombrar una migración cambia su clave de orden y las más de treinta
// referencias que tienen en los docs, y el historial guarda una excepción deliberada (`20261011000050_tipo_lead_legado`).
const PREFIJO = /^(\d{14})_[a-z0-9_]+\.sql$/

const prefijoDe = (nombre: string) => PREFIJO.exec(nombre)?.[1] ?? ''

// Las migraciones del árbol que HEAD no tiene y que no quedan después de la última que HEAD sí tiene.
function fueraDeOrden(enHead: readonly string[], enElArbol: readonly string[]) {
  const conocidas = new Set(enHead)
  const ultima = enHead.map(prefijoDe).sort().at(-1) ?? ''
  return enElArbol.filter((nombre) => !conocidas.has(nombre) && prefijoDe(nombre) <= ultima)
}

const siguiente = (ultima: string) => String(BigInt(ultima) + 100n)

describe('el orden de las migraciones: la regla', () => {
  const head = [
    '20261011000000_esquema_base.sql',
    '20261019003200_listado_por_cartera.sql',
    '20261019003300_busqueda_por_candidatos.sql',
  ]

  it('una migración nueva con un prefijo mayor al último pasa', () => {
    expect(fueraDeOrden(head, [...head, '20261019003400_algo.sql'])).toEqual([])
  })

  it('con la fecha de hoy, que queda antes del último, falla', () => {
    expect(fueraDeOrden(head, [...head, '20261018221500_algo.sql'])).toEqual([
      '20261018221500_algo.sql',
    ])
  })

  it('el mismo prefijo que el último también falla: el orden entre las dos dependería del nombre', () => {
    expect(fueraDeOrden(head, [...head, '20261019003300_otra_cosa.sql'])).toEqual([
      '20261019003300_otra_cosa.sql',
    ])
  })

  it('lo que HEAD ya tiene no se juzga, aunque esté fuera de orden', () => {
    const conExcepcion = [...head, '20261011000050_tipo_lead_legado.sql']
    expect(fueraDeOrden(conExcepcion, conExcepcion)).toEqual([])
  })

  it('un nombre que no es «14 dígitos_nombre.sql» cuenta como fuera de orden', () => {
    expect(fueraDeOrden(head, [...head, 'mi_migracion.sql'])).toEqual(['mi_migracion.sql'])
  })

  it('sugiere el prefijo que sigue al último', () => {
    expect(siguiente('20261019003300')).toBe('20261019003400')
  })
})

describe('el orden de las migraciones: el repo', () => {
  it('las migraciones que se agregaron respecto de HEAD van después de la última', () => {
    let enHead: string[]
    try {
      enHead = execFileSync('git', ['ls-tree', '--name-only', 'HEAD', 'supabase/migrations/'], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      })
        .split('\n')
        .filter(Boolean)
        .map((ruta) => ruta.replace('supabase/migrations/', ''))
    } catch {
      // Sin git o sin commits (un árbol exportado): no hay contra qué comparar.
      return
    }
    const enElArbol = readdirSync('supabase/migrations').filter((n) => n.endsWith('.sql'))
    const ultima = enHead.map(prefijoDe).sort().at(-1) ?? ''
    expect(
      fueraDeOrden(enHead, enElArbol),
      `Estas migraciones quedan antes de la última (${ultima}). Nómbralas con un prefijo mayor, por ejemplo ${siguiente(ultima)}_<nombre>.sql: \`supabase migration new\` usa la fecha de hoy y no sirve mientras los prefijos vayan por delante de ella.`,
    ).toEqual([])
  })
})
