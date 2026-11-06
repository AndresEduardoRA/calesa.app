import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type OnUrlUpdateFunction } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PestanasEmpresa } from './pestanas-empresa'

const TRES = [
  { clave: 'empresa', titulo: 'Empresa' },
  { clave: 'monedas', titulo: 'Monedas' },
  { clave: 'integraciones', titulo: 'Integraciones' },
] as const

function dibujar(busqueda: string, pestanas: Parameters<typeof PestanasEmpresa>[0]['pestanas']) {
  const alCambiarLaUrl = vi.fn<OnUrlUpdateFunction>()
  render(
    <NuqsTestingAdapter searchParams={busqueda} onUrlUpdate={alCambiarLaUrl} hasMemory>
      <PestanasEmpresa pestanas={pestanas} />
    </NuqsTestingAdapter>,
  )
  return alCambiarLaUrl
}

const seleccionada = () =>
  screen
    .getAllByRole('tab')
    .filter((pestana) => pestana.getAttribute('aria-selected') === 'true')
    .map((pestana) => pestana.textContent)

afterEach(() => {
  cleanup()
})

describe('la barra de pestañas de Empresa', () => {
  it('dibuja las pestañas que recibe: una sola, «Serie», y está seleccionada', () => {
    dibujar('', [{ clave: 'serie', titulo: 'Serie' }])
    expect(screen.getAllByRole('tab').map((p) => p.textContent)).toEqual(['Serie'])
    expect(seleccionada()).toEqual(['Serie'])
  })

  it('con una clave que no es de ninguna, abre la primera', () => {
    dibujar('?seccion=otra', TRES)
    expect(seleccionada()).toEqual(['Empresa'])
  })

  it('elegir otra escribe su clave y limpia lo de la anterior; elegir la primera quita `seccion`', async () => {
    const alCambiarLaUrl = dibujar('?seccion=monedas&tc=x&moneda=y&panel=z', TRES)
    const ultima = () => alCambiarLaUrl.mock.calls.at(-1)?.[0].searchParams
    fireEvent.click(screen.getByRole('tab', { name: 'Integraciones' }))
    await waitFor(() => {
      expect(ultima()?.get('seccion')).toBe('integraciones')
    })
    expect(ultima()?.has('tc')).toBe(false)
    expect(ultima()?.has('moneda')).toBe(false)
    expect(ultima()?.has('panel')).toBe(false)

    fireEvent.click(await screen.findByRole('tab', { name: 'Empresa' }))
    await waitFor(() => {
      expect(ultima()?.has('seccion')).toBe(false)
    })
  })
})
