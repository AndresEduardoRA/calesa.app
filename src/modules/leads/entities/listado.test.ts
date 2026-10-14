import { describe, expect, it } from 'vitest'
import type { CampoDeLead } from './campo'
import {
  camposDeLaTarjeta,
  camposDeTabla,
  clavesDeTabla,
  columnasDeLaConsulta,
  filasDeLeadDesde,
  leadCompletoDesde,
} from './listado'

const campo = (clave: string, extra: Partial<CampoDeLead> = {}) =>
  ({ clave, activo: true, enTabla: true, ...extra }) as CampoDeLead

const FILA = {
  id: '27b3a3b2-7635-41a1-87d7-d35af6aa8292',
  numero: 84,
  nombre: 'Ana',
  telefono_principal: '591•••••01',
  en_cartera: false,
  tipo: 'prospecto',
  origen_lead_id: '0a747082-37b1-4e4b-b884-1456b9664aec',
  creado_en: '2026-10-14T23:03:49.221199+00:00',
}

describe('columnas del listado', () => {
  it('sólo los campos activos y en la tabla, en el orden del layout', () => {
    const campos = [
      campo('a'),
      campo('b', { enTabla: false }),
      campo('c', { activo: false }),
      campo('d'),
    ]
    expect(camposDeTabla(campos).map((c) => c.clave)).toEqual(['a', 'd'])
  })

  it('una clave que la base no admitiría no llega a la consulta', () => {
    const campos = [campo('ciudad'), campo('Mala clave'), campo('x);drop'), campo('ok_2')]
    expect(clavesDeTabla(campos)).toEqual(['ciudad', 'ok_2'])
    expect(columnasDeLaConsulta(['ciudad', 'x,y', 'edad'])).toBe(
      'id,numero,nombre,telefono_principal,en_cartera,tipo,origen_lead_id,creado_en,a_ciudad:atributos->ciudad,a_edad:atributos->edad',
    )
  })
})

describe('camposDeLaTarjeta', () => {
  const fila = (atributos: Record<string, unknown>, enCartera = true) =>
    ({ atributos, enCartera }) as unknown as Parameters<typeof camposDeLaTarjeta>[1]
  const campos = [
    campo('ciudad'),
    campo('ci', { soloCartera: true }),
    campo('color'),
    campo('edad'),
  ]

  it('salta los datos que el lead no tiene y se queda con los dos primeros', () => {
    expect(
      camposDeLaTarjeta(campos, fila({ color: 'rojo', edad: 30 })).map((c) => c.clave),
    ).toEqual(['color', 'edad'])
    expect(camposDeLaTarjeta(campos, fila({ ciudad: 'La Paz', color: 'x', edad: 3 }))).toHaveLength(
      2,
    )
  })

  it('un privado que no le llega a quien mira cuenta: se dice que es de la cartera', () => {
    expect(camposDeLaTarjeta(campos, fila({ color: 'azul' }, false)).map((c) => c.clave)).toEqual([
      'ci',
      'color',
    ])
    // De su cartera y vacío: no hay nada que decir.
    expect(camposDeLaTarjeta(campos, fila({ color: 'azul' }, true)).map((c) => c.clave)).toEqual([
      'color',
    ])
  })
})

describe('filasDeLeadDesde', () => {
  it('arma la fila con el teléfono como llega y los atributos de la tabla', () => {
    const [fila] = filasDeLeadDesde(
      [{ ...FILA, a_ciudad: 'Santa Cruz', a_edad: null, a_otro: 'x' }],
      ['ciudad', 'edad'],
    )
    expect(fila).toEqual({
      id: FILA.id,
      numero: 84,
      nombre: 'Ana',
      telefono: '591•••••01',
      enCartera: false,
      tipo: 'prospecto',
      origenId: FILA.origen_lead_id,
      creadoEn: FILA.creado_en,
      atributos: { ciudad: 'Santa Cruz' },
    })
  })

  it('una fila que no cumple la forma se descarta sin tumbar la lista', () => {
    const filas = filasDeLeadDesde(
      [FILA, { ...FILA, id: 'no-es-un-id' }, { ...FILA, tipo: 'raro' }, 5],
      [],
    )
    expect(filas).toHaveLength(1)
  })

  it('en_cartera nulo es «no»; lo que no es un arreglo, una lista vacía', () => {
    expect(filasDeLeadDesde([{ ...FILA, en_cartera: null }], [])[0]?.enCartera).toBe(false)
    expect(filasDeLeadDesde(null, [])).toEqual([])
  })
})

describe('leadCompletoDesde', () => {
  it('trae todos los atributos que llegaron', () => {
    const lead = leadCompletoDesde({ ...FILA, atributos: { ciudad: 'La Paz', edad: 30 } })
    expect(lead?.atributos).toEqual({ ciudad: 'La Paz', edad: 30 })
  })

  it('sin atributos (no lo ve) viene vacío; algo que no es un lead, null', () => {
    expect(leadCompletoDesde({ ...FILA, atributos: null })?.atributos).toEqual({})
    expect(leadCompletoDesde({ nada: true })).toBeNull()
    expect(leadCompletoDesde(null)).toBeNull()
  })
})
