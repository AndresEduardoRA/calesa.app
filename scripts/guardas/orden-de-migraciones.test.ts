import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Las migraciones (`.claude/rules/migraciones.md`):
// - La base (`…_base.sql`, el volcado de todas las anteriores al último aplastado) es la primera y **no se edita**: su sha256 está fijo
//   aquí, y sólo lo cambia `scripts/db/aplastar.sh` al volver a aplastar.
// - Toda migración nueva sale de `supabase migration new <nombre>`: su prefijo es la fecha y hora reales en UTC, no una del futuro.
// - Lo que se agrega va después de la última ya integrada (un reset aplica por el orden del nombre): contra HEAD en local y contra main
//   en el CI de un PR (`MIGRACIONES_BASE`). Si otro PR integró antes una posterior, la tuya se crea de nuevo con `supabase migration new`.
const BASE = '20261113065630_base.sql'
const SHA256_DE_LA_BASE = 'ca1d48f94531fbcad522dcf795f1d620245c2c27abb3d3f623ef64966dfcbc5f'
const NOMBRE = /^(\d{14})_[a-z0-9_]+\.sql$/
// Margen para el reloj de otra máquina: una migración «de dentro de una hora» todavía es de hoy.
const MARGEN_MS = 60 * 60 * 1000

const prefijoDe = (nombre: string) => NOMBRE.exec(nombre)?.[1] ?? ''

// La fecha UTC de un prefijo `AAAAMMDDhhmmss`, o null si no es una fecha que exista.
function fechaDelPrefijo(prefijo: string): Date | null {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(prefijo)
  if (!m) return null
  const [a, mes, d, h, min, s] = m.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ]
  const fecha = new Date(Date.UTC(a, mes - 1, d, h, min, s))
  const vuelve =
    fecha.getUTCFullYear() === a &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === d &&
    fecha.getUTCHours() === h &&
    fecha.getUTCMinutes() === min &&
    fecha.getUTCSeconds() === s
  return vuelve ? fecha : null
}

// Las migraciones cuyo nombre no es `<fecha y hora reales>_<nombre>.sql`.
function sinFechaReal(nombres: readonly string[], ahora: Date): string[] {
  return nombres.filter((n) => {
    const fecha = fechaDelPrefijo(prefijoDe(n))
    return fecha === null || fecha.getTime() > ahora.getTime() + MARGEN_MS
  })
}

// Las migraciones del árbol que HEAD no tiene y que no quedan después de la última que HEAD sí tiene.
function fueraDeOrden(enHead: readonly string[], enElArbol: readonly string[]): string[] {
  const conocidas = new Set(enHead)
  const ultima = enHead.map(prefijoDe).sort().at(-1) ?? ''
  return enElArbol.filter((nombre) => !conocidas.has(nombre) && prefijoDe(nombre) <= ultima)
}

describe('el orden de las migraciones: la regla', () => {
  const ahora = new Date('2026-10-29T12:00:00Z')

  it('una fecha y hora reales pasan; una que no existe, una del futuro o un nombre sin fecha no', () => {
    expect(
      sinFechaReal(
        [
          '20261028180656_base.sql',
          '20261029115900_algo.sql',
          '20261019009900_a_mano.sql',
          '20261032000000_dia_que_no_existe.sql',
          '20261031000000_del_futuro.sql',
          'mi_migracion.sql',
        ],
        ahora,
      ),
    ).toEqual([
      '20261019009900_a_mano.sql',
      '20261032000000_dia_que_no_existe.sql',
      '20261031000000_del_futuro.sql',
      'mi_migracion.sql',
    ])
  })

  it('una hora de margen para el reloj de otra máquina', () => {
    expect(sinFechaReal(['20261029125900_casi.sql', '20261029130100_pasado.sql'], ahora)).toEqual([
      '20261029130100_pasado.sql',
    ])
  })

  const head = ['20261028180656_base.sql', '20261028181638_vistas_de_la_app_solo_se_leen.sql']

  it('lo nuevo después de la última de HEAD pasa; antes o con el mismo prefijo, no', () => {
    expect(fueraDeOrden(head, [...head, '20261029100000_algo.sql'])).toEqual([])
    expect(fueraDeOrden(head, [...head, '20261028181000_antes.sql'])).toEqual([
      '20261028181000_antes.sql',
    ])
    expect(fueraDeOrden(head, [...head, '20261028181638_otra.sql'])).toEqual([
      '20261028181638_otra.sql',
    ])
  })

  it('lo que HEAD ya tiene no se juzga', () => {
    expect(fueraDeOrden(head, head)).toEqual([])
  })
})

describe('el orden de las migraciones: el repo', () => {
  const enElArbol = readdirSync('supabase/migrations').filter((n) => n.endsWith('.sql'))

  it('la base es la primera y no cambió', () => {
    expect([...enElArbol].sort()[0]).toBe(BASE)
    const sha = createHash('sha256')
      .update(readFileSync(`supabase/migrations/${BASE}`))
      .digest('hex')
    expect(
      sha,
      `${BASE} no se edita nunca: un cambio va en una migración nueva (\`supabase migration new <nombre>\`).`,
    ).toBe(SHA256_DE_LA_BASE)
  })

  it('cada migración lleva la fecha y hora reales en que se creó', () => {
    expect(
      sinFechaReal(enElArbol, new Date()),
      'Créala con `supabase migration new <nombre>`.',
    ).toEqual([])
  })

  it('las que se agregaron respecto de lo integrado van después de la última', () => {
    const base = process.env['MIGRACIONES_BASE'] ?? 'HEAD'
    let enHead: string[]
    try {
      enHead = execFileSync('git', ['ls-tree', '--name-only', base, 'supabase/migrations/'], {
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
    // Tras un aplastado lo integrado tiene las viejas, que ya no están: sólo se compara contra lo que sigue en el árbol.
    const vigentesEnHead = enHead.filter((n) => enElArbol.includes(n))
    expect(
      fueraDeOrden(vigentesEnHead, enElArbol),
      'Quedan antes de la última que ya está integrada: créalas de nuevo con `supabase migration new <nombre>` (fecha de ahora).',
    ).toEqual([])
  })
})
