import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fallo, ok } from '@/shared/lib/errores'
import type { RecalculoInicial } from '../../../entities/apertura'
import { hojaDePrueba, respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import type { PedidoDeRecalculo } from '../../../entities/pedido-de-recalculo'
import { HojaDeCotizar } from './hoja-de-cotizar'

const recalcular = vi.hoisted(() => vi.fn())
const refrescar = vi.hoisted(() => vi.fn())
vi.mock('../../../composicion.client', () => ({ recalcular }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: refrescar }) }))

const AL_DIA: RecalculoInicial = {
  respuesta: respuestaDePrueba({
    usd: 2350,
    valores: { remate: 0 },
    estados: { remate: 'activo', cuenta_esp: 'condicion_apagada', solo_moto: 'fuera_de_variante' },
  }),
  estado: { tipo: 'al_dia' },
}

const montar = (inicial: RecalculoInicial = AL_DIA, vehiculoId: string | null = null) =>
  render(
    <HojaDeCotizar
      hoja={hojaDePrueba()}
      inicial={inicial}
      vehiculoId={vehiculoId}
      vehiculoSoltado={false}
    />,
  )

const nodos = (c: HTMLElement) =>
  [...c.querySelectorAll('[data-nodo]')].map((e) => e.getAttribute('data-nodo'))
const total = () => screen.getByText((_, e) => e?.hasAttribute('data-total') === true)

// Tipea un número en la celda de un nodo, como una persona: abre, escribe y confirma con Enter.
function tipear(nodo: string, texto: string) {
  const celda = document.querySelector(`[data-nodo="${nodo}"] [data-parada="0"]`)
  if (!celda) {
    throw new Error(`No hay la celda ${nodo}`)
  }
  fireEvent.click(celda)
  const entrada = document.querySelector<HTMLInputElement>(`[data-nodo="${nodo}"] input`)
  if (!entrada) {
    throw new Error('No se abrió la edición')
  }
  fireEvent.change(entrada, { target: { value: texto } })
  fireEvent.keyDown(entrada, { key: 'Enter' })
}

const avanzar = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })

beforeEach(() => {
  vi.useFakeTimers()
  recalcular.mockReset()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('HojaDeCotizar: la hoja dibujada desde el diseño', () => {
  it('dibuja los ítems en el orden declarado; la garantía (una bandera de «muestra» apagada) no se dibuja', () => {
    const { container } = montar()
    expect(nodos(container)).toEqual([
      'variante',
      'cuenta',
      'mostrar_garantia',
      'remate',
      'fees',
      'transferencia',
      'seguro',
      'cuenta_esp',
      'sin_bandera',
      'solo_moto',
      'iva_c',
      'tc',
      'factor',
      'del_vehiculo',
      'de_nivel',
      'cif',
    ])
    expect(container.querySelector('[data-atajos="factor"]')).not.toBeNull()
  })

  it('encender el interruptor de «muestra» dibuja la celda, y se pide un recálculo', async () => {
    recalcular.mockResolvedValue(ok(respuestaDePrueba()))
    const { container } = montar()
    fireEvent.click(screen.getByRole('switch', { name: 'Mostrar garantía' }))
    expect(nodos(container)).toContain('garantia')
    await avanzar(150)
    expect(recalcular).toHaveBeenCalledOnce()
    const pedido = recalcular.mock.calls[0]?.[0] as PedidoDeRecalculo
    expect(pedido.entradas.banderas).toEqual({ mostrar_garantia: true })
    expect(pedido.modoTc).toBeNull()
  })

  it('el candado dice su motivo y el estado del recálculo manda: la celda apagada dice con qué se habilita', () => {
    montar()
    const cuentaEsp = within(document.querySelector('[data-nodo="cuenta_esp"]') as HTMLElement)
    expect(cuentaEsp.getByText('Se habilita con «Cuenta especial».')).toBeTruthy()
    const soloMoto = within(document.querySelector('[data-nodo="solo_moto"]') as HTMLElement)
    expect(soloMoto.getByText('Sólo en Moto.')).toBeTruthy()
    const vehiculo = within(document.querySelector('[data-nodo="del_vehiculo"]') as HTMLElement)
    expect(vehiculo.getByText('Viene del vehículo.')).toBeTruthy()
  })
})

describe('HojaDeCotizar: tipear y recalcular', () => {
  it('tipear un monto sin separador de miles pide UN recálculo 150 ms después con lo tipeado, y el total sale de la respuesta', async () => {
    recalcular.mockResolvedValue(ok(respuestaDePrueba({ usd: 9876 })))
    montar()
    tipear('remate', '9500')
    expect(recalcular).not.toHaveBeenCalled()
    await avanzar(149)
    expect(recalcular).not.toHaveBeenCalled()
    await avanzar(1)
    expect(recalcular).toHaveBeenCalledOnce()
    const pedido = recalcular.mock.calls[0]?.[0] as PedidoDeRecalculo
    expect(pedido.entradas.inputs).toEqual({ remate: 9500 })
    expect(pedido.origenId).toBe('00000000-0000-0000-0000-000000000001')
    expect(total().textContent).toContain('9.876')
  })

  it('lo tipeado se sigue viendo mientras se recalcula', async () => {
    recalcular.mockReturnValue(new Promise(() => undefined))
    montar()
    tipear('remate', '9500')
    await avanzar(150)
    const celda = document.querySelector('[data-nodo="remate"] [data-parada="0"]')
    expect(celda?.textContent).toMatch(/9\.500/)
  })

  it('mientras recalcula, el total se marca desactualizado; al volver, deja de estarlo', async () => {
    let soltar: (v: unknown) => void = () => undefined
    recalcular.mockReturnValue(new Promise((r) => (soltar = r)))
    montar()
    tipear('remate', '9500')
    await avanzar(150)
    const resumen = screen.getByLabelText('Resumen')
    expect(resumen.getAttribute('data-viejo')).toBe('true')
    expect(resumen.getAttribute('aria-busy')).toBe('true')
    expect(within(resumen).getByText('Total desactualizado.')).toBeTruthy()
    await act(async () => {
      soltar(ok(respuestaDePrueba({ usd: 5 })))
      await Promise.resolve()
    })
    expect(resumen.getAttribute('data-viejo')).toBe('false')
    expect(within(resumen).queryByText('Total desactualizado.')).toBeNull()
  })
})

describe('HojaDeCotizar: cuando el recálculo falla', () => {
  it('un recálculo que falla dice «No se pudo recalcular» con «Reintentar», conserva lo tipeado y no deja el total por bueno', async () => {
    recalcular.mockResolvedValueOnce(fallo('inesperado', 'x'))
    montar()
    tipear('remate', '9500')
    await avanzar(150)
    const resumen = screen.getByLabelText('Resumen')
    expect(within(resumen).getByText('No se pudo recalcular.')).toBeTruthy()
    expect(within(resumen).getByText('Total desactualizado.')).toBeTruthy()
    expect(document.querySelector('[data-nodo="remate"] [data-parada="0"]')?.textContent).toMatch(
      /9\.500/,
    )
    recalcular.mockResolvedValueOnce(ok(respuestaDePrueba({ usd: 42 })))
    await act(async () => {
      fireEvent.click(within(resumen).getByRole('button', { name: 'Reintentar' }))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(recalcular).toHaveBeenCalledTimes(2)
    expect(within(resumen).queryByText('No se pudo recalcular.')).toBeNull()
    expect(total().textContent).toContain('42')
  })

  it('si la fórmula cambió (regla rota) ofrece «Recargar», que vuelve a leer la hoja', async () => {
    recalcular.mockResolvedValueOnce(fallo('regla', 'x'))
    montar()
    tipear('remate', '9500')
    await avanzar(150)
    fireEvent.click(screen.getByRole('button', { name: 'Recargar' }))
    expect(refrescar).toHaveBeenCalledOnce()
  })

  it('un primer cálculo que falló nace en «No se pudo recalcular» y sin total', () => {
    montar({ respuesta: null, estado: { tipo: 'fallo', recargar: false } })
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy()
    expect(total().textContent).toBe('—')
  })

  it('una variante sin elección por defecto pide elegir antes de calcular, y al elegir calcula con ella', async () => {
    recalcular.mockResolvedValue(ok(respuestaDePrueba({ usd: 300 })))
    montar({ respuesta: null, estado: { tipo: 'sin_variante' } })
    expect(screen.getByText('Elige variante para calcular.')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Moto'))
    await avanzar(150)
    expect((recalcular.mock.calls[0]?.[0] as PedidoDeRecalculo).entradas.variante).toBe('moto')
    expect(total().textContent).toContain('300')
  })

  it('sin total porque algo falta, lo dice sin nombrar nada que la hoja no muestre', () => {
    montar({
      respuesta: respuestaDePrueba({ usd: null, hayFaltantesOcultos: true }),
      estado: { tipo: 'al_dia' },
    })
    expect(screen.getByText('Sin total: Falta un dato que esta hoja no muestra.')).toBeTruthy()
  })
})

describe('HojaDeCotizar: avisos y atajos', () => {
  it('el aviso del vehículo: el ajuste lo pide y no hay', () => {
    const hoja = hojaDePrueba()
    render(
      <HojaDeCotizar
        hoja={{ ...hoja, vehiculoObligatorio: true }}
        inicial={AL_DIA}
        vehiculoId={null}
        vehiculoSoltado={false}
      />,
    )
    expect(screen.getByText('Este origen pide un vehículo para guardar.')).toBeTruthy()
  })

  it('si el rol puede cotizar pero no ve nada de la hoja, lo dice en vez de dibujar una hoja vacía con un total', () => {
    render(
      <HojaDeCotizar
        hoja={{ ...hojaDePrueba(), secciones: [] }}
        inicial={AL_DIA}
        vehiculoId={null}
        vehiculoSoltado={false}
      />,
    )
    expect(screen.getByText('No puedes ver esta hoja')).toBeTruthy()
    expect(document.querySelector('[data-hoja]')).toBeNull()
  })

  it('un vehículo de la URL que no se pudo usar se dice', () => {
    render(
      <HojaDeCotizar hoja={hojaDePrueba()} inicial={AL_DIA} vehiculoId={null} vehiculoSoltado />,
    )
    expect(screen.getByText('No se puede usar ese vehículo.')).toBeTruthy()
  })

  it('un chip de los atajos pone el valor en la celda y queda pulsado; con un valor repetido, sólo ése', async () => {
    recalcular.mockResolvedValue(ok(respuestaDePrueba()))
    montar()
    const chips = within(screen.getByLabelText('Atajos de FACTOR')).getAllByRole('button')
    expect((chips[2] as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(chips[1] as HTMLElement)
    expect(chips.map((c) => c.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false'])
    await avanzar(150)
    expect((recalcular.mock.calls[0]?.[0] as PedidoDeRecalculo).entradas.overrides).toEqual({
      factor: 0.328,
    })
  })
})
