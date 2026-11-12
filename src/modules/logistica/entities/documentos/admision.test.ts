import { describe, expect, it } from 'vitest'
import {
  aceptarDelTipo,
  avisoDelPeso,
  camposDeFechasDelTipo,
  erroresDeLaBandeja,
  extensionDelDocumento,
  formatosLegibles,
  nombreParaGuardar,
  PESO_MAXIMO_DEL_DOCUMENTO,
  veredictoDelArchivo,
  type ArchivoElegido,
} from './admision'
import type { TipoDeDocumento } from './documento'

const PDF = 'application/pdf'
const JPG = 'image/jpeg'

function tipo(cambios: Partial<TipoDeDocumento> = {}): TipoDeDocumento {
  return {
    id: 't1',
    nombre: 'BL',
    formatos: [PDF],
    modoDeVencimiento: 'ninguno',
    vigenciaDias: null,
    visiblePortalPermitido: false,
    flujoId: null,
    orden: 1,
    ...cambios,
  }
}

function archivo(cambios: Partial<ArchivoElegido> = {}): ArchivoElegido {
  return { nombre: 'bl.pdf', mime: PDF, bytes: 1000, hash: 'h1', ...cambios }
}

describe('veredictoDelArchivo', () => {
  const ninguno = new Set<string>()

  it('admite un archivo de un formato del tipo', () => {
    expect(veredictoDelArchivo(archivo(), tipo(), ninguno)).toEqual({ entra: true })
  })

  it('rechaza un formato que el tipo no admite, nombrándolo', () => {
    expect(veredictoDelArchivo(archivo({ mime: JPG }), tipo(), ninguno)).toEqual({
      entra: false,
      motivo: 'Este tipo de documento no admite JPG.',
    })
  })

  it('lo que manda es el tipo de la base: un tipo que admite imágenes admite JPG', () => {
    expect(
      veredictoDelArchivo(archivo({ mime: JPG }), tipo({ formatos: [PDF, JPG] }), ninguno),
    ).toEqual({
      entra: true,
    })
  })

  it('sin tipo elegido admite lo que el bucket guarda y no lo demás', () => {
    expect(veredictoDelArchivo(archivo({ mime: JPG }), null, ninguno).entra).toBe(true)
    expect(veredictoDelArchivo(archivo({ mime: 'text/plain' }), null, ninguno).entra).toBe(false)
  })

  it('rechaza lo vacío, lo de más de 25 MB y lo repetido por hash', () => {
    expect(veredictoDelArchivo(archivo({ bytes: 0 }), tipo(), ninguno)).toEqual({
      entra: false,
      motivo: 'Está vacío.',
    })
    expect(
      veredictoDelArchivo(archivo({ bytes: PESO_MAXIMO_DEL_DOCUMENTO + 1 }), tipo(), ninguno),
    ).toEqual({ entra: false, motivo: 'Pesa más de 25 MB.' })
    expect(veredictoDelArchivo(archivo(), tipo(), new Set(['h1']))).toEqual({
      entra: false,
      motivo: 'Ya está en la lista.',
    })
  })

  it('25 MB justos entran', () => {
    expect(
      veredictoDelArchivo(archivo({ bytes: PESO_MAXIMO_DEL_DOCUMENTO }), tipo(), ninguno).entra,
    ).toBe(true)
  })
})

describe('formatos y peso', () => {
  it('la extensión sale del contenido y es nula si el bucket no lo guarda', () => {
    expect(extensionDelDocumento(PDF)).toBe('pdf')
    expect(extensionDelDocumento(JPG)).toBe('jpg')
    expect(extensionDelDocumento('text/plain')).toBeNull()
  })

  it('dice los formatos de un tipo y arma el accept', () => {
    expect(formatosLegibles([PDF, JPG, 'image/png'])).toBe('PDF, JPG y PNG')
    expect(formatosLegibles([PDF])).toBe('PDF')
    expect(aceptarDelTipo(tipo({ formatos: [PDF, JPG] }))).toBe(`${PDF},${JPG}`)
  })

  it('avisa el peso sólo pasados 10 MB', () => {
    expect(avisoDelPeso(10 * 1024 * 1024)).toBeNull()
    expect(avisoDelPeso(12 * 1024 * 1024)).toBe('Pesa 12 MB: en una red lenta tarda.')
  })
})

describe('nombreParaGuardar', () => {
  it('quita las barras, recorta a 200 y no deja el nombre vacío', () => {
    expect(nombreParaGuardar('  a/b\\c.pdf ')).toBe('a-b-c.pdf')
    expect(nombreParaGuardar('x'.repeat(300))).toHaveLength(200)
    expect(nombreParaGuardar('   ')).toBe('documento')
  })
})

describe('fechas y errores de la bandeja', () => {
  const base = { tipo: tipo(), cantidad: 1, emitidoEl: '', venceEl: '', nota: '' }

  it('cada modo pide sus fechas', () => {
    expect(camposDeFechasDelTipo(tipo({ modoDeVencimiento: 'ninguno' }))).toEqual({
      emitido: false,
      vence: 'oculto',
    })
    expect(camposDeFechasDelTipo(tipo({ modoDeVencimiento: 'renovar' })).vence).toBe('opcional')
    expect(camposDeFechasDelTipo(tipo({ modoDeVencimiento: 'solicitar' })).vence).toBe(
      'obligatorio',
    )
  })

  it('sin errores se puede subir', () => {
    expect(erroresDeLaBandeja(base)).toEqual({})
  })

  it('pide tipo y archivos', () => {
    expect(Object.keys(erroresDeLaBandeja({ ...base, tipo: null, cantidad: 0 }))).toEqual([
      'tipo',
      'archivos',
    ])
  })

  it('«solicitar» exige el vencimiento y «ninguno» ignora una fecha que quedó escrita', () => {
    const solicitar = tipo({ modoDeVencimiento: 'solicitar' })
    expect(erroresDeLaBandeja({ ...base, tipo: solicitar })['venceEl']).toBe(
      'Este tipo de documento pide la fecha de vencimiento.',
    )
    expect(erroresDeLaBandeja({ ...base, venceEl: '2020-01-01', emitidoEl: '2027-01-01' })).toEqual(
      {},
    )
  })

  it('el vencimiento no puede ser antes de la emisión', () => {
    const renovar = tipo({ modoDeVencimiento: 'renovar' })
    expect(
      erroresDeLaBandeja({
        ...base,
        tipo: renovar,
        emitidoEl: '2027-02-01',
        venceEl: '2027-01-01',
      })['venceEl'],
    ).toBe('El vencimiento no puede ser antes de la emisión.')
    expect(
      erroresDeLaBandeja({
        ...base,
        tipo: renovar,
        emitidoEl: '2027-01-01',
        venceEl: '2027-01-01',
      }),
    ).toEqual({})
  })

  it('la nota tiene tope', () => {
    expect(erroresDeLaBandeja({ ...base, nota: 'x'.repeat(2001) })['nota']).toBeDefined()
  })
})
