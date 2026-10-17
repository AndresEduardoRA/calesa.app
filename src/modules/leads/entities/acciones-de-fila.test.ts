import { describe, expect, it } from 'vitest'
import { accionDeLaUrl, filaParaAccion } from './acciones-de-fila'
import type { FilaDeLead } from './listado'
import { SIN_MARCAS } from './marcas'

const ID = '4a1f5b0e-6f0a-4f6e-9a55-1b6e2a1f0c11'
const OTRO = '0b9c2f3e-1d4a-4c5b-8e6f-7a8b9c0d1e2f'

const fila = (cambios: Partial<FilaDeLead> = {}): FilaDeLead => ({
  id: ID,
  numeros: { numero: 12, numeroPropio: null, creadorDelPropio: null },
  nombre: 'Ana Rojas',
  telefono: '+59170011002',
  enCartera: true,
  duenoId: 'yo',
  tipo: 'prospecto',
  origenId: null,
  creadoEn: '2026-10-15T14:00:00+00:00',
  atributos: {},
  marcas: SIN_MARCAS,
  ...cambios,
})

describe('accionDeLaUrl', () => {
  it('sólo con `para`, y sólo los dos paneles de la fila', () => {
    expect(accionDeLaUrl('anotar-seguimiento', ID)).toBe('anotar')
    expect(accionDeLaUrl('agendar-recordatorio', ID)).toBe('agendar')
    expect(accionDeLaUrl('anotar-seguimiento', null)).toBeNull()
    expect(accionDeLaUrl('etiquetas', ID)).toBeNull()
    expect(accionDeLaUrl(null, ID)).toBeNull()
  })
})

describe('filaParaAccion', () => {
  it('una fila de la página, de la cartera, con el permiso', () => {
    expect(filaParaAccion([fila()], ID, true)?.id).toBe(ID)
  })
  it('sin el permiso, ajena, de otra página o inventada: nula, todas igual', () => {
    expect(filaParaAccion([fila()], ID, false)).toBeNull()
    expect(filaParaAccion([fila({ enCartera: false })], ID, true)).toBeNull()
    expect(filaParaAccion([fila()], OTRO, true)).toBeNull()
    expect(filaParaAccion([fila()], 'no-es-un-id', true)).toBeNull()
  })
})
