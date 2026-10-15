import { describe, expect, it } from 'vitest'
import {
  CLAVE_DE_SECCION,
  MENSAJE_DE_LEAD_NO_DISPONIBLE,
  fichaDesde,
  hayBarraDeSecciones,
  origenDeLaFicha,
  quienLoTiene,
  seccionDeLead,
  seccionesDisponibles,
  telefonoDeFicha,
  type LeadDeFicha,
  type OrigenConEstado,
} from './ficha'

const ID = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'
const YO = '11111111-1111-4111-8111-111111111111'
const OTRA = '22222222-2222-4222-8222-222222222222'

const CRUDA = {
  id: ID,
  numero: 124,
  nombre: 'Ana Rojas',
  telefono_cc: '+591',
  telefono: '59170011002',
  en_cartera: true,
  tipo: 'prospecto',
  origen_lead_id: OTRA,
  atributos: { ciudad: 'La Paz' },
  creado_en: '2026-10-14T10:00:00+00:00',
  actualizado_en: '2026-10-14T10:05:00.123456+00:00',
  tiene_id: YO,
  tiene_nombre: 'Berta',
  telefonos: [{ id: OTRA, telefono: '59170011003', etiqueta: 'Casa' }],
  recordatorios_vencidos: 2,
}

describe('fichaDesde', () => {
  it('lee lo que entrega lead_ficha(), con la versión tal cual (microsegundos incluidos)', () => {
    const ficha = fichaDesde(CRUDA)
    expect(ficha).toMatchObject({
      id: ID,
      numero: 124,
      nombre: 'Ana Rojas',
      telefonoCc: '+591',
      telefono: '59170011002',
      enCartera: true,
      tipo: 'prospecto',
      origenId: OTRA,
      actualizadoEn: '2026-10-14T10:05:00.123456+00:00',
      tieneId: YO,
      recordatoriosVencidos: 2,
    })
    expect(ficha?.telefonos).toEqual([{ id: OTRA, telefono: '59170011003', etiqueta: 'Casa' }])
  })

  it('una respuesta que no cumple la forma es null: no es lo mismo que un lead que no se ve', () => {
    expect(fichaDesde({ ...CRUDA, tipo: 'marciano' })).toBeNull()
    expect(fichaDesde({ ...CRUDA, id: 'no-es-un-guid' })).toBeNull()
    expect(fichaDesde(null)).toBeNull()
    expect(fichaDesde({ ...CRUDA, recordatorios_vencidos: -1 })).toBeNull()
  })

  it('sin atributos ni teléfono llega vacío, no roto', () => {
    const ficha = fichaDesde({ ...CRUDA, atributos: null, telefono: null, telefonos: [] })
    expect(ficha?.atributos).toEqual({})
    expect(ficha?.telefono).toBe('')
  })
})

describe('quién lo tiene', () => {
  const ficha = fichaDesde(CRUDA) as LeadDeFicha

  it('uno mismo no se nombra', () => {
    expect(quienLoTiene(ficha, YO)).toBe('Lo tienes tú')
  })
  it('otra persona, por su nombre', () => {
    expect(quienLoTiene(ficha, OTRA)).toBe('Lo tiene Berta')
  })
  it('sin nombre cargado, «otra persona»', () => {
    expect(quienLoTiene({ ...ficha, tieneNombre: null }, OTRA)).toBe('Lo tiene otra persona')
  })
  it('sin nadie visible no dice nada', () => {
    expect(quienLoTiene({ ...ficha, tieneId: null, tieneNombre: null }, YO)).toBeNull()
  })
})

describe('el origen de la ficha', () => {
  const origenes: OrigenConEstado[] = [
    { id: ID, clave: 'web', nombre: 'Web', activo: true },
    { id: OTRA, clave: 'fb', nombre: 'Facebook', activo: false },
  ]
  it('nombra también uno desactivado y dice que lo está', () => {
    expect(origenDeLaFicha(origenes, OTRA)).toEqual({ nombre: 'Facebook', activo: false })
    expect(origenDeLaFicha(origenes, ID)).toEqual({ nombre: 'Web', activo: true })
  })
  it('sin origen o con uno que ya no existe, null', () => {
    expect(origenDeLaFicha(origenes, null)).toBeNull()
    expect(origenDeLaFicha(origenes, YO)).toBeNull()
  })
})

describe('teléfono de la ficha', () => {
  it('parte el código de país de la empresa', () => {
    expect(telefonoDeFicha('59170011002', '+591')).toBe('+591 70011002')
  })
  it('un enmascarado conserva sus puntos', () => {
    expect(telefonoDeFicha('591•••••02', '+591')).toBe('+591 •••••02')
  })
  it('sin código, el número entero con su +', () => {
    expect(telefonoDeFicha('5491155550000', null)).toBe('+5491155550000')
  })
  it('vacío es un guion', () => {
    expect(telefonoDeFicha('', '+591')).toBe('—')
  })
})

describe('secciones', () => {
  it('«Datos» y «Seguimientos»: hay barra de pestañas, sin números', () => {
    expect(hayBarraDeSecciones()).toBe(true)
    expect(seccionesDisponibles()).toEqual([
      { clave: 'datos', titulo: 'Datos', disponible: true },
      { clave: 'seguimientos', titulo: 'Seguimientos', disponible: true },
    ])
  })
  it('lo que no es una sección que existe abre «Datos»', () => {
    expect(seccionDeLead(undefined)).toBe('datos')
    expect(seccionDeLead('seguimientos')).toBe('seguimientos')
    expect(seccionDeLead('cotizaciones')).toBe('datos')
    expect(seccionDeLead('datos')).toBe('datos')
  })
  it('el parámetro de la URL', () => {
    expect(CLAVE_DE_SECCION).toBe('seccion')
  })
})

describe('el mensaje de un lead que no se ve', () => {
  it('es el mismo texto para lo que no existe y para lo que no se tiene', () => {
    expect(MENSAJE_DE_LEAD_NO_DISPONIBLE).toBe('No encontramos este lead o no tienes acceso.')
  })
})
