import { describe, expect, it, vi } from 'vitest'
import type { Envio } from '@/shared/lib/enviar-accion'
import type { PedidoDeFila } from '../../../entities/importacion/filas'
import type { ResultadoDeFila } from '../../../entities/importacion/lotes'
import { ejecutarImportacion } from './ejecutar-importacion'

const pedido = (id: string, fila: number): PedidoDeFila => ({
  id,
  fila,
  lead: {
    nombre: id,
    telefono_principal: '70011002',
    tipo: 'prospecto',
    origen_lead_id: null,
    atributos: {},
  },
})

const creado = (p: PedidoDeFila): ResultadoDeFila => ({
  id: p.id,
  fila: p.fila,
  resultado: 'creado',
  repetido: false,
  numero: p.fila,
  campo: null,
  motivo: null,
})

const lotes = [[pedido('a', 2), pedido('b', 3)], [pedido('c', 4), pedido('d', 5)], [pedido('e', 6)]]

const bien = (lote: readonly PedidoDeFila[]): Envio<ResultadoDeFila[]> => ({
  ok: true,
  data: lote.map(creado),
})

const SIN_RED: Envio<ResultadoDeFila[]> = {
  ok: false,
  sinRed: true,
  error: { codigo: 'inesperado', mensaje: 'No pudimos llegar al servidor.' },
}

describe('ejecutarImportacion', () => {
  it('manda los lotes en orden y deja el resultado de cada fila', async () => {
    const resultados = new Map<string, ResultadoDeFila>()
    const enviar = vi.fn((lote: readonly PedidoDeFila[]) => Promise.resolve(bien(lote)))
    const avanzo = vi.fn()
    const fin = await ejecutarImportacion({
      lotes,
      resultados,
      enviar,
      cancelado: () => false,
      alAvanzar: avanzo,
    })
    expect(fin).toEqual({ tipo: 'completa' })
    expect(enviar).toHaveBeenCalledTimes(3)
    expect(avanzo).toHaveBeenCalledTimes(3)
    expect([...resultados.keys()]).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('se corta la red a mitad: queda pausada y al reanudar sólo manda lo que falta, sin duplicar', async () => {
    const resultados = new Map<string, ResultadoDeFila>()
    let llamadas = 0
    const enviar = vi.fn((lote: readonly PedidoDeFila[]) => {
      llamadas += 1
      return Promise.resolve(llamadas === 2 ? SIN_RED : bien(lote))
    })
    const primera = await ejecutarImportacion({
      lotes,
      resultados,
      enviar,
      cancelado: () => false,
      alAvanzar: () => {},
    })
    expect(primera).toEqual({ tipo: 'sin_red' })
    expect([...resultados.keys()]).toEqual(['a', 'b'])

    const segunda = await ejecutarImportacion({
      lotes,
      resultados,
      enviar,
      cancelado: () => false,
      alAvanzar: () => {},
    })
    expect(segunda).toEqual({ tipo: 'completa' })
    // El primer lote no se volvió a mandar: 1 + 1 (cortado) + 2 (reanudado).
    expect(enviar).toHaveBeenCalledTimes(4)
    expect(enviar.mock.calls.map(([lote]) => lote.map((p) => p.id).join(''))).toEqual([
      'ab',
      'cd',
      'cd',
      'e',
    ])
    expect(resultados.size).toBe(5)
  })
})

describe('ejecutarImportacion: cancelar y rechazos', () => {
  it('cancelar entre lotes: lo hecho queda y no se manda nada más', async () => {
    const resultados = new Map<string, ResultadoDeFila>()
    let cancelar = false
    const fin = await ejecutarImportacion({
      lotes,
      resultados,
      enviar: (lote) => Promise.resolve(bien(lote)),
      cancelado: () => cancelar,
      alAvanzar: () => {
        cancelar = true
      },
    })
    expect(fin).toEqual({ tipo: 'cancelada' })
    expect([...resultados.keys()]).toEqual(['a', 'b'])
  })

  it('un rechazo de la base no se reintenta solo', async () => {
    const resultados = new Map<string, ResultadoDeFila>()
    const fin = await ejecutarImportacion({
      lotes,
      resultados,
      enviar: () =>
        Promise.resolve({
          ok: false,
          error: { codigo: 'sin_permiso', mensaje: 'No tienes permiso para importar leads.' },
        }),
      cancelado: () => false,
      alAvanzar: () => {},
    })
    expect(fin).toMatchObject({ tipo: 'rechazada', error: { codigo: 'sin_permiso' } })
    expect(resultados.size).toBe(0)
  })

  it('sin lotes no hay nada que mandar', async () => {
    const fin = await ejecutarImportacion({
      lotes: [],
      resultados: new Map(),
      enviar: () => Promise.reject(new Error('no debía mandar')),
      cancelado: () => false,
      alAvanzar: () => {},
    })
    expect(fin).toEqual({ tipo: 'completa' })
  })
})
