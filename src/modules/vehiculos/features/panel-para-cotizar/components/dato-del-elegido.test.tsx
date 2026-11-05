import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { DatoParaElegir, OpcionesDelDato } from '../../../entities/dato-para-elegir'

const ejecutar = vi.fn()
let pendiente = false
vi.mock('next-safe-action/hooks', () => ({
  useAction: () => ({ executeAsync: ejecutar, isPending: pendiente }),
}))
vi.mock('../actions/guardar-dato-del-vehiculo', () => ({ guardarDatoDelVehiculo: {} }))
const avisarError = vi.fn()
vi.mock('@/shared/ui/toasts', () => ({ avisarError: (e: unknown) => avisarError(e) }))

const { DatoDelElegido } = await import('./dato-del-elegido')

const ID = '00000000-0000-4000-8000-000000000001'
const VERSION = '2026-10-30T10:00:00.000001Z'
const DATO: DatoParaElegir = {
  campo: 'tipo_vehiculo',
  valor: null,
  tablas: [{ tabla: 'transporte', columna: 'tipo' }],
}
const OPCIONES: OpcionesDelDato = {
  etiqueta: 'Tipo de vehículo',
  opciones: ['autos', 'motos'],
  hayMas: false,
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  pendiente = false
})

function montar({
  dato = DATO,
  editable = true,
  leer = vi.fn(() => Promise.resolve(ok(OPCIONES) as Resultado<OpcionesDelDato>)),
  alGuardado = vi.fn(),
}: {
  dato?: DatoParaElegir
  editable?: boolean
  leer?: () => Promise<Resultado<OpcionesDelDato>>
  alGuardado?: () => void
} = {}) {
  const vista = render(
    <DatoDelElegido
      vehiculoId={ID}
      version={VERSION}
      editable={editable}
      dato={dato}
      leerOpciones={leer}
      alGuardado={alGuardado}
    />,
  )
  return { ...vista, leer, alGuardado }
}

const grupo = () => screen.getByRole('group', { name: 'Tipo de vehículo' })

describe('DatoDelElegido: el dato del vehículo se elige entre las filas de la tabla', () => {
  it('mientras lee, un esqueleto; después, un botón por opción y el aviso de que no tiene el dato', async () => {
    const { container, leer } = montar()
    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull()
    expect(leer).toHaveBeenCalledWith(DATO.tablas)
    await waitFor(() => {
      expect(within(grupo()).getByRole('button', { name: 'autos' })).toBeTruthy()
    })
    expect(within(grupo()).getAllByRole('button')).toHaveLength(2)
    expect(screen.getByText('El vehículo no tiene este dato: elige uno.')).toBeTruthy()
  })

  it('la que coincide va marcada; con un valor que no está, lo dice', async () => {
    montar({ dato: { ...DATO, valor: 'motos' } })
    const motos = await screen.findByRole('button', { name: 'motos' })
    expect(motos.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'autos' }).getAttribute('aria-pressed')).toBe('false')
    cleanup()
    montar({ dato: { ...DATO, valor: 'AUTOMOBILE' } })
    expect(
      await screen.findByText('El vehículo dice «AUTOMOBILE», que no está en la tabla: elige uno.'),
    ).toBeTruthy()
  })

  it('un error dice que no pudo leer y «Reintentar» vuelve a leer', async () => {
    const leer = vi
      .fn<() => Promise<Resultado<OpcionesDelDato>>>()
      .mockResolvedValueOnce(fallo('inesperado', 'sin red'))
      .mockResolvedValueOnce(ok(OPCIONES))
    montar({ leer })
    expect(await screen.findByText('No pudimos leer las opciones.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await screen.findByRole('button', { name: 'autos' })).toBeTruthy()
    expect(leer).toHaveBeenCalledTimes(2)
  })

  it('sin filas, lo dice; con `hayMas`, avisa del tope de la lectura', async () => {
    montar({ leer: () => Promise.resolve(ok({ ...OPCIONES, opciones: [] })) })
    expect(
      await screen.findByText(
        'La tabla no tiene filas para elegir. Pídele a quien configura el cotizador que las cargue.',
      ),
    ).toBeTruthy()
    cleanup()
    montar({ leer: () => Promise.resolve(ok({ ...OPCIONES, hayMas: true })) })
    expect(
      await screen.findByText('Se muestran las opciones de las primeras 1.000 filas.'),
    ).toBeTruthy()
  })

  it('con 60 opciones dibuja 50, el buscador y el aviso; buscar acota', async () => {
    const opciones = Array.from({ length: 60 }, (_, i) => `op_${String(i).padStart(2, '0')}`)
    montar({ leer: () => Promise.resolve(ok({ ...OPCIONES, opciones })) })
    const buscar = await screen.findByRole('searchbox', { name: 'Buscar en las opciones' })
    expect(within(grupo()).getAllByRole('button')).toHaveLength(50)
    expect(screen.getByText('Se muestran 50. Escribe para acotar.')).toBeTruthy()
    fireEvent.change(buscar, { target: { value: 'op_57' } })
    expect(
      within(grupo())
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['op_57'])
  })
})

describe('DatoDelElegido: quién elige y qué pasa al elegir', () => {
  it('quien no puede editar ve sólo el texto, sin botones', async () => {
    montar({ editable: false, dato: { ...DATO, valor: 'autos' } })
    expect(await screen.findByText('Tipo de vehículo: autos')).toBeTruthy()
    expect(screen.getByText('Lo elige quien puede editar este vehículo.')).toBeTruthy()
    expect(within(grupo()).queryAllByRole('button')).toHaveLength(0)
    cleanup()
    montar({ editable: false, dato: { ...DATO, valor: 'AUTOMOBILE' } })
    expect(
      await screen.findByText('Tipo de vehículo: AUTOMOBILE (no está en la tabla)'),
    ).toBeTruthy()
  })

  it('pulsar guarda el dato con la versión y, si sale bien, avisa al panel', async () => {
    ejecutar.mockResolvedValue({ data: ok({ actualizadoEn: 'otra' }) })
    const { alGuardado } = montar()
    fireEvent.click(await screen.findByRole('button', { name: 'autos' }))
    await waitFor(() => {
      expect(alGuardado).toHaveBeenCalledTimes(1)
    })
    expect(ejecutar).toHaveBeenCalledWith({
      id: ID,
      actualizadoEnEsperado: VERSION,
      campo: 'tipo_vehiculo',
      valor: 'autos',
    })
  })

  it('un conflicto avisa con su mensaje y el panel queda como estaba', async () => {
    const error = { codigo: 'conflicto', mensaje: 'Ana cambió este vehículo hace un momento.' }
    ejecutar.mockResolvedValue({ data: { ok: false, error } })
    const { alGuardado } = montar()
    fireEvent.click(await screen.findByRole('button', { name: 'autos' }))
    await waitFor(() => {
      expect(avisarError).toHaveBeenCalledWith(error)
    })
    expect(alGuardado).not.toHaveBeenCalled()
  })

  it('mientras guarda, los botones se apagan', async () => {
    pendiente = true
    montar()
    const autos = await screen.findByRole('button', { name: 'autos' })
    expect((autos as HTMLButtonElement).disabled).toBe(true)
  })
})
