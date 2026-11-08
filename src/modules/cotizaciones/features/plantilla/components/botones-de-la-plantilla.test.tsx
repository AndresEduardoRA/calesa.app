import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BotonesDeLaPlantilla } from './botones-de-la-plantilla'

const HORA = '2026-11-07T15:00:00.123456+00:00'

afterEach(cleanup)

function montar(cambios: Partial<Parameters<typeof BotonesDeLaPlantilla>[0]> = {}) {
  const alPublicar = vi.fn()
  const alDescartar = vi.fn()
  render(
    <BotonesDeLaPlantilla
      esperada={HORA}
      hayCambios={false}
      ocupado={false}
      alPublicar={alPublicar}
      alDescartar={alDescartar}
      {...cambios}
    />,
  )
  return { alPublicar, alDescartar }
}

const publicar = () => screen.getByRole('button', { name: 'Publicar…' }) as HTMLButtonElement

describe('BotonesDeLaPlantilla', () => {
  it('con borrador y sin cambios, los dos llaman a su callback y no hay motivo', () => {
    const { alPublicar, alDescartar } = montar()
    expect(publicar().disabled).toBe(false)
    fireEvent.click(publicar())
    fireEvent.click(screen.getByRole('button', { name: 'Descartar borrador…' }))
    expect(alPublicar).toHaveBeenCalledTimes(1)
    expect(alDescartar).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/Guarda/)).toBeNull()
  })

  it('sin borrador «Publicar…» está apagado con su motivo a la vista y no hay «Descartar borrador…»', () => {
    montar({ esperada: null, hayCambios: true })
    expect(publicar().disabled).toBe(true)
    const motivo = screen.getByText('Guarda un borrador para poder publicarlo.')
    expect(publicar().getAttribute('aria-describedby')).toBe(motivo.id)
    expect(screen.queryByRole('button', { name: 'Descartar borrador…' })).toBeNull()
  })

  it('con cambios sin guardar «Publicar…» se apaga con su motivo, pero «Descartar borrador…» sigue', () => {
    montar({ hayCambios: true })
    expect(publicar().disabled).toBe(true)
    expect(screen.getByText('Guarda los cambios para poder publicarlos.')).toBeTruthy()
    expect(
      (screen.getByRole('button', { name: 'Descartar borrador…' }) as HTMLButtonElement).disabled,
    ).toBe(false)
  })

  it('ocupado (guardando, recargando o con un conflicto) apaga los dos', () => {
    montar({ ocupado: true })
    expect(publicar().disabled).toBe(true)
    expect(
      (screen.getByRole('button', { name: 'Descartar borrador…' }) as HTMLButtonElement).disabled,
    ).toBe(true)
  })
})
