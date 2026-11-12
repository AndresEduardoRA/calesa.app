import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DocumentoDeLaUnidad } from '../../../entities/documentos/documento'
import { ConfirmarEliminarDocumento } from './confirmar-eliminar-documento'

const documento = {
  id: '44444444-4444-4444-8444-444444444444',
  nombre: 'bl.pdf',
  actualizadoEn: '2026-11-12T00:00:00Z',
} as DocumentoDeLaUnidad

const MENSAJE = 'La fase «Puerto» exige este documento. Sube el reemplazo antes de quitarlo.'

afterEach(cleanup)

describe('ConfirmarEliminarDocumento', () => {
  it('el rechazo de la fase se ve tal cual dentro del diálogo y no lo cierra', async () => {
    const eliminar = vi.fn().mockResolvedValue({ codigo: 'regla', mensaje: MENSAJE })
    const alCerrar = vi.fn()
    render(
      <ConfirmarEliminarDocumento
        documento={documento}
        abierto
        eliminar={eliminar}
        alCerrar={alCerrar}
      />,
    )
    expect(screen.getByText('Eliminar «bl.pdf»')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar documento' }))
    expect(await screen.findByText(MENSAJE)).toBeTruthy()
    expect(eliminar).toHaveBeenCalledWith(documento)
    expect(alCerrar).not.toHaveBeenCalled()
  })

  it('si se eliminó, el diálogo se cierra', async () => {
    const alCerrar = vi.fn()
    render(
      <ConfirmarEliminarDocumento
        documento={documento}
        abierto
        eliminar={vi.fn().mockResolvedValue(null)}
        alCerrar={alCerrar}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar documento' }))
    await waitFor(() => {
      expect(alCerrar).toHaveBeenCalledOnce()
    })
  })
})
