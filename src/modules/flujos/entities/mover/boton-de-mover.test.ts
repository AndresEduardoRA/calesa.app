import { describe, expect, it } from 'vitest'
import {
  MOTIVO_DE_NOTA_LARGA,
  MOTIVO_DE_NOTA_OBLIGATORIA,
  MOTIVO_SIN_VISTA,
  estadoDelBoton,
  textoDelBoton,
} from './boton-de-mover'
import { MOTIVO_SIN_PERMISO_DE_MOVER } from './para-mover'
import type { RequisitoVista, VistaPrevia } from './vista-previa'

const bl: RequisitoVista = {
  requisitoId: '33333333-3333-4333-8333-333333333333',
  tipo: 'documento',
  bloqueante: true,
  descripcion: 'Documento: E2E BL',
  cumplido: false,
  detalle: {},
}
const libre: VistaPrevia = {
  ok: true,
  motivos: [],
  codigos: [],
  faseActual: null,
  requisitos: [],
  faltan: [],
  notaObligatoria: false,
}

describe('el botón de mover', () => {
  it('dice la acción de la transición o «Mover a …», y con la fase inicial si no tenía fase', () => {
    expect(textoDelBoton({ nombre: 'Embarcado', accion: 'Embarcar' }, false)).toBe('Embarcar')
    expect(textoDelBoton({ nombre: 'Embarcado', accion: null }, false)).toBe('Mover a «Embarcado»')
    expect(textoDelBoton({ nombre: 'Embarcado', accion: '  ' }, false)).toBe('Mover a «Embarcado»')
    expect(textoDelBoton({ nombre: 'Compra', accion: null }, true)).toBe(
      'Mover a la fase inicial «Compra»',
    )
  })

  it('se habilita sin nada que lo impida', () => {
    expect(estadoDelBoton({ puedeMover: true, vista: libre, nota: '' })).toEqual({
      habilitado: true,
      motivo: null,
    })
  })

  it('se apaga sin permiso, cada vez con su motivo escrito', () => {
    expect(estadoDelBoton({ puedeMover: false, vista: libre, nota: '' })).toEqual({
      habilitado: false,
      motivo: MOTIVO_SIN_PERMISO_DE_MOVER,
    })
    expect(estadoDelBoton({ puedeMover: true, vista: null, nota: '' }).motivo).toBe(
      MOTIVO_SIN_VISTA,
    )
  })

  it('se apaga por un bloqueante sin cumplir y dice cuál falta', () => {
    const vista: VistaPrevia = {
      ...libre,
      ok: false,
      motivos: ['Faltan 1'],
      codigos: ['requisitos'],
      faltan: [bl],
      requisitos: [bl],
    }
    expect(estadoDelBoton({ puedeMover: true, vista, nota: 'x' })).toEqual({
      habilitado: false,
      motivo: 'Falta: E2E BL aprobado.',
    })
  })

  it('se apaga por el rol y por una salida que no existe, y manda sobre los requisitos', () => {
    const rol: VistaPrevia = {
      ...libre,
      ok: false,
      motivos: ['x', 'y'],
      codigos: ['requisitos', 'rol'],
      faltan: [bl],
    }
    expect(estadoDelBoton({ puedeMover: true, vista: rol, nota: '' }).motivo).toBe(
      'Tu rol no puede mover a esta fase.',
    )
    const sinSalida: VistaPrevia = { ...libre, ok: false, motivos: ['x'], codigos: ['transicion'] }
    expect(estadoDelBoton({ puedeMover: true, vista: sinSalida, nota: '' }).motivo).toBe(
      'Esta fase ya no es un destino posible. Recarga.',
    )
  })

  it('pide la nota si la fase la exige y no admite una de más de 2000 caracteres', () => {
    const pide: VistaPrevia = { ...libre, notaObligatoria: true }
    expect(estadoDelBoton({ puedeMover: true, vista: pide, nota: '   ' }).motivo).toBe(
      MOTIVO_DE_NOTA_OBLIGATORIA,
    )
    expect(estadoDelBoton({ puedeMover: true, vista: pide, nota: 'Listo' }).habilitado).toBe(true)
    expect(estadoDelBoton({ puedeMover: true, vista: libre, nota: 'a'.repeat(2001) }).motivo).toBe(
      MOTIVO_DE_NOTA_LARGA,
    )
    expect(
      estadoDelBoton({ puedeMover: true, vista: libre, nota: 'a'.repeat(2000) }).habilitado,
    ).toBe(true)
  })
})
