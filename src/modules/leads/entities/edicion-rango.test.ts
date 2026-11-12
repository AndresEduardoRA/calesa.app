// El rango de un campo numérico al editar un lead (9-2): un valor que ya estaba fuera no impide guardar otro dato; cambiarlo a otro
// fuera dice el motivo, como la base.
import { describe, expect, it } from 'vitest'
import type { CampoDeLead } from './campo'
import { camposEditables, validarEdicion, valoresDeEdicion } from './edicion'
import type { LeadDeFicha } from './ficha'
import { SIN_MARCAS } from './marcas'

const ZONA = 'America/La_Paz'
const TIPO = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

function campo(cambios: Partial<CampoDeLead> & Pick<CampoDeLead, 'clave'>): CampoDeLead {
  return {
    id: `id-${cambios.clave}`,
    etiqueta: cambios.clave,
    tipo: 'texto',
    opciones: [],
    requerido: false,
    valorDefecto: null,
    valorDefectoEmpresa: null,
    minimo: null,
    maximo: null,
    grupo: null,
    orden: 0,
    enTabla: false,
    filtrable: false,
    soloCartera: false,
    privacidadPendiente: null,
    esSistema: false,
    activo: true,
    actualizadoEn: '2026-11-12T10:00:00Z',
    ...cambios,
  }
}

const LAYOUT = [
  campo({ clave: 'ciudad', etiqueta: 'Ciudad', orden: 1 }),
  campo({ clave: 'puntaje', etiqueta: 'Puntaje', tipo: 'numero', minimo: 1, maximo: 5, orden: 2 }),
]

// Cargado con 8 cuando el rango no existía.
const FICHA: LeadDeFicha = {
  id: '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11',
  numeros: { numero: 12, numeroPropio: null, creadorDelPropio: null },
  nombre: 'Ana Rojas',
  telefonoCc: '+591',
  telefono: '59170011002',
  enCartera: true,
  tipoLeadId: TIPO,
  origenId: null,
  atributos: { ciudad: 'La Paz', puntaje: 8 },
  creadoEn: '2026-11-12T10:00:00Z',
  actualizadoEn: '2026-11-12T10:05:00Z',
  tieneId: null,
  tieneNombre: null,
  telefonos: [],
  recordatoriosVencidos: 0,
  vehiculosVinculados: 0,
  marcas: SIN_MARCAS,
}

function validar(cambios: Record<string, string>) {
  const campos = camposEditables(LAYOUT, true)
  const iniciales = valoresDeEdicion(FICHA, campos, ZONA, 'es-BO')
  return validarEdicion({
    ficha: FICHA,
    valores: { ...iniciales, ...cambios },
    iniciales,
    campos,
    origenes: [],
    tipos: [
      { id: TIPO, clave: 'prospecto', nombre: 'Prospecto', clase: 'prospecto', activo: true },
    ],
    zona: ZONA,
    locale: 'es-BO',
  })
}

describe('el rango al editar un lead', () => {
  it('un número que ya estaba fuera no impide guardar otro dato', () => {
    expect(validar({ 'atributos.ciudad': 'Sucre' })).toEqual({
      ok: true,
      cambios: { atributos: { ciudad: 'Sucre' } },
    })
  })

  it('cambiarlo a otro valor fuera dice el motivo; adentro, viaja', () => {
    expect(validar({ 'atributos.puntaje': '7' })).toEqual({
      ok: false,
      porCampo: { 'atributos.puntaje': '«Puntaje» va de 1 a 5.' },
    })
    expect(validar({ 'atributos.puntaje': '4' })).toEqual({
      ok: true,
      cambios: { atributos: { puntaje: 4 } },
    })
  })
})
