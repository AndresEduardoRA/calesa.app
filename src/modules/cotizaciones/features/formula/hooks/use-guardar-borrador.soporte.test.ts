import { describe, expect, it } from 'vitest'
import { disenoSintetico } from '../../../entities/diseno-sintetico'
import type { Diseno } from '../../../entities/diseno'
import type { Formula } from '../../../entities/formula'
import type { BaseDelEditor } from '../../../entities/formula/edicion'
import { conElAjuste, formulaDePrueba } from '../../../entities/formula/fila-de-prueba.soporte'
import { formulaSintetica } from '../../../entities/formula-sintetica'
import { esquemaFormula } from '../../../entities/formula'
import {
  formulaParaGuardar,
  hayCambiosPorGuardar,
  pedidoDeGuardar,
} from './use-guardar-borrador.soporte'
import { filasParaDibujar } from './use-editor-de-la-formula.soporte'

const ORIGEN = '11111111-1111-4111-8111-111111111111'
const PUBLICADA = '22222222-2222-4222-8222-222222222222'
const BORRADOR = '33333333-3333-4333-8333-333333333333'
const HORA = '2026-11-07T15:00:00.123456+00:00'

const f = () =>
  formulaDePrueba([
    { id: 'base', texto: '=remate+fees', etiqueta: 'Base' },
    { id: 'total', texto: '=(remate+fees)*4%', etiqueta: 'Total' },
  ])

const DISENO = { cabecera: {}, secciones: [] } as unknown as Diseno

const publicada: BaseDelEditor = {
  id: PUBLICADA,
  actualizadoEn: HORA,
  estado: 'publicada',
  diseno: DISENO,
  nota: 'Sube el flete',
}
const borrador: BaseDelEditor = {
  id: BORRADOR,
  actualizadoEn: HORA,
  estado: 'borrador',
  diseno: DISENO,
  nota: 'A medias',
}

const textoDe = (formula: Formula, id: string) => {
  const nodo = formula.definicion.nodos.find((n) => n.id === id)
  return nodo && 'texto' in nodo ? nodo.texto : undefined
}

describe('formulaParaGuardar: el texto que reescribió el ⚙ se guarda (C2)', () => {
  it('una fila reescrita guarda el texto que ya dice el valor del ⚙', () => {
    const trabajo = conElAjuste(f(), 'total__2', 0.05)
    const guardable = formulaParaGuardar(trabajo, filasParaDibujar(trabajo))
    expect(textoDe(guardable, 'total')).toBe('=(remate+fees)*5%')
    expect(textoDe(guardable, 'base')).toBe('=remate+fees')
    expect(guardable.params).toBe(trabajo.params)
  })

  it('sin reescritas devuelve la misma fórmula', () => {
    const trabajo = f()
    expect(formulaParaGuardar(trabajo, filasParaDibujar(trabajo))).toBe(trabajo)
  })

  it('una que no manda (un negativo) conserva su texto: el ⚙ queda en params', () => {
    const trabajo = conElAjuste(f(), 'total__2', -0.03)
    const guardable = formulaParaGuardar(trabajo, filasParaDibujar(trabajo))
    expect(textoDe(guardable, 'total')).toBe('=(remate+fees)*4%')
    expect(guardable.params.constantes['total__2']).toBe(-0.03)
  })

  it('una fila sin texto no gana uno', () => {
    const trabajo = f()
    const sinTexto: Formula = {
      ...trabajo,
      definicion: {
        ...trabajo.definicion,
        nodos: trabajo.definicion.nodos.map((n) =>
          n.id === 'base' && 'texto' in n ? { ...n, texto: undefined } : n,
        ),
      },
    }
    const ajustada = conElAjuste(sinTexto, 'total__2', 0.05)
    const guardable = formulaParaGuardar(ajustada, filasParaDibujar(ajustada))
    expect(textoDe(guardable, 'base')).toBeUndefined()
  })

  it('no toca lo que recibe', () => {
    const trabajo = conElAjuste(f(), 'total__2', 0.05)
    const antes = JSON.stringify(trabajo)
    formulaParaGuardar(trabajo, filasParaDibujar(trabajo))
    expect(JSON.stringify(trabajo)).toBe(antes)
  })
})

describe('pedidoDeGuardar: crear sobre la publicada o pisar el borrador (C1)', () => {
  it('sobre la publicada crea: su id como esperada, sin hora, su diseño y la nota nula', () => {
    const p = pedidoDeGuardar(publicada, f(), ORIGEN)
    expect(p.esperada).toEqual({ sobre: 'publicada', publicadaId: PUBLICADA })
    expect(p.diseno).toBe(DISENO)
    expect(p.nota).toBeNull()
    expect(p.origenId).toBe(ORIGEN)
  })

  it('sobre el borrador pisa: la hora leída, su diseño y su nota', () => {
    const p = pedidoDeGuardar(borrador, f(), ORIGEN)
    expect(p.esperada).toEqual({ sobre: 'borrador', actualizadoEn: HORA })
    expect(p.diseno).toBe(DISENO)
    expect(p.nota).toBe('A medias')
  })

  it('nunca las dos esperadas', () => {
    for (const base of [publicada, borrador]) {
      const esperada = pedidoDeGuardar(base, f(), ORIGEN).esperada
      expect(Object.keys(esperada).sort()).toHaveLength(2)
    }
  })

  it('la definición y los params planos, como los recibe la base', () => {
    const formula = f()
    const p = pedidoDeGuardar(borrador, formula, ORIGEN)
    expect(p.definicion).toBe(formula.definicion)
    expect(p.params).toEqual({ ...formula.params.constantes, tablas: {} })
    expect(esquemaFormula.safeParse({ definicion: p.definicion, params: p.params }).success).toBe(
      true,
    )
  })
})

describe('hayCambiosPorGuardar (C5)', () => {
  it('lo mismo que lo guardado: sin cambios', () => {
    const guardada = f()
    expect(hayCambiosPorGuardar(guardada, guardada)).toBe(false)
    expect(hayCambiosPorGuardar(guardada, f())).toBe(false)
  })

  it('una reescrita sola es un cambio: guardarla es lo que la arregla', () => {
    const guardada = conElAjuste(f(), 'total__2', 0.05)
    const guardable = formulaParaGuardar(guardada, filasParaDibujar(guardada))
    expect(hayCambiosPorGuardar(guardada, guardable)).toBe(true)
  })

  it('un aplicar que cambia un valor o un texto es un cambio', () => {
    const guardada = f()
    expect(hayCambiosPorGuardar(guardada, conElAjuste(guardada, 'total__2', 0.06))).toBe(true)
    const otroTexto = formulaDePrueba([
      { id: 'base', texto: '=remate+flete', etiqueta: 'Base' },
      { id: 'total', texto: '=(remate+fees)*4%', etiqueta: 'Total' },
    ])
    expect(hayCambiosPorGuardar(guardada, otroTexto)).toBe(true)
  })
})

describe('el tamaño de lo que se manda (V15: el tope de 1 MB de una Server Action)', () => {
  // El valor medido va en `docs/pasos/4.21-3b-1/decisiones.md`; si un día pasa de 1 MB, es un hallazgo que decide la persona (no se sube `bodySizeLimit` aquí).
  it('una fórmula de unos 2.000 nodos con un diseño de unos 2.000 ítems cabe en 1 MB', () => {
    const sintetica = formulaSintetica(2000)
    const { diseno } = disenoSintetico(400)
    const bytes = new TextEncoder().encode(
      JSON.stringify({ origenId: ORIGEN, ...sintetica, diseno, nota: null }),
    ).length
    expect(bytes).toBeLessThan(1024 * 1024)
  })
})
