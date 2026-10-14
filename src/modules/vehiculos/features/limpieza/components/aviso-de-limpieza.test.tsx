// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LimpiezaDeVehiculo } from '../../../entities/limpieza'

vi.mock('../actions/conservar-vehiculo', () => ({ conservarVehiculo: vi.fn() }))
vi.mock('next-safe-action/hooks', () => ({
  useAction: () => ({ executeAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/shared/ui/toasts', () => ({ avisarError: vi.fn(), avisarExito: vi.fn() }))

const { AvisoDeLimpieza } = await import('./aviso-de-limpieza')

const base = {
  aplica: true,
  activa: true,
  diasGracia: 7,
  fecha: null,
  conservado: false,
  conservadoPorNombre: null,
  conservadoEn: null,
  conservadoPorMi: false,
} satisfies LimpiezaDeVehiculo

function aviso(limpieza: LimpiezaDeVehiculo | null, editable = true) {
  render(
    <AvisoDeLimpieza
      vehiculoId="00000000-0000-0000-0000-00000000000a"
      limpieza={limpieza}
      hoy="2026-10-14"
      zona="America/La_Paz"
      editable={editable}
    />,
  )
}

afterEach(cleanup)

describe('AvisoDeLimpieza', () => {
  it('a punto de irse: «Se limpiará el dd/mm» y Conservar', () => {
    aviso({ ...base, fecha: '2026-10-16' })
    expect(screen.getByText(/Se limpiará el 16\/10/)).toBeTruthy()
    const boton = screen.getByRole<HTMLButtonElement>('button', { name: 'Conservar' })
    expect(boton.disabled).toBe(false)
  })

  it('sin permiso de editar, Conservar se ve apagado y dice por qué', () => {
    aviso({ ...base, fecha: '2026-10-16' }, false)
    const boton = screen.getByRole<HTMLButtonElement>('button', { name: /Conservar/ })
    expect(boton.disabled).toBe(true)
    expect(boton.textContent).toContain('No tienes permiso para editar este vehículo.')
  })

  it('todavía lejos: una línea con la fecha, sin alarma', () => {
    aviso({ ...base, fecha: '2026-10-30' })
    expect(screen.getByText('Si nadie lo usa, se limpiará el 30/10')).toBeTruthy()
  })

  it('conservado: lo dice y ofrece Quitar', () => {
    aviso({
      ...base,
      conservado: true,
      conservadoPorNombre: 'Irene',
      conservadoEn: '2026-10-13T15:00:00Z',
    })
    expect(screen.getByText('Se conserva · lo marcó Irene el 13/10')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Quitar' })).toBeTruthy()
  })

  it('apagada, sin fecha o que no le toca: no dice nada', () => {
    aviso({ ...base, activa: false, fecha: '2026-10-16' })
    aviso({ ...base })
    aviso({ aplica: false })
    aviso(null)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByText(/limpiar/)).toBeNull()
  })
})
