import { describe, expect, it } from 'vitest'
import {
  descripcionDePublicar,
  motivoParaNoAbrirPublicar,
  motivoParaNoPublicar,
  noDisponibleAlPublicar,
  PANEL_PUBLICAR_TARJETA,
  tituloDePublicar,
} from './publicar-la-plantilla'

const BORRADOR = '2026-11-07T10:00:00.123456+00:00'

describe('motivoParaNoPublicar', () => {
  it('sin borrador dice que hay que guardar uno, aunque también haya cambios', () => {
    expect(motivoParaNoPublicar({ esperada: null, hayCambios: true })).toBe(
      'Guarda un borrador para poder publicarlo.',
    )
    expect(motivoParaNoPublicar({ esperada: null, hayCambios: false })).toBe(
      'Guarda un borrador para poder publicarlo.',
    )
  })

  it('con borrador y cambios sin guardar pide guardarlos', () => {
    expect(motivoParaNoPublicar({ esperada: BORRADOR, hayCambios: true })).toBe(
      'Guarda los cambios para poder publicarlos.',
    )
  })

  it('con borrador y sin cambios se puede publicar', () => {
    expect(motivoParaNoPublicar({ esperada: BORRADOR, hayCambios: false })).toBeNull()
  })
})

describe('motivoParaNoAbrirPublicar y noDisponibleAlPublicar', () => {
  it('sin borrador no abre y avisa', () => {
    expect(motivoParaNoAbrirPublicar(null)).toBe('No hay borrador para publicar.')
    expect(motivoParaNoAbrirPublicar(BORRADOR)).toBeNull()
  })

  it('con el modal abierto, sin borrador dice que ya no está', () => {
    expect(noDisponibleAlPublicar(null)).toBe(
      'El borrador ya no está: otra persona lo publicó o lo descartó.',
    )
    expect(noDisponibleAlPublicar(BORRADOR)).toBeNull()
  })
})

describe('textos del modal', () => {
  it('el panel y el título nombran la tarjeta y el origen', () => {
    expect(PANEL_PUBLICAR_TARJETA).toBe('publicar-tarjeta')
    expect(tituloDePublicar('Mini')).toBe('Publicar la tarjeta de Mini')
  })

  it('la descripción dice la fecha, el efecto y que lo sin guardar no entra', () => {
    const texto = descripcionDePublicar('Mini', '7 nov 2026, 06:00')
    expect(texto).toContain('guardado el 7 nov 2026, 06:00')
    expect(texto).toContain('cotizaciones de Mini')
    expect(texto).toContain('sin guardar en el editor no se publica')
  })
})
