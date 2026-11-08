import { describe, expect, it } from 'vitest'
import {
  descripcionDelDescarte,
  MENSAJE_SIN_RED_AL_DESCARTAR_LA_PLANTILLA,
  motivoParaNoAbrirDescartar,
  noDisponibleAlDescartar,
  PANEL_DESCARTAR_PLANTILLA,
  tituloDelDescarte,
} from './descartar-la-plantilla'

const BORRADOR = '2026-11-07T10:00:00.123456+00:00'

describe('descartar la plantilla: textos y motivos', () => {
  it('el panel y el título nombran el origen y no a una persona', () => {
    expect(PANEL_DESCARTAR_PLANTILLA).toBe('descartar-plantilla')
    expect(tituloDelDescarte('Mini')).toBe('Descartar el borrador de la tarjeta de Mini')
  })

  it('la descripción dice la fecha, que no se deshace y que la publicada no cambia', () => {
    expect(descripcionDelDescarte('7 nov 2026, 06:00')).toBe(
      'Guardado el 7 nov 2026, 06:00. Se borra y no se puede deshacer; la tarjeta publicada no cambia.',
    )
  })

  it('sin borrador no abre', () => {
    expect(motivoParaNoAbrirDescartar(null)).toBe('No hay borrador para descartar.')
    expect(motivoParaNoAbrirDescartar(BORRADOR)).toBeNull()
  })

  it('con el diálogo abierto, sin borrador dice que ya no está', () => {
    expect(noDisponibleAlDescartar(null)).toBe(
      'El borrador ya no está: otra persona lo publicó o lo descartó.',
    )
    expect(noDisponibleAlDescartar(BORRADOR)).toBeNull()
  })

  it('sin respuesta no se dice que el borrador sigue', () => {
    expect(MENSAJE_SIN_RED_AL_DESCARTAR_LA_PLANTILLA).toBe(
      'No sabemos si se descartó: recarga para verlo.',
    )
  })
})
