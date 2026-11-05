import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ResultadoDeEncima } from '../../../entities/resultado-de-encima'
import { hojaDeUnaGuardadaDesde } from '../../../entities/hoja-de-una-guardada-lectura'
import { crudaDeUnaGuardada } from '../../../entities/hoja-de-una-guardada.soporte'

const { cotizar, estado } = vi.hoisted(() => ({
  cotizar: vi.fn(),
  estado: { resultado: null as unknown },
}))
vi.mock('../hooks/use-cotizar-encima', () => ({
  useCotizarEncima: () => ({
    enviando: false,
    resultado: estado.resultado as ResultadoDeEncima | null,
    cotizar,
    recargar: () => {},
  }),
}))

import { AvisoDeVersion } from './aviso-de-version'

const OTRA_FORMULA = '00000000-0000-4000-8000-0000000000ff'
const hoja = (mas: Record<string, unknown> = {}) => {
  const leida = hojaDeUnaGuardadaDesde(
    crudaDeUnaGuardada({
      publicada: { id: OTRA_FORMULA, version: 5 },
      puede_cotizar_encima: true,
      ...mas,
    }),
  )
  if (!leida) {
    throw new Error('La hoja de prueba no se leyó.')
  }
  return leida
}
const boton = () => screen.getByRole('button', { name: 'Cotizar encima' })
const AVISO_DE_CAMBIOS =
  'Guarda o descarta tus cambios antes de cotizar encima: la versión nueva lleva lo guardado.'

afterEach(() => {
  cleanup()
  cotizar.mockReset()
  estado.resultado = null
})

describe('AvisoDeVersion (C8, C9)', () => {
  it('dice la versión y ofrece «Cotizar encima» encendido sin cambios sin guardar', () => {
    render(<AvisoDeVersion hoja={hoja()} hayCambios={false} />)
    expect(screen.getByRole('status').textContent).toContain(
      'Esta cotización usa la versión 3; la de hoy es la 5.',
    )
    expect(boton().getAttribute('aria-disabled')).toBeNull()
    fireEvent.click(boton())
    expect(cotizar).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(AVISO_DE_CAMBIOS)).toBeNull()
  })

  it('con cambios sin guardar el botón queda apagado, dice por qué y no envía', () => {
    render(<AvisoDeVersion hoja={hoja()} hayCambios />)
    expect(boton().getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByText(AVISO_DE_CAMBIOS)).toBeTruthy()
    fireEvent.click(boton())
    expect(cotizar).not.toHaveBeenCalled()
  })

  it('sin puede_cotizar_encima el aviso va sin botón', () => {
    render(<AvisoDeVersion hoja={hoja({ puede_cotizar_encima: false })} hayCambios={false} />)
    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Cotizar encima' })).toBeNull()
  })

  it('vigente y en la versión de hoy: no se dibuja nada', () => {
    const { container } = render(
      <AvisoDeVersion
        hoja={hoja({ publicada: { id: '00000000-0000-0000-0000-000000000001', version: 3 } })}
        hayCambios={false}
      />,
    )
    expect(container.textContent).toBe('')
  })

  it('vencida: la línea de vencida y el botón', () => {
    render(
      <AvisoDeVersion
        hoja={hoja({
          publicada: { id: '00000000-0000-0000-0000-000000000001', version: 3 },
          vencida: true,
        })}
        hayCambios={false}
      />,
    )
    expect(screen.getByText('Esta cotización está vencida.')).toBeTruthy()
    expect(boton()).toBeTruthy()
  })

  it('«Reintentar» tras una pérdida también espera si hay cambios sin guardar', () => {
    estado.resultado = { tipo: 'perdida' }
    const { rerender } = render(<AvisoDeVersion hoja={hoja()} hayCambios={false} />)
    const reintentar = screen.getByRole('button', { name: 'Reintentar' })
    expect(reintentar.getAttribute('aria-disabled')).toBeNull()
    fireEvent.click(reintentar)
    expect(cotizar).toHaveBeenCalledTimes(1)
    rerender(<AvisoDeVersion hoja={hoja()} hayCambios />)
    expect(screen.getByRole('button', { name: 'Reintentar' }).getAttribute('aria-disabled')).toBe(
      'true',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(cotizar).toHaveBeenCalledTimes(1)
  })
})
