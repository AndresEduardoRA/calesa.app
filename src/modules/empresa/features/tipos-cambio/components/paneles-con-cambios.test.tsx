import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { salirSinPerder } from '@/shared/ui/salida-con-cambios'
import type { Moneda, TipoCambio } from '../../../entities/tipos-cambio'
import type { EdicionesDeTiposCambio } from '../hooks/use-tipos-cambio'
import { PanelMoneda } from './panel-moneda'
import { PanelNuevoTipoCambio } from './panel-nuevo-tipo-cambio'
import { PanelTipoCambio } from './panel-tipo-cambio'

afterEach(cleanup)

// Lo que usan los paneles de las ediciones; ninguno guarda en estas pruebas.
const ediciones = {
  enCurso: false,
  errores: {
    guardar: undefined,
    crear: undefined,
    guardarMoneda: undefined,
    crearMoneda: undefined,
  },
  guardar: vi.fn(),
  crear: vi.fn(),
  guardarMoneda: vi.fn(),
  crearMoneda: vi.fn(),
} as unknown as EdicionesDeTiposCambio

const bolivianos: Moneda = {
  codigo: 'BOB',
  nombre: 'Boliviano',
  simbolo: 'Bs',
  decimales: 2,
  activa: true,
  actualizadoEn: '2026-10-17T10:00:00.000Z',
}
const dolares: Moneda = { ...bolivianos, codigo: 'USD', nombre: 'Dólar', simbolo: '$' }
const oficial: TipoCambio = {
  id: 'tc-1',
  clave: 'oficial',
  nombre: 'Oficial',
  monedaDe: 'USD',
  monedaA: 'BOB',
  valor: 6.96,
  esDefault: false,
  activo: true,
  actualizadoEn: '2026-10-17T10:00:00.000Z',
}

// Lo que hace la acción de un aviso que sale de la pantalla: sigue directo, o pregunta en el pie del panel.
function pulsarAviso() {
  const salir = vi.fn()
  act(() => {
    salirSinPerder(salir)
  })
  return salir
}

const hayPregunta = () => screen.queryByText('Tienes cambios sin guardar.') !== null

describe('PanelTipoCambio', () => {
  function montar(puedeGestionar = true) {
    render(
      <PanelTipoCambio
        tipo={oficial}
        historial={[]}
        puedeGestionar={puedeGestionar}
        ediciones={ediciones}
        alCerrar={vi.fn()}
      />,
    )
  }

  it('sin tocar nada, el aviso sale directo', () => {
    montar()
    const salir = pulsarAviso()
    expect(salir).toHaveBeenCalledTimes(1)
    expect(hayPregunta()).toBe(false)
  })

  it('con el valor cambiado, pregunta en el pie', () => {
    montar()
    fireEvent.input(screen.getByLabelText(/^Valor/), { target: { value: '7,10' } })
    const salir = pulsarAviso()
    expect(salir).not.toHaveBeenCalled()
    expect(hayPregunta()).toBe(true)
  })

  it('con un interruptor cambiado, pregunta', () => {
    montar()
    fireEvent.click(screen.getByRole('switch', { name: /Activo/ }))
    pulsarAviso()
    expect(hayPregunta()).toBe(true)
  })

  it('sin permiso no hay nada escrito: no pregunta', () => {
    montar(false)
    const salir = pulsarAviso()
    expect(salir).toHaveBeenCalledTimes(1)
  })
})

describe('PanelMoneda', () => {
  function montar(moneda: Moneda | 'nueva') {
    render(
      <PanelMoneda
        moneda={moneda}
        monedaBase="BOB"
        puedeGestionar
        ediciones={ediciones}
        alCerrar={vi.fn()}
      />,
    )
  }

  it('una moneda que se edita, sin tocar, no pregunta; con el nombre cambiado, sí', () => {
    montar(dolares)
    expect(pulsarAviso()).toHaveBeenCalledTimes(1)
    fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: 'Dólar americano' } })
    expect(pulsarAviso()).not.toHaveBeenCalled()
    expect(hayPregunta()).toBe(true)
  })

  it('una moneda nueva con el código escrito pregunta', () => {
    montar('nueva')
    expect(pulsarAviso()).toHaveBeenCalledTimes(1)
    fireEvent.input(screen.getByLabelText(/Código/), { target: { value: 'EUR' } })
    pulsarAviso()
    expect(hayPregunta()).toBe(true)
  })
})

describe('PanelNuevoTipoCambio', () => {
  it('sin escribir no pregunta; con el nombre escrito, sí', () => {
    render(
      <PanelNuevoTipoCambio
        abierto
        monedas={[bolivianos, dolares]}
        monedaBase="BOB"
        ediciones={ediciones}
        alCerrar={vi.fn()}
      />,
    )
    expect(pulsarAviso()).toHaveBeenCalledTimes(1)
    fireEvent.input(screen.getByLabelText('Nombre'), { target: { value: 'Paralelo' } })
    expect(pulsarAviso()).not.toHaveBeenCalled()
    expect(hayPregunta()).toBe(true)
  })
})
