import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { alinearConLaFormula } from './borrador-de-la-plantilla'
import { contextoParaElNavegador } from './contexto-para-el-navegador'
import {
  juegoDePlantilla,
  RUTA_DEL_JUEGO,
  type CasoDePlantilla,
} from './juego-de-plantilla.soporte'
import { validarPlantilla, type ContextoDePlantilla } from './validar-plantilla'

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

const mini = (): ContextoDePlantilla =>
  contextoDe({ nombre: 'x', formula: 'mini', plantilla: {}, valida: true })

describe('contextoParaElNavegador', () => {
  it('no lleva el cuerpo de un nodo ni los nodos sin lugar', () => {
    const texto = JSON.stringify(contextoParaElNavegador(contextoDe(juego.casos[0]!)))
    for (const cuerpo of ['descripcion', '"op"', '"de"', 'Probabilidad de compra', '"tipo"']) {
      expect(texto).not.toContain(cuerpo)
    }
    const nodos = contextoParaElNavegador(mini()).definicion.nodos ?? []
    // `cif` es base imponible: ni miembro, ni total, ni de tipo de cambio.
    expect(nodos.map((n) => n.id)).not.toContain('cif')
    expect(nodos.map((n) => n.id)).toEqual(
      expect.arrayContaining(['remate', 'fees', 'total', 'tc_ext']),
    )
  })

  it('un id `__proto__` o `constructor` pasa como clave propia', () => {
    const contexto: ContextoDePlantilla = {
      definicion: {
        nodos: [
          { id: 'constructor', grupo: 'g', etiqueta: 'C' },
          { id: '__proto__', grupo: 'g', etiqueta: 'P' },
        ],
        grupos: [{ id: 'g', etiqueta: 'G', tono: 'verde', bucket: 'b' }],
        buckets: {},
      },
      diseno: null,
      visibilidad: JSON.parse('{"constructor":{"ver":"todos","x":1},"__proto__":{"ver":"todos"}}'),
      tonos: ['verde'],
    }
    const r = contextoParaElNavegador(contexto)
    expect(Object.hasOwn(r.visibilidad ?? {}, '__proto__')).toBe(true)
    expect(Object.hasOwn(r.visibilidad ?? {}, 'constructor')).toBe(true)
    expect((r.visibilidad as Record<string, unknown>)['constructor']).toEqual({ ver: 'todos' })
    const p = {
      grupos: [{ grupo: 'g' }],
      total: { etiqueta: 'T' },
      logo: true,
      columnas: { leyenda: false, plazo: false, tipo_cambio: false },
    }
    expect(validarPlantilla(p, r).ok).toBe(validarPlantilla(p, contexto).ok)
  })

  it.each(juego.casos)(
    'el juego, «$nombre»: mismo ok y mismo donde que con el contexto entero',
    (c) => {
      const entero = contextoDe(c)
      const a = validarPlantilla(c.plantilla, entero)
      const b = validarPlantilla(c.plantilla, contextoParaElNavegador(entero))
      expect(b.ok).toBe(a.ok)
      if (!a.ok && !b.ok) expect(b.error.donde).toBe(a.error.donde)
    },
  )

  it('no vale en general: {a sin lugar, z inexistente} difiere sin alinear y coincide al alinear', () => {
    const entero = mini()
    const reducido = contextoParaElNavegador(entero)
    const p = {
      grupos: [{ grupo: 'compra' }, { grupo: 'logistica' }, { grupo: 'aduana' }],
      etiquetas: { cif: 'A', zzz: 'Z' },
      total: { etiqueta: 'T' },
      logo: true,
      columnas: { leyenda: false, plazo: false, tipo_cambio: false },
    }
    const sinAlinar = [validarPlantilla(p, entero), validarPlantilla(p, reducido)]
    const donde = (r: (typeof sinAlinar)[number]) => (r.ok ? null : r.error.donde)
    expect(donde(sinAlinar[0]!)).toBe('zzz')
    expect(donde(sinAlinar[1]!)).toBe('cif')
    const a = alinearConLaFormula(p, entero).plantilla
    expect(validarPlantilla(a, entero).ok).toBe(true)
    expect(validarPlantilla(a, reducido).ok).toBe(true)
  })
})

describe('contextoParaElNavegador: el plazo', () => {
  it('el plazo del grupo pasa sólo si es un texto', () => {
    const contexto = {
      definicion: {
        nodos: [],
        grupos: [{ id: 'a', plazo: '2 días' }, { id: 'b', plazo: 5 }, { id: 'c' }],
        buckets: {},
      },
      diseno: null,
      visibilidad: null,
      tonos: [],
    } as unknown as ContextoDePlantilla
    const grupos = contextoParaElNavegador(contexto).definicion.grupos ?? []
    expect(grupos.map((g) => g.plazo)).toEqual(['2 días', null, null])
  })
})
