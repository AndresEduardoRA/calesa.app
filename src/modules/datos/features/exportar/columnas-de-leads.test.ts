import { describe, expect, it, vi } from 'vitest'
import type { CampoDeLead } from '@/modules/leads'
import type { FilaDeLeadAExportar } from '../../entities/exportacion'
import { encabezadosDeLeads, filaDeLead, type ContextoDeLeads } from './columnas-de-leads'

vi.mock('server-only', () => ({}))

const campo = (clave: string, etiqueta: string, activo = true): CampoDeLead => ({
  id: `00000000-0000-0000-0000-0000000000${clave === 'signo' ? '01' : '02'}`,
  clave,
  etiqueta,
  tipo: 'opcion',
  opciones: [{ clave: 'leo', etiqueta: 'Leo' }],
  requerido: false,
  valorDefecto: null,
  minimo: null,
  maximo: null,
  valorDefectoEmpresa: null,
  grupo: null,
  orden: 10,
  enTabla: false,
  filtrable: false,
  soloCartera: false,
  privacidadPendiente: null,
  esSistema: false,
  activo,
  actualizadoEn: '2026-10-14T20:00:00+00:00',
})

const CONTEXTO: ContextoDeLeads = {
  campos: [campo('signo', 'Signo'), campo('apagado', 'Apagado', false)],
  tipos: new Map([['t1', 'Prospecto']]),
  origenes: new Map([['o1', 'Facebook']]),
  duenos: new Map([['d1', 'Ana']]),
  codigoDePais: '+591',
  zona: 'America/La_Paz',
  conNumeroGlobal: false,
}

const FILA: FilaDeLeadAExportar = {
  id: 'l1',
  numero: null,
  nombre: 'Juan',
  telefono: '59170011002',
  telefonoVisible: true,
  tipoLeadId: 't1',
  origenLeadId: 'o1',
  atributos: { signo: 'leo', apagado: 'leo' },
  duenoId: 'd1',
  creadoEn: '2026-11-12T20:30:00+00:00',
  ultimoSeguimientoEn: null,
}

describe('columnas de leads de exportar todo', () => {
  it('sin el número global no hay columna «N.º» y un campo apagado no sale', () => {
    expect(encabezadosDeLeads(CONTEXTO)).toEqual([
      'Nombre',
      'Teléfono',
      'Tipo',
      'Origen',
      'Dueño',
      'Creado',
      'Último seguimiento',
      'Signo',
    ])
    expect(filaDeLead(FILA, CONTEXTO)).toEqual([
      'Juan',
      '70011002',
      'Prospecto',
      'Facebook',
      'Ana',
      '2026-11-12T16:30',
      '',
      'Leo',
    ])
  })

  it('un lead ajeno sale con el teléfono enmascarado tal cual lo dio la base', () => {
    const ajeno = { ...FILA, telefono: '591•••••02', telefonoVisible: false }
    expect(filaDeLead(ajeno, CONTEXTO)[1]).toBe('591•••••02')
  })

  it('con el número global, la columna va primero y un nulo es una celda vacía', () => {
    const conGlobal = { ...CONTEXTO, conNumeroGlobal: true }
    expect(encabezadosDeLeads(conGlobal)[0]).toBe('N.º')
    expect(filaDeLead(FILA, conGlobal)[0]).toBe('')
    expect(filaDeLead({ ...FILA, numero: 42 }, conGlobal)[0]).toBe(42)
  })

  it('lo que no está en los catálogos o en el mapa de dueños sale vacío', () => {
    const fila = filaDeLead(
      { ...FILA, tipoLeadId: 'x', origenLeadId: null, duenoId: 'otro', telefono: null },
      CONTEXTO,
    )
    expect(fila.slice(1, 5)).toEqual(['', '', '', ''])
  })
})
