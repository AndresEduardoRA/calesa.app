import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@/shared/lib/errores'
import { respuestaDePrueba } from '../../../entities/hoja-de-prueba.soporte'
import type { PedidoDeRecalculo } from '../../../entities/pedido-de-recalculo'
import type * as ajusteDeLaHoja from '../hooks/use-ajuste-de-la-hoja'
import { useAjusteDeLaHoja } from '../hooks/use-ajuste-de-la-hoja'
import {
  AjusteDePrueba,
  hojaConAjustes,
  llamadasDeAjuste,
  montarHoja,
  regionesDeAjuste,
} from './hoja-de-cotizar-ajuste.soporte'

const { recalcular } = vi.hoisted(() => ({ recalcular: vi.fn() }))
vi.mock('../../../composicion.client', () => ({ recalcular }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
// El hook real, contado: sin proveedor no se llama (nada de `usePanelPorUrl('celda', …)`), y las demás pruebas usan el real.
vi.mock('../hooks/use-ajuste-de-la-hoja', async (orig) => {
  const real = await orig<typeof ajusteDeLaHoja>()
  return { ...real, useAjusteDeLaHoja: vi.fn(real.useAjusteDeLaHoja) }
})

// Los ids que React genera (`useId`) cambian de un montaje a otro: no son parte del DOM que se compara.
const sinIds = (html: string) => html.replace(/_r_[a-z0-9]+_|radix-[^"]+/g, 'ID')

const ENGRANAJE = (etiqueta: string) => `Cambiar el valor por defecto de ${etiqueta}`

beforeEach(() => {
  window.sessionStorage.clear()
  llamadasDeAjuste.mockClear()
  recalcular.mockReset()
  vi.mocked(useAjusteDeLaHoja).mockClear()
})
afterEach(cleanup)

describe('HojaDeCotizar: el ⚙ de una celda de la hoja', () => {
  it('con proveedor, la celda con ajustes (y la que los tiene en su secundario) tiene ⚙ y la que no, no', () => {
    montarHoja()
    expect(screen.getByRole('button', { name: ENGRANAJE('B1') })).toBeTruthy()
    expect(screen.getByRole('button', { name: ENGRANAJE('B2') })).toBeTruthy()
    expect(screen.queryByRole('button', { name: ENGRANAJE('B3') })).toBeNull()
    expect(screen.queryByRole('button', { name: ENGRANAJE('A1') })).toBeNull()
  })

  it('tocarlo abre el ajuste de esa celda y cerrarlo lo quita', async () => {
    montarHoja()
    fireEvent.click(screen.getByRole('button', { name: ENGRANAJE('B1') }))
    const region = await screen.findByRole('region', { name: 'Ajuste de B1' })
    expect(llamadasDeAjuste.mock.lastCall?.[0].celda.nodo).toBe('b1')
    fireEvent.click(within(region).getByRole('button', { name: 'Cerrar el ajuste' }))
    await waitFor(() => {
      expect(regionesDeAjuste()).toHaveLength(0)
    })
  })

  it('?ajuste=celda&nodo= lo abre al montar (recargar)', async () => {
    montarHoja('?ajuste=celda&nodo=b2')
    expect(await screen.findByRole('region', { name: 'Ajuste de B2' })).toBeTruthy()
  })

  it('un nodo que no se dibuja, sin ⚙ o inventado no monta el ajuste', async () => {
    for (const nodo of ['b3', 'a1', 'x1', 'no_existe']) {
      montarHoja(`?ajuste=celda&nodo=${nodo}`)
      await Promise.resolve()
      expect(regionesDeAjuste()).toHaveLength(0)
      cleanup()
    }
  })

  it('le da la versión de la fórmula, de dónde calcula y cómo confirmar: confirmar pide un recálculo', async () => {
    recalcular.mockResolvedValue(ok(respuestaDePrueba({ usd: 1 })))
    montarHoja('?ajuste=celda&nodo=b1')
    const region = await screen.findByRole('region', { name: 'Ajuste de B1' })
    const { hoja } = llamadasDeAjuste.mock.lastCall![0]
    expect(hoja.formula).toEqual(hojaConAjustes().formula)
    expect(hoja.de.tipo).toBe('abierta')
    expect(typeof hoja.alRecargar).toBe('function')
    fireEvent.click(within(region).getByRole('button', { name: 'Confirmar 12' }))
    await waitFor(() => {
      expect(recalcular).toHaveBeenCalled()
    })
    const pedido = recalcular.mock.calls[0]?.[0] as PedidoDeRecalculo
    expect(pedido.entradas.inputs).toEqual({ b1: 12 })
  })
})

describe('HojaDeCotizar: el ⚙ sin proveedor', () => {
  it('no hay ⚙ aunque la base lo dé, y la URL no monta nada', async () => {
    montarHoja('?ajuste=celda&nodo=b1', { proveedor: false })
    await Promise.resolve()
    expect(screen.queryByRole('button', { name: ENGRANAJE('B1') })).toBeNull()
    expect(regionesDeAjuste()).toHaveLength(0)
    expect(llamadasDeAjuste).not.toHaveBeenCalled()
  })

  it('el DOM de la hoja es el mismo con y sin la clave en la URL', () => {
    const sin = montarHoja('', { proveedor: false }).container.innerHTML
    cleanup()
    const con = montarHoja('?ajuste=celda&nodo=b1', { proveedor: false }).container.innerHTML
    expect(sinIds(con)).toBe(sinIds(sin))
  })

  it('el hook del ajuste no se llama: 0 sin proveedor y al menos 1 con él', () => {
    montarHoja('', { proveedor: false })
    expect(useAjusteDeLaHoja).not.toHaveBeenCalled()
    cleanup()
    montarHoja()
    expect(vi.mocked(useAjusteDeLaHoja).mock.calls.length).toBeGreaterThanOrEqual(1)
  })
})

describe('HojaDeCotizar: el ⚙ de «Avanzado», dentro del modal', () => {
  it('x1 tiene su ⚙ en el diálogo y tocarlo abre el ajuste dentro de él', async () => {
    montarHoja('?panel=avanzado')
    const dialogo = await screen.findByRole('dialog', { name: 'Avanzado' })
    expect(within(dialogo).getByRole('button', { name: ENGRANAJE('X1') })).toBeTruthy()
    expect(within(dialogo).queryByRole('button', { name: ENGRANAJE('X2') })).toBeNull()
    fireEvent.click(within(dialogo).getByRole('button', { name: ENGRANAJE('X1') }))
    const region = await screen.findByRole('region', { name: 'Ajuste de X1' })
    expect(within(dialogo).getByRole('region', { name: 'Ajuste de X1' })).toBe(region)
  })

  it('?panel=avanzado&ajuste=celda&nodo=x1 al montar lo abre dentro del diálogo (recargar)', async () => {
    montarHoja('?panel=avanzado&ajuste=celda&nodo=x1')
    const dialogo = await screen.findByRole('dialog', { name: 'Avanzado' })
    expect(await within(dialogo).findByRole('region', { name: 'Ajuste de X1' })).toBeTruthy()
  })

  it('sin ?panel=avanzado, el nodo de una celda avanzada no monta nada', async () => {
    montarHoja('?ajuste=celda&nodo=x1')
    await Promise.resolve()
    expect(regionesDeAjuste()).toHaveLength(0)
  })

  it('el ajuste de una celda principal se monta fuera del diálogo, no dentro', async () => {
    montarHoja('?panel=avanzado&ajuste=celda&nodo=b1')
    const dialogo = await screen.findByRole('dialog', { name: 'Avanzado' })
    // Con el modal abierto lo de afuera queda oculto para la accesibilidad: se busca igual.
    const region = await screen.findByRole('region', { name: 'Ajuste de B1', hidden: true })
    expect(dialogo.contains(region)).toBe(false)
  })

  it('sin proveedor, el diálogo no cambia con la clave en la URL y no trae ⚙', async () => {
    montarHoja('?panel=avanzado', { proveedor: false })
    const sin = sinIds((await screen.findByRole('dialog', { name: 'Avanzado' })).innerHTML)
    expect(
      within(await screen.findByRole('dialog')).queryByRole('button', { name: ENGRANAJE('X1') }),
    ).toBeNull()
    cleanup()
    montarHoja('?panel=avanzado&ajuste=celda&nodo=x1', { proveedor: false })
    expect(sinIds((await screen.findByRole('dialog', { name: 'Avanzado' })).innerHTML)).toBe(sin)
  })
})

// Para que el soporte no quede sin uso si cambia la forma del `Ajuste`.
void AjusteDePrueba
