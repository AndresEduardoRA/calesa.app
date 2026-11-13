import { describe, expect, it, vi } from 'vitest'
import type { FilaPreparada, ObjetivoDeImportacion } from '@/modules/leads/client'
import { filaNormalizadaDeLead } from './convertir-leads'

// `leads/client` reexporta una Server Action: en el navegador el bundler la cambia por una referencia; en Vitest, no.
vi.mock('server-only', () => ({}))

const TIPO = '0b6f4c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f'

const objetivos: ObjetivoDeImportacion[] = [
  { id: 'nombre', etiqueta: 'Nombre', requerido: true, fijo: true, nombres: ['nombre'] },
  {
    id: 'telefono_principal',
    etiqueta: 'Teléfono',
    requerido: true,
    fijo: true,
    nombres: ['telefono'],
  },
  {
    id: 'atributos.ciudad',
    etiqueta: 'Ciudad',
    requerido: false,
    fijo: false,
    nombres: ['ciudad'],
  },
]

const base: FilaPreparada = {
  id: 'f1',
  fila: 2,
  celdas: [],
  nombre: 'Ana',
  motivos: [],
  pedido: null,
  paisDelTelefono: null,
}

describe('filaNormalizadaDeLead', () => {
  it('una fila lista va sin origen nulo ni atributos vacíos', () => {
    const lista: FilaPreparada = {
      ...base,
      pedido: {
        id: 'f1',
        fila: 2,
        lead: {
          nombre: 'Ana',
          telefono_principal: '70000001',
          tipo_lead_id: TIPO,
          origen_lead_id: null,
          atributos: {},
        },
      },
    }
    expect(filaNormalizadaDeLead(lista, objetivos)).toEqual({
      datos: { nombre: 'Ana', telefono_principal: '70000001', tipo_lead_id: TIPO },
    })
  })

  it('con motivos, un rechazo con todos y la etiqueta del primero', () => {
    const mala: FilaPreparada = {
      ...base,
      motivos: [
        { campo: 'atributos.ciudad', motivo: 'm1' },
        { campo: 'nombre', motivo: 'm2' },
      ],
    }
    expect(filaNormalizadaDeLead(mala, objetivos)).toEqual({
      rechazo: { motivo: 'm1; m2', campo: 'Ciudad' },
    })
    const deLaFila: FilaPreparada = { ...base, motivos: [{ campo: null, motivo: 'x'.repeat(600) }] }
    expect(filaNormalizadaDeLead(deLaFila, objetivos)).toEqual({
      rechazo: { motivo: 'x'.repeat(500) },
    })
  })
})
