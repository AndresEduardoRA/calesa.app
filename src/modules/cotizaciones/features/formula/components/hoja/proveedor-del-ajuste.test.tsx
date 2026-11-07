import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AL_DIA,
  hojaConAjustes,
  QUIETO,
} from '../../../hoja/components/hoja-de-cotizar-ajuste.soporte'
import type { HojaLista } from '../../../../entities/hoja'
import { HojaDeCotizar } from '../../../hoja/components/hoja-de-cotizar'
import {
  leido,
  ORIGEN,
  pedidos,
  reiniciar,
  responder,
} from '../../hooks/use-ajuste-de-constante.soporte'

vi.mock('next-safe-action/hooks', async () => {
  const soporte = await import('../../hooks/use-ajuste-de-constante.soporte')
  return { useAction: () => ({ executeAsync: soporte.ejecutar }) }
})
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('../../actions/cambiar-constante', () => ({ cambiarConstante: {} }))
vi.mock('../../../../areas/formula/composicion.client', async () => {
  const soporte = await import('../../hooks/use-ajuste-de-constante.soporte')
  return { leerValorPorDefecto: soporte.leerSimulado }
})

const { ProveedorDelAjuste } = await import('./proveedor-del-ajuste')

// La hoja de prueba del núcleo con sus celdas de ⚙ como constantes: la base da `ajustes` sólo a una constante o a un tipo de cambio.
function hojaConConstantes(): HojaLista {
  const hoja = hojaConAjustes()
  return {
    ...hoja,
    secciones: hoja.secciones.map((seccion) => ({
      ...seccion,
      items: seccion.items.map((item) =>
        item.tipo === 'celda' && item.ajustes ? { ...item, tipoDeNodo: 'constante' } : item,
      ),
    })),
  }
}

beforeEach(reiniciar)
afterEach(cleanup)

// La hoja de prueba del núcleo (`b1` principal con ⚙, `b2` con un secundario con ⚙, `x1` en «Avanzado»), envuelta en el proveedor del área como la envuelve la página.
function montar() {
  render(
    <NuqsTestingAdapter>
      <ProveedorDelAjuste origenId={ORIGEN} cotizacionId={null} permisos={[]}>
        <HojaDeCotizar
          hoja={hojaConConstantes()}
          inicial={AL_DIA}
          vehiculoId={null}
          vehiculoSoltado={false}
          leadId={null}
          borrador={{ clave: 'cotizar:prueba', alDescartar: () => {} }}
          guardado={QUIETO}
        />
      </ProveedorDelAjuste>
    </NuqsTestingAdapter>,
  )
}

describe('ProveedorDelAjuste', () => {
  it('enciende el ⚙ de las celdas que lo traen y no pide nada hasta abrir uno', () => {
    montar()
    expect(
      screen.getByRole('button', { name: 'Cambiar el valor por defecto de B1' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Cambiar el valor por defecto de B2' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cambiar el valor por defecto de A1' })).toBeNull()
    expect(pedidos).toHaveLength(0)
  })

  it('el ⚙ abre «Valor por defecto de <celda>» por `diferido()` y lee con el origen del proveedor', async () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar el valor por defecto de B1' }))
    expect(
      await screen.findByRole('dialog', { name: 'Valor por defecto de B1' }),
    ).toBeInTheDocument()
    await responder(1, leido({ b1: 4 }))
    expect(pedidos.map(({ origenId, nodos }) => ({ origenId, nodos }))).toEqual([
      { origenId: ORIGEN, nodos: ['b1'] },
    ])
  })
})
