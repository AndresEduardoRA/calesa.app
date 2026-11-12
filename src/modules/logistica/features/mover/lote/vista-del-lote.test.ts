import { describe, expect, it, vi } from 'vitest'
import { TOPE_DEL_LOTE, type VistaPreviaDeUnaUnidad } from '@/modules/flujos/client'
import { TOPE_DE_LA_SELECCION } from '../../../entities/nucleo/seleccion'
import {
  lineaDeLaVista,
  notaObligatoriaDelLote,
  puedenDelLote,
  resumenDeLaVista,
  textoDelBotonDelLote,
  textoDelReintento,
} from './vista-del-lote'

function vista(parcial: Partial<VistaPreviaDeUnaUnidad>): VistaPreviaDeUnaUnidad {
  return {
    vehiculoId: 'v',
    ok: true,
    motivos: [],
    codigos: [],
    faseActual: 'b',
    requisitos: [],
    faltan: [],
    notaObligatoria: false,
    ...parcial,
  }
}

// `flujos/client` trae las Server Actions y su `server-only`: aquí sólo se usan sus reglas puras.
vi.mock('server-only', () => ({}))

const falta = {
  requisitoId: 'r',
  tipo: 'documento' as const,
  bloqueante: true,
  descripcion: 'Documento: BL',
  cumplido: false,
  detalle: {},
}

describe('la vista previa del lote', () => {
  it('el tope de la selección es el del lote', () => {
    expect(TOPE_DE_LA_SELECCION).toBe(TOPE_DEL_LOTE)
  })

  it('«Lista», «Falta: BL aprobado.» y «Ya no está en «F»»', () => {
    // La fase del lote es la de origen: la que la unidad debe seguir ocupando.
    expect(lineaDeLaVista(vista({ faseActual: 'b' }), { id: 'b', nombre: 'En puerto' })).toBe(
      'Lista',
    )
    expect(
      lineaDeLaVista(vista({ ok: false, faltan: [falta], codigos: ['requisitos'] }), {
        id: 'b',
        nombre: 'En puerto',
      }),
    ).toBe('Falta: BL aprobado.')
    expect(lineaDeLaVista(vista({ faseActual: 'x' }), { id: 'b', nombre: 'En puerto' })).toBe(
      'Ya no está en «En puerto»',
    )
  })

  it('puedenDelLote descarta las que cambiaron de fase o no pasan', () => {
    const vistas = [
      vista({ vehiculoId: '1' }),
      vista({ vehiculoId: '2', ok: false }),
      vista({ vehiculoId: '3', faseActual: 'otra' }),
    ]
    expect(puedenDelLote(vistas, 'b')).toEqual(['1'])
    expect(resumenDeLaVista(vistas, 'b')).toBe('1 lista, 2 no pueden entrar')
  })

  it('la nota es obligatoria si cualquiera la pide', () => {
    expect(notaObligatoriaDelLote([vista({}), vista({ notaObligatoria: true })])).toBe(true)
    expect(notaObligatoriaDelLote([vista({})])).toBe(false)
  })

  it('los textos de plural, para 1 y para N', () => {
    expect(textoDelBotonDelLote(7)).toBe('Mover los 7 que pueden')
    expect(textoDelBotonDelLote(1)).toBe('Mover el 1 que puede')
    expect(textoDelReintento(1)).toBe('Reintentar el 1')
    expect(textoDelReintento(2)).toBe('Reintentar los 2')
  })
})
