import { describe, expect, it } from 'vitest'
import type { Documento } from './documento'
import { primerSeguimiento } from './primer-seguimiento'
import { hayAlgoEscrito, valoresDeSeguimientoNuevo } from './seguimiento-nuevo'

const TIPO = '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f'
const CONTEXTO = { ahora: '2026-10-14T19:30:00.000Z', zona: 'America/La_Paz', tiposActivos: [TIPO] }
const nuevo = () => valoresDeSeguimientoNuevo([{ id: TIPO }])
const DOC: Documento = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Lo vio en Facebook' }] }],
}

describe('hayAlgoEscrito', () => {
  it('un seguimiento recién abierto no tiene nada escrito', () => {
    expect(hayAlgoEscrito(nuevo())).toBe(false)
  })

  it('cambiar sólo el tipo, o los espacios del resumen, no cuenta', () => {
    expect(hayAlgoEscrito({ ...nuevo(), tipoId: 'otro', titulo: '   ' })).toBe(false)
  })

  it('el resumen, un detalle, una fecha o un próximo contacto sí', () => {
    expect(hayAlgoEscrito({ ...nuevo(), titulo: 'Llamó' })).toBe(true)
    expect(hayAlgoEscrito({ ...nuevo(), detalle: DOC })).toBe(true)
    expect(hayAlgoEscrito({ ...nuevo(), ocurridoEn: '2026-10-13T10:00' })).toBe(true)
    expect(hayAlgoEscrito({ ...nuevo(), recordatorio: '2026-10-15T09:00' })).toBe(true)
  })
})

describe('primerSeguimiento', () => {
  it('sin nada escrito, el lead se crea sin seguimiento', () => {
    expect(primerSeguimiento(nuevo(), CONTEXTO)).toEqual({ tipo: 'sin' })
  })

  it('con resumen, detalle, fecha pasada y próximo contacto', () => {
    const r = primerSeguimiento(
      {
        ...nuevo(),
        titulo: ' Pidió precio ',
        detalle: DOC,
        ocurridoEn: '2026-10-13T10:00',
        recordatorio: '2026-10-15T09:00',
      },
      CONTEXTO,
    )
    expect(r).toEqual({
      tipo: 'con',
      seguimiento: {
        tipoId: TIPO,
        titulo: 'Pidió precio',
        detalle: DOC,
        ocurridoEn: '2026-10-13T14:00:00.000Z',
      },
      recordatorio: { recordarEn: '2026-10-15T13:00:00.000Z' },
    })
  })

  it('sin fecha elegida es «ahora» (nulo) y sin próximo contacto no hay recordatorio', () => {
    const r = primerSeguimiento({ ...nuevo(), titulo: 'Llamó' }, CONTEXTO)
    expect(r).toMatchObject({ tipo: 'con', seguimiento: { ocurridoEn: null }, recordatorio: null })
  })

  it('un detalle o un próximo contacto sin resumen piden el resumen, no lo derivan', () => {
    for (const parcial of [{ detalle: DOC }, { recordatorio: '2026-10-15T09:00' }]) {
      const r = primerSeguimiento({ ...nuevo(), ...parcial }, CONTEXTO)
      expect(r).toEqual({
        tipo: 'invalido',
        errores: { titulo: 'Escribe un resumen del seguimiento.' },
      })
    }
  })

  it('una fecha futura y un próximo contacto pasado se dicen junto a su campo', () => {
    const r = primerSeguimiento(
      {
        ...nuevo(),
        titulo: 'Llamó',
        ocurridoEn: '2026-10-20T10:00',
        recordatorio: '2026-10-14T08:00',
      },
      CONTEXTO,
    )
    expect(r.tipo).toBe('invalido')
    if (r.tipo === 'invalido') {
      expect(r.errores.ocurridoEn).toBe(
        'Un seguimiento no puede ser en el futuro: para eso, agenda un recordatorio.',
      )
      expect(r.errores.recordatorio).toBe('El recordatorio tiene que ser en el futuro.')
    }
  })

  it('un tipo que no está activo no se acepta', () => {
    const r = primerSeguimiento({ ...nuevo(), titulo: 'Llamó' }, { ...CONTEXTO, tiposActivos: [] })
    expect(r).toEqual({
      tipo: 'invalido',
      errores: { tipoId: 'Elige un tipo de seguimiento que esté activo.' },
    })
  })

  it('un documento que no es de la lista blanca se rechaza', () => {
    const r = primerSeguimiento(
      {
        ...nuevo(),
        titulo: 'Llamó',
        detalle: { type: 'doc', content: [{ type: 'heading' }] } as never,
      },
      CONTEXTO,
    )
    expect(r.tipo).toBe('invalido')
  })
})
