import { describe, expect, it } from 'vitest'
import type { RequisitoParaConfigurar } from '../flujo'
import {
  clavesQueFaltan,
  destinoDeRequisito,
  reglaDeEsperasActiva,
  requisitosDeLaFase,
  tiposActivos,
} from './vista-de-fase'

function r(id: string, orden: number, parcial: Partial<RequisitoParaConfigurar> = {}) {
  return {
    id,
    faseId: 'f1',
    tipo: 'dato',
    bloqueante: false,
    orden,
    claveDato: null,
    config: {},
    esperaAmbito: null,
    esperaFaseId: null,
    formatos: null,
    maxArchivos: null,
    minArchivos: null,
    notas: null,
    tipoDocumentoId: null,
    ...parcial,
  } satisfies RequisitoParaConfigurar
}

const a = r('a', 10)
const b = r('b', 20)
const c = r('c', 30)

describe('destinoDeRequisito', () => {
  it('subir va después del anterior del anterior, o primero', () => {
    expect(destinoDeRequisito([a, b, c], 'c', 'subir')).toEqual({ despuesDe: 'a' })
    expect(destinoDeRequisito([a, b, c], 'b', 'subir')).toEqual({ despuesDe: null })
  })

  it('bajar va después del siguiente', () => {
    expect(destinoDeRequisito([a, b, c], 'a', 'bajar')).toEqual({ despuesDe: 'b' })
    expect(destinoDeRequisito([a, b, c], 'b', 'bajar')).toEqual({ despuesDe: 'c' })
  })

  it('el primero no sube, el último no baja, y con uno solo ninguno se mueve', () => {
    expect(destinoDeRequisito([a, b, c], 'a', 'subir')).toBeNull()
    expect(destinoDeRequisito([a, b, c], 'c', 'bajar')).toBeNull()
    expect(destinoDeRequisito([a], 'a', 'subir')).toBeNull()
    expect(destinoDeRequisito([a], 'a', 'bajar')).toBeNull()
    expect(destinoDeRequisito([a, b], 'x', 'subir')).toBeNull()
  })
})

describe('requisitosDeLaFase y clavesQueFaltan', () => {
  it('toma los de la fase, por orden', () => {
    const otra = r('z', 5, { faseId: 'f2' })
    expect(requisitosDeLaFase([c, otra, a, b], 'f1').map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })

  it('no vuelve a ofrecer la clave que la fase ya pide', () => {
    const con = [r('a', 10, { claveDato: 'vehiculo.vin' })]
    const quedan = clavesQueFaltan('vehiculos', con)
    expect(quedan).not.toContain('vehiculo.vin')
    expect(quedan).toContain('vehiculo.lead')
    expect(clavesQueFaltan('repuestos', [])).toContain('repuesto.tracking')
  })
})

describe('tiposActivos y reglaDeEsperasActiva', () => {
  it('sólo los tipos activos, en el orden leído', () => {
    const tipo = (id: string, activo: boolean) => ({ id, nombre: id, formatos: [], activo })
    expect(
      tiposActivos([tipo('a', true), tipo('b', false), tipo('c', true)]).map((t) => t.id),
    ).toEqual(['a', 'c'])
  })

  it('«Esperas» cuenta sólo encendida', () => {
    expect(reglaDeEsperasActiva({ reglas: [{ regla: 'esperas', activa: true }] })).toBe(true)
    expect(reglaDeEsperasActiva({ reglas: [{ regla: 'esperas', activa: false }] })).toBe(false)
    expect(reglaDeEsperasActiva({ reglas: [{ regla: 'pagos', activa: true }] })).toBe(false)
  })
})
