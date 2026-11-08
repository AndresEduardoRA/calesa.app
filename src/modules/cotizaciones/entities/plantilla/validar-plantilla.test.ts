import { readFileSync } from 'node:fs'
import { describe, expect, expectTypeOf, it } from 'vitest'
import type { Definicion } from '../formula'
import type { Diseno } from '../diseno'
import {
  juegoDePlantilla,
  RUTA_DEL_JUEGO,
  type CasoDePlantilla,
} from './juego-de-plantilla.soporte'
import { REGLAS_DE_PLANTILLA, rechazoDePlantilla } from './motivos-de-plantilla'
import { tonosQueYaNoEstan } from './tonos-que-ya-no-estan'
import type { DefinicionParaPlantilla, DisenoParaPlantilla } from './nodos-de-plantilla'
import { validarPlantilla, type ContextoDePlantilla } from './validar-plantilla'

// El juego que corre también la base (`supabase/tests/plantilla-validar.sql` T1): el espejo da la misma regla, el mismo donde y el mismo mensaje.
const ruta = RUTA_DEL_JUEGO
const juego = juegoDePlantilla(readFileSync(new URL(ruta, import.meta.url), 'utf8'))

function contextoDe(c: CasoDePlantilla): ContextoDePlantilla {
  const fo = juego.formulas[c.formula]
  if (fo === undefined) throw new Error(`«${c.nombre}» nombra una fórmula que no está`)
  return {
    definicion: fo.definicion,
    diseno: fo.diseno,
    visibilidad: c.visibilidad ?? fo.visibilidad,
    tonos: juego.tonos,
  }
}

describe('casos-de-plantilla.json', () => {
  it.each(juego.casos)('$nombre', (c) => {
    const r = validarPlantilla(c.plantilla, contextoDe(c))
    const visto = r.ok ? 'válida' : r.error
    if ('valida' in c) expect(visto).toBe('válida')
    else expect(visto).toEqual(rechazoDePlantilla(c.motivo.regla, c.motivo.donde))
  })

  it('cubre las 9 reglas, sin nombres repetidos, y sólo un caso válido de mini empieza por «mínima» (las carreras lo eligen)', () => {
    const reglas = new Set(juego.casos.flatMap((c) => ('motivo' in c ? [c.motivo.regla] : [])))
    expect([...reglas].sort()).toEqual([...REGLAS_DE_PLANTILLA].sort())
    const nombres = juego.casos.map((c) => c.nombre)
    expect(new Set(nombres).size).toBe(nombres.length)
    const minimas = juego.casos.filter(
      (c) => c.formula === 'mini' && 'valida' in c && c.nombre.startsWith('mínima'),
    )
    expect(minimas).toHaveLength(1)
  })
})

// La T2 de la base en TS: 20 grupos de 14 miembros, 19 sueltos y el total (300 nodos).
function alTope() {
  const nodos = [
    ...Array.from({ length: 280 }, (_, i) => ({
      id: `n${i + 1}`,
      grupo: `g${1 + Math.floor(i / 14)}`,
    })),
    ...Array.from({ length: 19 }, (_, i) => ({ id: `s${i + 1}` })),
    { id: 'total', salida: 'total' },
  ]
  const definicion: DefinicionParaPlantilla = {
    nodos,
    buckets: { b: 's1' },
    grupos: Array.from({ length: 20 }, (_, i) => ({ id: `g${i + 1}`, bucket: 'b' })),
  }
  const contexto: ContextoDePlantilla = {
    definicion,
    diseno: { cabecera: { modos: [] }, tarjeta_total: { secundarios: [] } },
    visibilidad: Object.fromEntries(nodos.map((n) => [n.id, { ver: 'todos' }])),
    tonos: ['verde'],
  }
  const rango = (n: number, f: (i: number) => [string, string]) =>
    Object.fromEntries(Array.from({ length: n }, (_, i) => f(i + 1)))
  const plantilla = {
    grupos: Array.from({ length: 20 }, (_, i) => ({ grupo: `g${i + 1}`, tono: 'verde' })),
    etiquetas: rango(200, (i) => [`n${i}`, `Etiqueta ${i}`]),
    leyendas: rango(200, (i) => [`n${i + 80}`, `Leyenda ${i}`]),
    total: { etiqueta: 'Total' },
    logo: true,
    columnas: { leyenda: true, tipo_cambio: true, plazo: true },
  }
  return { contexto, plantilla, rango }
}

describe('validarPlantilla al tope (T2)', () => {
  const { contexto, plantilla, rango } = alTope()
  const donde = (p: unknown) => {
    const r = validarPlantilla(p, contexto)
    return r.ok ? 'válida' : `${r.error.regla}@${r.error.donde}`
  }

  it('20 grupos, 200 etiquetas y 200 leyendas sobre 300 nodos: válida', () => {
    expect(donde(plantilla)).toBe('válida')
  })

  it('una etiqueta, una leyenda o un grupo de más es `forma`', () => {
    expect(donde({ ...plantilla, etiquetas: { ...plantilla.etiquetas, n201: 'Una de más' } })).toBe(
      'forma@etiquetas',
    )
    expect(donde({ ...plantilla, leyendas: { ...plantilla.leyendas, n1: 'Una de más' } })).toBe(
      'forma@leyendas',
    )
    expect(donde({ ...plantilla, grupos: [...plantilla.grupos, { grupo: 'g21' }] })).toBe(
      'forma@grupos',
    )
  })

  it('más de 32 KB en bytes (200 leyendas de 160 «x») es `forma@definicion`', () => {
    expect(
      donde({ ...plantilla, leyendas: rango(200, (i) => [`n${i + 80}`, 'x'.repeat(160)]) }),
    ).toBe('forma@definicion')
  })
})

describe('validarPlantilla', () => {
  const [primero] = juego.casos
  if (primero === undefined) throw new Error('el juego no tiene casos')

  it('sin contexto valida sólo la forma: un grupo que no existe pasa (T1 de la base)', () => {
    const p = { ...(primero.plantilla as object), grupos: [{ grupo: 'no_existe' }] }
    expect(validarPlantilla(p, null).ok).toBe(true)
  })

  it('sin tonos (`null`) no mira el catálogo', () => {
    const c = juego.casos.find((x) => 'motivo' in x && x.motivo.regla === 'tono_inexistente')
    if (c === undefined) throw new Error('el juego no tiene tono_inexistente')
    expect(validarPlantilla(c.plantilla, { ...contextoDe(c), tonos: null }).ok).toBe(true)
  })

  it('`tono_inexistente` es el primero de tonosQueYaNoEstan()', () => {
    const p = primero.plantilla as { grupos: object[] }
    const grupos = [
      { grupo: 'compra', tono: 'gris' },
      { grupo: 'logistica', tono: 'rojo' },
      { grupo: 'aduana' },
    ]
    const r = validarPlantilla({ ...p, grupos }, contextoDe(primero))
    expect(r.ok ? null : r.error).toEqual(
      rechazoDePlantilla(
        'tono_inexistente',
        tonosQueYaNoEstan(grupos, juego.tonos)[0]?.grupo ?? '',
      ),
    )
    expect(r.ok ? null : r.error.donde).toBe('compra')
  })

  it('devuelve la plantilla tal como viaja', () => {
    const r = validarPlantilla(
      { ...(primero.plantilla as object), nota: undefined },
      contextoDe(primero),
    )
    expect(r.ok && Object.hasOwn(r.plantilla, 'nota')).toBe(false)
  })

  it('la fórmula y el diseño de verdad son contexto', () => {
    expectTypeOf<Definicion>().toExtend<DefinicionParaPlantilla>()
    expectTypeOf<Diseno>().toExtend<DisenoParaPlantilla>()
  })
})
