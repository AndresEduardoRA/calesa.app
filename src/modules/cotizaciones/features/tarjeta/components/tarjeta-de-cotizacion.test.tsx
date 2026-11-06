import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { tarjetaDesde } from '../../../entities/tarjeta/lectura-de-la-tarjeta'
import {
  modeloDeLaTarjeta,
  type ModeloDeTarjeta,
  type PaginaDeLaTarjeta,
} from '../../../entities/tarjeta/modelo-de-la-tarjeta'
import { calculoDePrueba, crudaDeLaTarjeta } from '../../../entities/tarjeta/tarjeta.soporte'
import { TarjetaDeCotizacion } from './tarjeta-de-cotizacion'

afterEach(cleanup)

const pagina: PaginaDeLaTarjeta = {
  fecha: '6 nov 2026',
  vehiculo: 'Toyota Hilux 2020',
  asesor: 'Ana Pérez',
  numero: 41,
  vencida: true,
  logo: { nombre: 'Importadora', url: 'https://x.test/logo.webp' },
}

function modelo(
  mas: Record<string, unknown> = {},
  calculo = calculoDePrueba(),
  p = pagina,
): ModeloDeTarjeta {
  const lectura = tarjetaDesde(crudaDeLaTarjeta(mas))
  if (lectura === null) {
    throw new Error('la tarjeta de prueba no se lee')
  }
  return modeloDeLaTarjeta({ lectura, calculo, monedaBs: 'BOB', pagina: p })
}

describe('<TarjetaDeCotizacion>', () => {
  it('dibuja los grupos en el orden de la lectura, cada uno con su data-tono', () => {
    const { container } = render(<TarjetaDeCotizacion modelo={modelo()} />)
    const grupos = [...container.querySelectorAll('[data-grupo-de-la-tarjeta]')]
    expect(grupos.map((g) => g.getAttribute('data-grupo-de-la-tarjeta'))).toEqual([
      'compra',
      'logistica',
      'aduana',
    ])
    expect(grupos.map((g) => g.getAttribute('data-tono'))).toEqual(['verde', 'amarillo', 'naranja'])
  })

  it('el tipo de cambio y el plazo van una vez por grupo; el plazo nulo es «—»', () => {
    const { container } = render(<TarjetaDeCotizacion modelo={modelo()} />)
    expect(container.querySelectorAll('[data-tipo-de-cambio]')).toHaveLength(3)
    const plazos = [...container.querySelectorAll('[data-plazo]')].map((p) => p.textContent)
    expect(plazos).toEqual(['Plazo48 horas', 'Plazo15 días', 'Plazo—'])
    const compra = container.querySelector('[data-grupo-de-la-tarjeta=compra]')
    expect(compra?.querySelector('[data-tipo-de-cambio]')?.textContent).toContain('Dólar oficial')
  })

  it('con el modo elegido dice los nombres de ese modo', () => {
    const { container } = render(
      <TarjetaDeCotizacion modelo={modelo({}, calculoDePrueba({ modoTc: 'bcb' }))} />,
    )
    const nombres = [...container.querySelectorAll('[data-tipo-de-cambio]')].map(
      (n) => n.textContent,
    )
    expect(nombres.every((n) => n.includes('Dólar BCB'))).toBe(true)
  })

  it('sin las columnas de la plantilla no hay celdas combinadas', () => {
    const { container } = render(
      <TarjetaDeCotizacion
        modelo={modelo({ columnas: { leyenda: false, tipo_cambio: false, plazo: false } })}
      />,
    )
    expect(container.querySelector('[data-tipo-de-cambio]')).toBeNull()
    expect(container.querySelector('[data-plazo]')).toBeNull()
    expect(screen.queryByText('Precio de subasta')).toBeNull()
  })

  it('todo monto pasa por <Monto>: cada valor, el total y lo aparte', () => {
    const { container } = render(<TarjetaDeCotizacion modelo={modelo()} />)
    // 3 filas + el total + la garantía de lo aparte.
    expect(container.querySelectorAll('[data-monto]')).toHaveLength(5)
    const total = container.querySelector('[data-total-de-la-tarjeta]')
    expect(total?.querySelector('[data-total-usd] [data-monto]')).not.toBeNull()
    expect(total?.textContent).toContain('GARANTÍA PARA LA PARTICIPACIÓN')
  })

  it('el total en Bs sólo con «Ver total Bs»', () => {
    const sin = render(<TarjetaDeCotizacion modelo={modelo()} />)
    expect(sin.container.querySelector('[data-total-bs-de-la-tarjeta]')).toBeNull()
    cleanup()
    const con = render(
      <TarjetaDeCotizacion modelo={modelo({}, calculoDePrueba({ verTotalBs: true }))} />,
    )
    expect(con.container.querySelector('[data-total-bs-de-la-tarjeta] [data-monto]')).not.toBeNull()
  })
})

describe('<TarjetaDeCotizacion>: encabezado y por omisión', () => {
  it('el encabezado: título de la variante, fecha, número, vencida, asesor, banda, nota y logo', () => {
    render(<TarjetaDeCotizacion modelo={modelo()} />)
    expect(screen.getByRole('heading', { name: 'Gasolina' })).toBeTruthy()
    expect(screen.getByText('6 nov 2026')).toBeTruthy()
    expect(screen.getByText(/Cotización n\.º 41/)).toBeTruthy()
    expect(screen.getByText('Vencida')).toBeTruthy()
    expect(screen.getByText('Asesor: Ana Pérez')).toBeTruthy()
    expect(screen.getByText('Toyota Hilux 2020')).toBeTruthy()
    expect(screen.getByText('Precios sujetos a cambio.')).toBeTruthy()
  })

  it('la hoja nueva no lleva número ni «Vencida»; sin asesor o vehículo no hay líneas vacías', () => {
    render(
      <TarjetaDeCotizacion
        modelo={modelo({}, calculoDePrueba(), {
          ...pagina,
          numero: null,
          vencida: false,
          asesor: null,
          vehiculo: null,
        })}
      />,
    )
    expect(screen.queryByText(/Cotización n\.º/)).toBeNull()
    expect(screen.queryByText('Vencida')).toBeNull()
    expect(screen.queryByText(/Asesor:/)).toBeNull()
    expect(screen.queryByText('Toyota Hilux 2020')).toBeNull()
  })

  it('por omisión: sólo el total, con «Total»', () => {
    const lectura = tarjetaDesde({ estado: 'sin_plantilla' })
    if (lectura === null) {
      throw new Error('no se lee')
    }
    const m = modeloDeLaTarjeta({ lectura, calculo: calculoDePrueba(), monedaBs: 'BOB', pagina })
    const { container } = render(<TarjetaDeCotizacion modelo={m} />)
    expect(container.querySelector('[data-por-omision]')).not.toBeNull()
    expect(container.querySelector('[data-grupo-de-la-tarjeta]')).toBeNull()
    const total = container.querySelector('[data-total-de-la-tarjeta]')
    expect(within(total as HTMLElement).getByText('Total')).toBeTruthy()
  })
})
