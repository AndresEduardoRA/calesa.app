import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProveedorAtajos, useAtajo } from '@/shared/ui/atajos'
import type { AltaDelPanel } from '../alta-del-panel'
import type { VehiculoDelPanel } from '../../../entities/panel-para-cotizar'
import { PanelDelVehiculo } from './panel-del-vehiculo'

const altaMontada = vi.fn()
// La action del dato del vehículo importa el servidor: aquí no se elige ningún dato.
vi.mock('../actions/guardar-dato-del-vehiculo', () => ({ guardarDatoDelVehiculo: {} }))
vi.mock('./diferidos', () => ({
  AltaDesdeElPanelDiferida: (props: {
    vista: string
    textoInicial: string
    consultarAlMontar: boolean
    alVolver: () => void
    alElegir: (id: string) => void
  }) => {
    altaMontada(props)
    return (
      <div>
        <p>Alta {props.vista}</p>
        <button type="button" onClick={props.alVolver}>
          Volver a la lista
        </button>
        <button
          type="button"
          onClick={() => {
            props.alElegir(NUEVO)
          }}
        >
          Crear y elegir
        </button>
      </div>
    )
  },
}))
vi.mock('next/navigation', () => ({
  usePathname: () => '/cotizaciones/nuevo',
  useSearchParams: () => new URLSearchParams('origen=o&lead=l&panel=vehiculo'),
}))

const ELEGIDO = '00000000-0000-4000-8000-000000000001'
const OTRO = '00000000-0000-4000-8000-000000000002'
const NUEVO = '00000000-0000-4000-8000-000000000099'
const vehiculo = (id: string, titulo: string): VehiculoDelPanel => ({
  id,
  numero: 3,
  titulo,
  anio: 2020,
  lote: '77',
  precio: null,
  creadoEn: '2026-10-01T08:00:00Z',
  cotizadoEn: '2026-10-29T08:00:00Z',
  cierreSubastaEn: null,
  portadaRuta: null,
})
let filas = [vehiculo(ELEGIDO, 'Corolla elegido'), vehiculo(OTRO, 'Civic otro')]
const leer = vi.fn((_pedido: { lista: string; texto?: string }) =>
  Promise.resolve({ ok: true, data: { filas, siguiente: null, anterior: null } }),
)
vi.mock('../../../composicion.client', () => ({
  leerListaDelPanel: (pedido: { lista: string; texto?: string }) => leer(pedido),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  filas = [vehiculo(ELEGIDO, 'Corolla elegido'), vehiculo(OTRO, 'Civic otro')]
})

// La hoja registra «guardar» antes de que se abra el panel.
function Hoja({ alGuardar }: { alGuardar: () => void }) {
  useAtajo('guardar', alGuardar)
  return null
}

function montar({
  esSubasta = true,
  alGuardar = vi.fn(),
  conElegido = true,
  historial = null as ReactNode,
  url = '?origen=o&lead=l&panel=vehiculo&lista=ultima',
  alta = null as AltaDelPanel | null,
} = {}) {
  const cambios: UrlUpdateEvent[] = []
  render(
    <NuqsTestingAdapter searchParams={url} onUrlUpdate={(cambio) => cambios.push(cambio)} hasMemory>
      <ProveedorAtajos>
        <Hoja alGuardar={alGuardar} />
        <PanelDelVehiculo
          abierto
          alCerrar={vi.fn()}
          origenId="o"
          esSubasta={esSubasta}
          elegido={
            conElegido
              ? { id: ELEGIDO, numero: 3, titulo: 'Corolla elegido', lote: '77', portadaRuta: null }
              : null
          }
          alta={alta}
          claveDeLaUrl="vehiculo"
          historial={historial}
        />
      </ProveedorAtajos>
    </NuqsTestingAdapter>,
  )
  return { alGuardar, cambios }
}

describe('PanelDelVehiculo', () => {
  it('en un origen de subasta tiene las dos pestañas; en otro, sólo «Últ. cotización»', async () => {
    montar()
    expect(await screen.findByRole('tab', { name: 'Cierre subasta' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Últ. cotización' })).toBeTruthy()
    cleanup()
    montar({ esSubasta: false })
    await screen.findByText('Civic otro')
    expect(screen.queryByRole('tab', { name: 'Cierre subasta' })).toBeNull()
    expect(screen.queryByText('Cierre subasta')).toBeNull()
  })

  it('el elegido va arriba con «Quitar», y su tarjeta dice «Seleccionado»', async () => {
    const { cambios } = montar()
    const elegida = await screen.findByRole('button', { name: /Corolla elegido/, current: true })
    expect(elegida.textContent).toContain('Seleccionado')
    expect(
      screen.getByRole('button', { name: /Civic otro/ }).getAttribute('aria-current'),
    ).toBeNull()
    expect(screen.getByRole('region', { name: 'Elegido' }).textContent).toContain('Corolla elegido')
    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }))
    await waitFor(() => expect(cambios.at(-1)?.queryString).toBe('?origen=o&lead=l'))
  })

  it('elegir pone el vehículo y quita el panel, en el servidor y reemplazando la entrada de abrirlo', async () => {
    const { cambios } = montar()
    fireEvent.click(await screen.findByRole('button', { name: /Civic otro/ }))
    await waitFor(() =>
      expect(cambios.at(-1)?.queryString).toBe(`?origen=o&lead=l&vehiculo=${OTRO}`),
    )
    expect(cambios.at(-1)?.options.history).toBe('replace')
    expect(cambios.at(-1)?.options.shallow).toBe(false)
  })

  it('con el panel abierto, Ctrl+S no guarda la hoja', async () => {
    const { alGuardar } = montar()
    await screen.findByText('Civic otro')
    fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    expect(alGuardar).not.toHaveBeenCalled()
  })

  it('el historial se dibuja dentro de la región «Elegido»; sin elegido, no', async () => {
    montar({ historial: <p>Aquí va el historial</p> })
    const region = await screen.findByRole('region', { name: 'Elegido' })
    expect(region.textContent).toContain('Aquí va el historial')
    cleanup()
    montar({ conElegido: false, historial: <p>Aquí va el historial</p> })
    await screen.findByText('Civic otro')
    expect(screen.queryByText('Aquí va el historial')).toBeNull()
  })
})

describe('PanelDelVehiculo: el buscador', () => {
  it('sin texto: el campo de búsqueda va arriba de «Elegido» y las pestañas siguen', async () => {
    montar()
    const campo = await screen.findByRole('searchbox', { name: 'Buscar un vehículo' })
    const elegido = screen.getByRole('region', { name: 'Elegido' })
    expect(campo.compareDocumentPosition(elegido) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Últ. cotización' })).toBeTruthy()
    expect(screen.queryByText('Resultados')).toBeNull()
  })

  it('con un texto que se busca no hay pestañas: dice «Resultados» y pide la búsqueda', async () => {
    montar({ url: '?origen=o&lead=l&panel=vehiculo&lista=ultima&buscar=Civic' })
    await screen.findByText('Civic otro')
    expect(screen.getByRole('heading', { name: 'Resultados' })).toBeTruthy()
    expect(screen.queryByRole('tab')).toBeNull()
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('Civic')
    expect(leer).toHaveBeenCalledWith(
      expect.objectContaining({ lista: 'busqueda', texto: 'Civic' }),
    )
  })

  it('sin resultados dice qué se buscó; con menos de 3 letras avisa y deja las pestañas', async () => {
    filas = []
    montar({ url: '?origen=o&lead=l&panel=vehiculo&buscar=zzq' })
    expect(
      await screen.findByText(
        'Ningún vehículo de este origen tiene «zzq» en el título, el VIN o el lote.',
      ),
    ).toBeTruthy()
    cleanup()
    montar({ url: '?origen=o&lead=l&panel=vehiculo&buscar=Ci' })
    expect(await screen.findByText('Escribe al menos 3 letras o números.')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Últ. cotización' })).toBeTruthy()
    expect(screen.queryByText('Resultados')).toBeNull()
  })

  it('elegir un resultado quita también lo buscado', async () => {
    const { cambios } = montar({ url: '?origen=o&lead=l&panel=vehiculo&buscar=Civic' })
    fireEvent.click(await screen.findByRole('button', { name: /Civic otro/ }))
    await waitFor(() =>
      expect(cambios.at(-1)?.queryString).toBe(`?origen=o&lead=l&vehiculo=${OTRO}`),
    )
  })
})
