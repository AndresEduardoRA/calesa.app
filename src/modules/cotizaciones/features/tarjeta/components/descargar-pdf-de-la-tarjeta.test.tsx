import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CodigoError, Resultado } from '@/shared/lib/errores'

const pedidos: { ruta: string; resolver: (r: Resultado<Blob>) => void }[] = []
vi.mock('../../../areas/tarjeta/composicion.client', () => ({
  pedirElPdf: (ruta: string) =>
    new Promise<Resultado<Blob>>((resolver) => {
      pedidos.push({ ruta, resolver })
    }),
}))

import { DescargarPdfDeLaTarjeta } from './descargar-pdf-de-la-tarjeta'

const ID = '00000000-0000-4000-8000-0000000000aa'

beforeEach(() => {
  pedidos.length = 0
  URL.createObjectURL = vi.fn(() => 'blob:prueba')
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('<DescargarPdfDeLaTarjeta>', () => {
  it('mientras pide dice «Descargando…» apagado y, al bajar, vuelve a «Descargar PDF»', async () => {
    render(<DescargarPdfDeLaTarjeta cotizacionId={ID} numero={3} />)
    fireEvent.click(screen.getByRole('button', { name: 'Descargar PDF' }))
    const bajando = screen.getByRole('button', { name: 'Descargando…' }) as HTMLButtonElement
    expect(bajando.disabled).toBe(true)
    pedidos[0]?.resolver({ ok: true, data: new Blob(['%PDF']) })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Descargar PDF' })).toBeTruthy()
    })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it.each<[CodigoError, string]>([
    ['no_encontrado', 'Esta cotización ya no está disponible.'],
    ['no_autenticado', 'Tu sesión ya no vale: vuelve a entrar.'],
    ['inesperado', 'No se pudo armar el PDF.'],
  ])('un fallo %s dice su texto con «Reintentar», que vuelve a pedir', async (codigo, texto) => {
    render(<DescargarPdfDeLaTarjeta cotizacionId={ID} numero={3} />)
    fireEvent.click(screen.getByRole('button', { name: 'Descargar PDF' }))
    pedidos[0]?.resolver({ ok: false, error: { codigo, mensaje: 'secreto de la ruta' } })
    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toBe(texto)
    })
    expect(screen.queryByText('secreto de la ruta')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(pedidos).toHaveLength(2)
  })
})
