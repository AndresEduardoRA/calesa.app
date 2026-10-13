import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  VITRINA_CERRADA,
  estadoDeVitrina,
  motivosDeNoVisible,
  permisoDeVitrina,
  textoDeMotivo,
  validarVitrina,
  valoresDeVitrina,
  vistaPreviaDesde,
  vitrinaAbierta,
  vitrinaDelOrigenDesde,
  type ValoresDeVitrina,
  type VitrinaDelOrigen,
} from './vitrina'

const FASE = '00000000-0000-0000-0000-0000000000f1'
const OTRA = '00000000-0000-0000-0000-0000000000f2'
const ABIERTA: VitrinaDelOrigen = {
  webActiva: true,
  origenActivo: true,
  origenVisible: true,
  fasesQuePublican: [FASE],
}

describe('vitrinaDelOrigenDesde', () => {
  it('lee lo que responde la base', () => {
    expect(
      vitrinaDelOrigenDesde({
        web_activa: true,
        origen_activo: true,
        origen_visible: false,
        fases_que_publican: [FASE],
      }),
    ).toEqual({ ...ABIERTA, origenVisible: false })
  })

  it('sin respuesta, nada se da por visible', () => {
    expect(vitrinaDelOrigenDesde(null)).toEqual(VITRINA_CERRADA)
    expect(vitrinaAbierta(VITRINA_CERRADA)).toBe(false)
    expect(vitrinaAbierta(ABIERTA)).toBe(true)
  })
})

describe('estadoDeVitrina', () => {
  it('sin la marca del vehículo no hay nada que ver', () => {
    expect(estadoDeVitrina({ publicadoWeb: false, faseId: FASE }, ABIERTA)).toBe('sin_publicar')
  })

  it('publicado, en una fase que publica y con el origen abierto, está en vitrina', () => {
    expect(estadoDeVitrina({ publicadoWeb: true, faseId: FASE }, ABIERTA)).toBe('en_vitrina')
  })

  it('publicado no es visible: dice por qué', () => {
    expect(estadoDeVitrina({ publicadoWeb: true, faseId: OTRA }, ABIERTA)).toBe('no_visible')
    expect(motivosDeNoVisible({ faseId: OTRA }, ABIERTA)).toEqual(['fase_no_publica'])
    expect(motivosDeNoVisible({ faseId: null }, ABIERTA)).toEqual(['sin_fase'])
    expect(motivosDeNoVisible({ faseId: FASE }, { ...ABIERTA, webActiva: false })).toEqual([
      'web_apagada',
    ])
    expect(motivosDeNoVisible({ faseId: null }, VITRINA_CERRADA)).toEqual([
      'web_apagada',
      'origen_inactivo',
      'origen_no_visible',
      'sin_fase',
    ])
  })
})

describe('textoDeMotivo', () => {
  it('nombra al origen y a la fase con lo que traen sus filas', () => {
    const nombres = { origen: 'Corea', fase: 'En tránsito' }
    expect(textoDeMotivo('origen_no_visible', nombres)).toBe(
      'Corea no está entre los orígenes que muestra el sitio.',
    )
    expect(textoDeMotivo('fase_no_publica', nombres)).toBe(
      'La fase «En tránsito» no publica en la web.',
    )
    expect(textoDeMotivo('fase_no_publica', { origen: 'Corea', fase: null })).toBe(
      'Su fase no publica en la web.',
    )
  })
})

describe('vistaPreviaDesde', () => {
  const RESPUESTA = {
    tarjeta: {
      id: '00000000-0000-0000-0000-000000000001',
      numero: 7,
      origen: 'corea',
      origen_nombre: 'Corea',
      titulo: '2022 Toyota Hilux',
      marca: 'Toyota',
      modelo: 'Hilux',
      anio: 2022,
      categoria: null,
      precio: 21500,
      precio_hasta: null,
      precio_nota: 'IVA incluido',
      destacado: false,
      atributos: { color: 'Blanco' },
      imagen: 'v/a.webp',
      miniatura: 'v/b.webp',
      actualizado_en: '2026-10-13T12:00:00+00:00',
    },
    publicado: true,
    visible: false,
    con_fase: true,
    fase_publica: false,
    origen_activo: true,
    origen_visible: true,
    web_activa: true,
  }

  it('trae la tarjeta y los motivos por los que no se ve', () => {
    const previa = vistaPreviaDesde(RESPUESTA)
    expect(previa?.tarjeta).toMatchObject({
      titulo: '2022 Toyota Hilux',
      precio: 21500,
      precioNota: 'IVA incluido',
      atributos: { color: 'Blanco' },
      miniatura: 'v/b.webp',
    })
    expect(previa?.motivos).toEqual(['fase_no_publica'])
  })

  it('nulo cuando la base no responde por ese vehículo', () => {
    expect(vistaPreviaDesde(null)).toBeNull()
  })
})

describe('validarVitrina', () => {
  const VALORES: ValoresDeVitrina = {
    publicado: true,
    precio: '21500,5',
    precioHasta: '',
    nota: '  IVA incluido ',
    destacado: true,
  }

  it('entiende la coma decimal y limpia la nota', () => {
    expect(validarVitrina(VALORES)).toEqual({
      ok: true,
      datos: {
        publicado: true,
        precio: 21500.5,
        precioHasta: null,
        nota: 'IVA incluido',
        destacado: true,
      },
    })
  })

  it('sin precio es «Consultar»', () => {
    const validacion = validarVitrina({ ...VALORES, precio: ' ', nota: '' })
    expect(validacion).toMatchObject({ ok: true, datos: { precio: null, nota: null } })
  })

  it('lo que no está publicado no se destaca', () => {
    expect(validarVitrina({ ...VALORES, publicado: false })).toMatchObject({
      ok: true,
      datos: { publicado: false, destacado: false, precio: 21500.5 },
    })
  })

  it('dice junto a cada campo lo que no pasa', () => {
    expect(validarVitrina({ ...VALORES, precio: 'mucho' })).toEqual({
      ok: false,
      porCampo: { precio: 'Tiene que ser un número, de cero para arriba.' },
    })
    expect(validarVitrina({ ...VALORES, precio: '-1' })).toMatchObject({ ok: false })
    expect(validarVitrina({ ...VALORES, precio: '', precioHasta: '100' })).toEqual({
      ok: false,
      porCampo: { precioHasta: 'Para poner un «hasta» falta el precio público.' },
    })
    expect(validarVitrina({ ...VALORES, precio: '200', precioHasta: '100' })).toEqual({
      ok: false,
      porCampo: { precioHasta: 'No puede ser menor que el precio público.' },
    })
    expect(validarVitrina({ ...VALORES, nota: 'x'.repeat(121) })).toEqual({
      ok: false,
      porCampo: { nota: 'Hasta 120 caracteres.' },
    })
  })
})

describe('valoresDeVitrina', () => {
  it('arranca de lo guardado', () => {
    expect(
      valoresDeVitrina({
        publicadoWeb: true,
        precioWeb: 21500,
        precioWebHasta: null,
        precioWebNota: null,
        destacadoWeb: false,
      }),
    ).toEqual({ publicado: true, precio: '21500', precioHasta: '', nota: '', destacado: false })
  })
})

describe('permisoDeVitrina', () => {
  const COREA = { id: '00000000-0000-0000-0000-0000000000c1', nombre: 'Corea' }
  const TAIWAN = { id: '00000000-0000-0000-0000-0000000000c2', nombre: 'Taiwán' }
  const permisos: Permisos = [{ clave: 'vehiculos.vitrina', origenId: COREA.id, alcance: 'todos' }]

  it('es por origen, y sin él dice el motivo', () => {
    expect(permisoDeVitrina(permisos, COREA)).toEqual({ estado: 'habilitado' })
    expect(permisoDeVitrina(permisos, TAIWAN)).toEqual({
      estado: 'deshabilitado',
      motivo:
        'No tienes permiso para publicar en la web lo de Taiwán. Pídeselo a quien administra los roles.',
    })
  })
})
