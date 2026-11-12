import { describe, expect, it } from 'vitest'
import { MENSAJE_INESPERADO } from '@/shared/lib/errores'
import { motivoLegible, textoDeLoQueFalta } from './motivos'
import type { RequisitoVista } from './vista-previa'

const bl: RequisitoVista = {
  requisitoId: '33333333-3333-4333-8333-333333333333',
  tipo: 'documento',
  bloqueante: true,
  descripcion: 'Documento: BL',
  cumplido: false,
  detalle: {},
}
const contenedor: RequisitoVista = {
  ...bl,
  tipo: 'dato',
  descripcion: 'Dato: transporte.contenedor',
  detalle: { clave_dato: 'transporte.contenedor' },
}

describe('motivos legibles de mover', () => {
  it('requisitos nombra lo que falta, y sin vista usa el texto de la base', () => {
    expect(motivoLegible({ codigo: 'requisitos', motivo: 'x' }, { faltan: [bl, contenedor] })).toBe(
      'Falta: BL aprobado, Contenedor.',
    )
    expect(textoDeLoQueFalta([bl])).toBe('Falta: BL aprobado.')
    expect(motivoLegible({ codigo: 'requisitos', motivo: 'Faltan 2 requisitos.' })).toBe(
      'Faltan 2 requisitos.',
    )
  })

  it('cada código de la base tiene su frase', () => {
    expect(motivoLegible({ codigo: 'rol', motivo: null })).toBe(
      'Tu rol no puede mover a esta fase.',
    )
    expect(motivoLegible({ codigo: 'transicion', motivo: null })).toBe(
      'Esta fase ya no es un destino posible. Recarga.',
    )
    expect(motivoLegible({ codigo: 'nota', motivo: null })).toBe('Esta fase pide una nota interna.')
    expect(motivoLegible({ codigo: 'acceso', motivo: 'texto' })).toBe(
      'Ya no tienes acceso a esta unidad.',
    )
    expect(motivoLegible({ codigo: 'unidad', motivo: null })).toBe('Elige una unidad.')
  })

  it('el conflicto conserva el nombre que trae la base', () => {
    expect(
      motivoLegible({
        codigo: 'conflicto',
        motivo: 'Rosa Mamani la movió a «Embarcado» hace 1 min.',
      }),
    ).toBe('Rosa Mamani la movió a «Embarcado» hace 1 min.')
  })

  it('lo desconocido: el texto de la base o el genérico', () => {
    expect(motivoLegible({ codigo: null, motivo: 'Algo dijo la base.' })).toBe('Algo dijo la base.')
    expect(motivoLegible({ codigo: 'otro', motivo: null })).toBe(MENSAJE_INESPERADO)
  })
})
