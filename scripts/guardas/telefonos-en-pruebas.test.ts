import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Ninguna prueba de la base arma un dato con `random()` (`docs/PLAN.md`, 4-22). Un teléfono al azar chocaba con un lead vivo que otra
// prueba dejó con el mismo prefijo (`leads_telefono_unico`): 1 de cada 8.400 corridas daba un 23505 que no era de la prueba. Un número
// fijo choca siempre o nunca; una secuencia sirve cuando la misma llamada se repite en una transacción (`medir-escala.sql`), y una base
// que corre con lo que dejó la corrida anterior, cuando se confirma de verdad (un diagnóstico de la importación, ya retirado). `gen_random_uuid()` sí:
// un uuid no choca. Lo que usa `random()` para otra cosa que un dato que tiene que ser único figura aquí con su motivo y cuántas veces.
const CON_MOTIVO: Record<string, { veces: number; motivo: string }> = {
  'supabase/tests/derivados-leads.sql': {
    veces: 3,
    motivo:
      'elige al azar un lead, una persona y una operación de una lista fija (una prueba de propiedades): no inserta nada único',
  },
  'supabase/tests/medir-cotizacion-guardar.sql': {
    veces: 1,
    motivo: 'el input que cambia en cada guardado medido, para que cada corrida escriba de verdad',
  },
}

const RAIZ = process.cwd()

// El SQL sin los comentarios de línea (los de las pruebas citan la regla).
const sinComentarios = (texto: string) => texto.replace(/--[^\n]*/g, '')

// `random(` suelto: no el final de `gen_random_uuid(` ni otro nombre que termine en «random».
const vecesQueUsaRandom = (texto: string) =>
  (sinComentarios(texto).match(/(?<![\w])random\s*\(/gi) ?? []).length

function* archivos(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, e.name)
    if (e.isDirectory()) {
      yield* archivos(ruta)
    } else if (e.name.endsWith('.sql')) {
      yield ruta
    }
  }
}

describe('los datos de las pruebas de la base', () => {
  const sql = [...archivos(join(RAIZ, 'supabase/tests'))].map((ruta) =>
    relative(RAIZ, ruta).replaceAll('\\', '/'),
  )

  it('ninguna prueba arma un dato con random(), salvo las que figuran con su motivo', () => {
    const conRandom = sql
      .map((archivo) => ({
        archivo,
        veces: vecesQueUsaRandom(readFileSync(join(RAIZ, archivo), 'utf8')),
      }))
      .filter(({ archivo, veces }) => veces > (CON_MOTIVO[archivo]?.veces ?? 0))
    expect(conRandom).toEqual([])
  })

  it('un archivo con motivo todavía lo necesita', () => {
    for (const [archivo, { veces }] of Object.entries(CON_MOTIVO)) {
      expect(vecesQueUsaRandom(readFileSync(join(RAIZ, archivo), 'utf8')), archivo).toBe(veces)
    }
  })

  it('la regla ve un teléfono al azar y no confunde gen_random_uuid()', () => {
    expect(
      vecesQueUsaRandom("values ('x', '78' || lpad((floor(random() * 1000000))::text, 6, '0'))"),
    ).toBe(1)
    expect(vecesQueUsaRandom('select gen_random_uuid(), random ( )')).toBe(1)
    expect(vecesQueUsaRandom('select gen_random_uuid() -- nunca random()')).toBe(0)
  })
})
