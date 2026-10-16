import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ESPERA_DEL_REINTENTO_MS, MENSAJE_SIN_CONEXION, diferido } from './diferido'

function Hola({ nombre }: { nombre: string }) {
  return <p>Hola {nombre}</p>
}

// Vacía la cola de microtareas y avanza el reloj falso.
async function avanzar(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

function conRelojFalso() {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })
}

function Contador({ n }: { n: number }) {
  const [clics, setClics] = useState(0)
  return (
    <button
      type="button"
      onClick={() => {
        setClics((c) => c + 1)
      }}
    >
      {`clics ${String(clics)} de ${String(n)}`}
    </button>
  )
}

describe('diferido: cargar y fallar', () => {
  conRelojFalso()

  it('carga el código al montarse y dibuja el componente con sus props', async () => {
    const Perezoso = diferido(() => Promise.resolve(Hola))
    render(<Perezoso nombre="Ana" />)
    await avanzar(0)
    expect(screen.getByText('Hola Ana')).toBeTruthy()
  })

  it('acepta un módulo con default y muestra el esqueleto mientras llega', async () => {
    let entregar: (modulo: { default: typeof Hola }) => void = () => {}
    const Perezoso = diferido(
      () => new Promise<{ default: typeof Hola }>((listo) => (entregar = listo)),
      { esqueleto: <p>Cargando…</p> },
    )
    render(<Perezoso nombre="Ana" />)
    await avanzar(0)
    expect(screen.getByText('Cargando…')).toBeTruthy()
    entregar({ default: Hola })
    await avanzar(0)
    expect(screen.getByText('Hola Ana')).toBeTruthy()
  })

  it('un corte pasajero se arregla solo con el reintento', async () => {
    const cargar = vi
      .fn<() => Promise<typeof Hola>>()
      .mockRejectedValueOnce(new Error('sin red'))
      .mockResolvedValue(Hola)
    const Perezoso = diferido(cargar)
    render(<Perezoso nombre="Ana" />)
    await avanzar(ESPERA_DEL_REINTENTO_MS)
    expect(cargar).toHaveBeenCalledTimes(2)
    expect(screen.getByText('Hola Ana')).toBeTruthy()
  })

  it('sin red dice «Sin conexión» ahí mismo, sin tumbar nada, y «Reintentar» lo pide de nuevo', async () => {
    const cargar = vi.fn<() => Promise<typeof Hola>>().mockRejectedValue(new Error('sin red'))
    const Perezoso = diferido(cargar)
    render(
      <div>
        <p>Lo de afuera</p>
        <Perezoso nombre="Ana" />
      </div>,
    )
    await avanzar(ESPERA_DEL_REINTENTO_MS)
    expect(screen.getByRole('alert').textContent).toContain(MENSAJE_SIN_CONEXION)
    expect(screen.getByText('Lo de afuera')).toBeTruthy()
    expect(cargar).toHaveBeenCalledTimes(2)

    cargar.mockResolvedValue(Hola)
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await avanzar(0)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByText('Hola Ana')).toBeTruthy()
  })
})

describe('diferido: estado y caché', () => {
  conRelojFalso()

  it('al volver a dibujarse tras cargar, el componente conserva su estado', async () => {
    const Perezoso = diferido(() => Promise.resolve(Contador))
    const { rerender } = render(<Perezoso n={1} />)
    await avanzar(0)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByText('clics 1 de 1')).toBeTruthy()
    rerender(<Perezoso n={2} />)
    expect(screen.getByText('clics 1 de 2')).toBeTruthy()
  })

  it('una vez cargado no vuelve a pedir el código ni a suspender', async () => {
    const cargar = vi.fn<() => Promise<typeof Hola>>().mockResolvedValue(Hola)
    const Perezoso = diferido(cargar, { esqueleto: <p>Cargando…</p> })
    const primera = render(<Perezoso nombre="Ana" />)
    await avanzar(0)
    primera.unmount()
    render(<Perezoso nombre="Berta" />)
    expect(screen.getByText('Hola Berta')).toBeTruthy()
    expect(screen.queryByText('Cargando…')).toBeNull()
    expect(cargar).toHaveBeenCalledTimes(1)
  })
})
