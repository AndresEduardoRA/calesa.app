import { cleanup, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CabeceraDeLaGuardada } from './cabecera-de-la-guardada'
import { render } from './render-con-url.soporte'

vi.mock('../../revisiones/components/diferidos', () => ({
  PanelDeRevisionesDiferido: ({ abierto, numero }: { abierto: boolean; numero: number }) => (
    <div data-panel-de-revisiones={abierto ? 'abierto' : 'cerrado'}>Panel {numero}</div>
  ),
}))

const COTIZACION = '00000000-0000-4000-8000-0000000000aa'
const props = {
  id: COTIZACION,
  numero: 123,
  clase: 'preventa' as const,
  actualizadoEn: '2026-11-04T10:00:00.123456+00:00',
  version: 1,
  cadena: { anterior: null, encima: null, puedeCotizarEncima: false },
  venceEl: '2026-12-04',
  vencida: false,
  origen: 'Miami',
  cliente: null,
  vehiculo: null,
}

afterEach(cleanup)

describe('CabeceraDeLaGuardada: «Revisiones» (C1)', () => {
  it('el botón está para todo el que abre la página y abre el panel por su URL', () => {
    render(<CabeceraDeLaGuardada {...props} />)
    expect(document.querySelector('[data-panel-de-revisiones]')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Revisiones' }))
    expect(
      document
        .querySelector('[data-panel-de-revisiones]')
        ?.getAttribute('data-panel-de-revisiones'),
    ).toBe('abierto')
    expect(screen.getByText('Panel 123')).toBeTruthy()
  })

  it('recargar con ?panel=revisiones lo abre', () => {
    render(<CabeceraDeLaGuardada {...props} />, '?panel=revisiones')
    expect(
      document
        .querySelector('[data-panel-de-revisiones]')
        ?.getAttribute('data-panel-de-revisiones'),
    ).toBe('abierto')
  })
})

const OTRA = '00000000-0000-4000-8000-0000000000bb'
const NUEVA = '00000000-0000-4000-8000-0000000000cc'

describe('CabeceraDeLaGuardada: la cadena (C7)', () => {
  it('con la anterior visible: «Versión 2 de la n.º 120» con su enlace', () => {
    render(
      <CabeceraDeLaGuardada
        {...props}
        version={2}
        cadena={{
          anterior: { id: OTRA, numero: 120, version: 1 },
          encima: null,
          puedeCotizarEncima: false,
        }}
      />,
    )
    const enlace = screen.getByRole('link', { name: 'Versión 2 de la n.º 120' })
    expect(enlace.getAttribute('href')).toBe(`/cotizaciones/${OTRA}`)
  })

  it('con versión mayor que 1 y la anterior que no se ve: «Versión 3», sin enlace', () => {
    render(<CabeceraDeLaGuardada {...props} version={3} />)
    expect(screen.getByText('Versión 3')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /Versión/ })).toBeNull()
  })

  it('con la versión nueva visible: «Hay una versión nueva: n.º 130 (versión 2).» con su enlace', () => {
    render(
      <CabeceraDeLaGuardada
        {...props}
        cadena={{
          anterior: null,
          encima: { id: NUEVA, numero: 130, version: 2 },
          puedeCotizarEncima: false,
        }}
      />,
    )
    expect(screen.getByText(/Hay una versión nueva:/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'n.º 130 (versión 2)' }).getAttribute('href')).toBe(
      `/cotizaciones/${NUEVA}`,
    )
  })

  it('con la versión nueva oculta: sólo dice que existe, sin número ni enlace (P11)', () => {
    render(
      <CabeceraDeLaGuardada
        {...props}
        cadena={{ anterior: null, encima: { oculta: true }, puedeCotizarEncima: false }}
      />,
    )
    expect(screen.getByText('Hay una versión nueva que no puedes ver.')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /n\.º/ })).toBeNull()
  })

  it('sin anterior, en la versión 1 y sin nueva: nada de cadena', () => {
    render(<CabeceraDeLaGuardada {...props} />)
    expect(screen.queryByText(/Versión \d/)).toBeNull()
    expect(screen.queryByText(/Hay una versión nueva/)).toBeNull()
  })
})

// El contenedor de «Revisiones» y la fila de la cabecera que lo contiene.
function filaDeLaCabecera() {
  const contenedor = screen.getByRole('button', { name: 'Revisiones' }).closest('.ml-auto')
  const fila = contenedor?.parentElement
  if (!contenedor || !fila) throw new Error('No está la fila de la cabecera')
  return { contenedor, fila }
}

describe('CabeceraDeLaGuardada: las acciones (4.15-6b, C2)', () => {
  it('con `acciones`, van después de «Revisiones», en la misma fila y sin envoltorio', () => {
    render(<CabeceraDeLaGuardada {...props} acciones={<button>Acción de prueba</button>} />)
    const { contenedor, fila } = filaDeLaCabecera()
    const accion = screen.getByRole('button', { name: 'Acción de prueba' })
    expect(contenedor.nextElementSibling).toBe(accion)
    expect(accion.parentElement).toBe(fila)
  })

  it('sin `acciones`, la fila tiene los cuatro hijos de siempre y «Revisiones» es el último (C9)', () => {
    render(<CabeceraDeLaGuardada {...props} />)
    const { contenedor, fila } = filaDeLaCabecera()
    expect(fila.children).toHaveLength(4)
    expect(fila.lastElementChild).toBe(contenedor)
  })
})
