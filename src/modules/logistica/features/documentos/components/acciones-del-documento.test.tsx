import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DocumentoDeLaUnidad, TipoDeDocumento } from '../../../entities/documentos/documento'

const llamadas = vi.hoisted(() => ({ pedidos: [] as unknown[], conflicto: false }))

// La Server Action trae `server-only` por su composición: aquí es un doble con la forma de `next-safe-action`.
vi.mock('../actions/revisar-documento', () => ({
  revisarDocumento: (pedido: unknown) => {
    llamadas.pedidos.push(pedido)
    return Promise.resolve({
      data: llamadas.conflicto
        ? {
            ok: false,
            error: { codigo: 'conflicto', mensaje: 'Luis cambió este documento hace 1 min.' },
          }
        : { ok: true, data: { id: 'x', actualizadoEn: '2026-11-12T01:00:00Z' } },
    })
  },
}))

import { AccionesDelDocumento } from './acciones-del-documento'

const tipo: TipoDeDocumento = {
  id: '33333333-3333-4333-8333-333333333333',
  nombre: 'BL',
  formatos: ['application/pdf'],
  modoDeVencimiento: 'ninguno',
  vigenciaDias: null,
  visiblePortalPermitido: false,
  flujoId: null,
  orden: 1,
}

const documento = {
  id: '44444444-4444-4444-8444-444444444444',
  estado: 'subido',
  visiblePortal: false,
  actualizadoEn: '2026-11-12T00:00:00Z',
} as DocumentoDeLaUnidad

function dibujar(claves: { aprobar: boolean | null; subir: boolean | null }) {
  const releer = vi.fn()
  render(
    <AccionesDelDocumento
      documento={documento}
      tipo={tipo}
      contexto={{ unidadId: 'u1', claves, tipos: [tipo], releer }}
    />,
  )
  return releer
}

beforeEach(() => {
  llamadas.pedidos = []
  llamadas.conflicto = false
})
afterEach(cleanup)

describe('AccionesDelDocumento', () => {
  it('sin la clave de aprobar «Aprobar» y «Rechazar» están apagados y dicen por qué', () => {
    dibujar({ aprobar: false, subir: true })
    expect(screen.getByRole('button', { name: 'Aprobar' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Rechazar' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByText('Necesitas permiso para aprobar documentos.')).toBeTruthy()
  })

  it('con la clave, «Aprobar» llama a la base con la versión de la fila', async () => {
    dibujar({ aprobar: true, subir: false })
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }))
    await waitFor(() => {
      expect(llamadas.pedidos).toHaveLength(1)
    })
    expect(llamadas.pedidos[0]).toEqual({
      id: documento.id,
      actualizadoEnEsperado: documento.actualizadoEn,
      estado: 'aprobado',
      motivo: null,
    })
  })

  it('«Rechazar» pide el motivo (vacío no se confirma) y lo manda recortado', async () => {
    dibujar({ aprobar: true, subir: false })
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }))
    const confirmar = screen.getByRole('button', { name: 'Confirmar rechazo' })
    expect(confirmar.hasAttribute('disabled')).toBe(true)
    expect(screen.getByText('Escribe el motivo del rechazo.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Motivo del rechazo'), {
      target: { value: '  Está borroso  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar rechazo' }))
    await waitFor(() => {
      expect(llamadas.pedidos).toHaveLength(1)
    })
    expect(llamadas.pedidos[0]).toMatchObject({ estado: 'rechazado', motivo: 'Está borroso' })
  })

  it('un PT409 se dice en la fila y conserva el motivo escrito', async () => {
    llamadas.conflicto = true
    const releer = dibujar({ aprobar: true, subir: false })
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }))
    fireEvent.change(screen.getByLabelText('Motivo del rechazo'), { target: { value: 'Ilegible' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar rechazo' }))
    expect(await screen.findByText('Luis cambió este documento hace 1 min.')).toBeTruthy()
    const campo = screen.getByLabelText<HTMLInputElement>('Motivo del rechazo')
    expect(campo.value).toBe('Ilegible')
    fireEvent.click(screen.getByRole('button', { name: 'Recargar' }))
    expect(releer).toHaveBeenCalledOnce()
  })

  it('un documento aprobado no ofrece aprobar ni rechazar', () => {
    render(
      <AccionesDelDocumento
        documento={{ ...documento, estado: 'aprobado' }}
        tipo={tipo}
        contexto={{
          unidadId: 'u1',
          claves: { aprobar: true, subir: true },
          tipos: [tipo],
          releer: vi.fn(),
        }}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Aprobar' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Rechazar' })).toBeNull()
  })
})
