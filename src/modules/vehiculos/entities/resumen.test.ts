import { describe, expect, it } from 'vitest'
import {
  MENSAJE_DE_VEHICULO_NO_DISPONIBLE,
  pestanaDelResumen,
  pestanasDelResumen,
  vistaDelResumen,
  type LecturaDelResumen,
} from './resumen'
import type { Vehiculo } from './vehiculo'

const ID = '11111111-1111-4111-8111-111111111111'
const ORIGEN = '22222222-2222-4222-8222-222222222222'

function vehiculo(cambios: Partial<Vehiculo> = {}): Vehiculo {
  return {
    id: ID,
    numero: 12,
    origenId: ORIGEN,
    titulo: 'Kia Morning',
    marca: null,
    modelo: null,
    anio: null,
    vin: null,
    lote: null,
    plataforma: null,
    urlOrigen: null,
    precio: null,
    precioNegociable: null,
    aceptaPermuta: null,
    placado: null,
    kilometraje: null,
    categoriaId: null,
    faseId: null,
    atributos: {},
    leadId: null,
    publicadoWeb: false,
    destacadoWeb: false,
    precioWeb: null,
    precioWebHasta: null,
    precioWebNota: null,
    limpiezaEl: null,
    portadaRuta: null,
    creadoPor: null,
    creadoEn: '2026-10-10T10:00:00.000000+00:00',
    actualizadoEn: '2026-10-10T10:00:00.000000+00:00',
    ...cambios,
  }
}

const entrada = (resto: Partial<Parameters<typeof vistaDelResumen>[0]> = {}) => ({
  id: ID,
  idValido: true,
  lectura: null,
  delListado: null,
  origenId: ORIGEN,
  ...resto,
})

describe('pestanasDelResumen y pestanaDelResumen', () => {
  it('«Interesados» sólo existe con `leads.ver`', () => {
    expect(pestanasDelResumen({ verInteresados: true }).map((p) => p.clave)).toEqual([
      'resumen',
      'fotos',
      'interesados',
    ])
    expect(pestanasDelResumen({ verInteresados: false }).map((p) => p.clave)).toEqual([
      'resumen',
      'fotos',
    ])
  })

  it('lo que no es una pestaña que existe, o que no se ve, abre «Resumen»', () => {
    const con = pestanasDelResumen({ verInteresados: true })
    const sin = pestanasDelResumen({ verInteresados: false })
    expect(pestanaDelResumen('fotos', con)).toBe('fotos')
    expect(pestanaDelResumen('interesados', con)).toBe('interesados')
    expect(pestanaDelResumen('interesados', sin)).toBe('resumen')
    expect(pestanaDelResumen('otra', con)).toBe('resumen')
    expect(pestanaDelResumen(null, con)).toBe('resumen')
  })
})

describe('vistaDelResumen', () => {
  it('sin vehículo en la URL no hay nada que mostrar', () => {
    expect(vistaDelResumen(entrada({ id: null }))).toEqual({ tipo: 'cargando' })
  })

  it('un id que no es un id, o un vehículo que la lectura no devolvió, es «no disponible»', () => {
    expect(vistaDelResumen(entrada({ idValido: false }))).toEqual({ tipo: 'no_disponible' })
    const lectura: LecturaDelResumen = { id: ID, estado: 'no_disponible' }
    expect(vistaDelResumen(entrada({ lectura, delListado: vehiculo() }))).toEqual({
      tipo: 'no_disponible',
    })
  })

  it('con la fila de la página se dibuja enseguida y se completa con la lectura', () => {
    const fila = vehiculo()
    expect(vistaDelResumen(entrada({ delListado: fila }))).toEqual({
      tipo: 'vehiculo',
      vehiculo: fila,
      completo: false,
      fallo: false,
    })
    const leido = vehiculo({ titulo: 'Kia Morning 2022' })
    expect(
      vistaDelResumen(
        entrada({ delListado: fila, lectura: { id: ID, estado: 'listo', vehiculo: leido } }),
      ),
    ).toEqual({ tipo: 'vehiculo', vehiculo: leido, completo: true, fallo: false })
  })

  it('sin la fila y sin lectura, cargando; si la lectura falló, error; con la fila, un fallo se dice pero se sigue mostrando', () => {
    expect(vistaDelResumen(entrada())).toEqual({ tipo: 'cargando' })
    const error: LecturaDelResumen = { id: ID, estado: 'error' }
    expect(vistaDelResumen(entrada({ lectura: error }))).toEqual({ tipo: 'error' })
    const fila = vehiculo()
    expect(vistaDelResumen(entrada({ lectura: error, delListado: fila }))).toEqual({
      tipo: 'vehiculo',
      vehiculo: fila,
      completo: false,
      fallo: true,
    })
  })

  it('entre la lectura y la fila manda la más nueva: tras editar, la página trae la versión nueva', () => {
    const vieja = vehiculo({ actualizadoEn: '2026-10-10T10:00:00.000000+00:00' })
    const nueva = vehiculo({ titulo: 'Editado', actualizadoEn: '2026-10-10T10:05:00.000000+00:00' })
    const lectura: LecturaDelResumen = { id: ID, estado: 'listo', vehiculo: vieja }
    expect(vistaDelResumen(entrada({ lectura, delListado: nueva }))).toMatchObject({
      vehiculo: nueva,
    })
    expect(
      vistaDelResumen(entrada({ lectura: { ...lectura, vehiculo: nueva }, delListado: vieja })),
    ).toMatchObject({
      vehiculo: nueva,
    })
  })

  it('un vehículo de otro origen no se dibuja con el layout de éste: «no disponible»', () => {
    const ajeno = vehiculo({ origenId: '33333333-3333-4333-8333-333333333333' })
    expect(
      vistaDelResumen(entrada({ lectura: { id: ID, estado: 'listo', vehiculo: ajeno } })),
    ).toEqual({ tipo: 'no_disponible' })
  })

  it('el texto es el de leads dicho para un vehículo', () => {
    expect(MENSAJE_DE_VEHICULO_NO_DISPONIBLE).toBe(
      'Este vehículo ya no está disponible: no existe o ya no tienes acceso.',
    )
  })
})
