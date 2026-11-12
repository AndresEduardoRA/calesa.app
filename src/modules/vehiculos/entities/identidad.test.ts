import { describe, expect, it } from 'vitest'
import type { CampoDeVehiculo } from './campo'
import {
  campoPrincipalDe,
  identidadDeVehiculo,
  identidadEnUnaLinea,
  type CampoQueIdentifica,
} from './identidad'

const TITULO = 'Toyota Hilux 2019'

const campo = (parcial: Partial<CampoDeVehiculo> & { clave: string }): CampoDeVehiculo => ({
  etiqueta: parcial.clave,
  tipo: 'texto',
  opciones: [],
  requerido: false,
  grupo: null,
  enTarjeta: false,
  filtrable: false,
  activo: true,
  valorDefecto: null,
  ...parcial,
})

const LOTE: CampoQueIdentifica = { clave: 'lote_interno', tipo: 'texto', opciones: [] }

const vehiculo = (atributos: Record<string, unknown>) => ({ titulo: TITULO, atributos })

describe('identidadDeVehiculo', () => {
  it('con principal de texto, el valor nombra y el título acompaña', () => {
    expect(identidadDeVehiculo(vehiculo({ lote_interno: 'L-4471' }), LOTE)).toEqual({
      nombre: 'L-4471',
      titulo: TITULO,
    })
  })

  it('recorta los espacios del valor', () => {
    expect(identidadDeVehiculo(vehiculo({ lote_interno: '  L-4471 ' }), LOTE).nombre).toBe('L-4471')
  })

  it('de opción, nombra la etiqueta de la opción', () => {
    const color: CampoQueIdentifica = {
      clave: 'color',
      tipo: 'opcion',
      opciones: [{ clave: 'rojo', etiqueta: 'Rojo' }],
    }
    expect(identidadDeVehiculo(vehiculo({ color: 'rojo' }), color)).toEqual({
      nombre: 'Rojo',
      titulo: TITULO,
    })
  })

  it('sin principal, el título solo', () => {
    expect(identidadDeVehiculo(vehiculo({ lote_interno: 'L-4471' }), null)).toEqual({
      nombre: TITULO,
      titulo: null,
    })
  })

  it.each([
    ['ausente', {}],
    ['nulo', { lote_interno: null }],
    ['vacío', { lote_interno: '' }],
    ['sólo espacios', { lote_interno: '   ' }],
  ])('con el valor %s, el título solo', (_, atributos) => {
    expect(identidadDeVehiculo(vehiculo(atributos), LOTE)).toEqual({ nombre: TITULO, titulo: null })
  })

  it('una multi-opción sin opciones elegidas no nombra', () => {
    const extras: CampoQueIdentifica = { clave: 'extras', tipo: 'multi_opcion', opciones: [] }
    expect(identidadDeVehiculo(vehiculo({ extras: [] }), extras)).toEqual({
      nombre: TITULO,
      titulo: null,
    })
  })

  it('un monto nunca nombra a un vehículo', () => {
    const precio: CampoQueIdentifica = { clave: 'precio', tipo: 'moneda', opciones: [] }
    expect(identidadDeVehiculo(vehiculo({ precio: 15000 }), precio)).toEqual({
      nombre: TITULO,
      titulo: null,
    })
  })
})

describe('campoPrincipalDe', () => {
  it('el marcado y activo', () => {
    const lote = campo({ clave: 'lote_interno', principal: true })
    expect(campoPrincipalDe([campo({ clave: 'color' }), lote])).toBe(lote)
  })

  it('ninguno marcado, o el marcado desactivado: ninguno', () => {
    expect(campoPrincipalDe([campo({ clave: 'color' })])).toBeNull()
    expect(campoPrincipalDe([campo({ clave: 'lote', principal: true, activo: false })])).toBeNull()
    expect(campoPrincipalDe([])).toBeNull()
  })
})

describe('identidadEnUnaLinea', () => {
  it('con principal, «<principal> · <título>»; sin él, el título', () => {
    expect(identidadEnUnaLinea({ nombre: 'L-4471', titulo: TITULO })).toBe(`L-4471 · ${TITULO}`)
    expect(identidadEnUnaLinea({ nombre: TITULO, titulo: null })).toBe(TITULO)
  })
})
