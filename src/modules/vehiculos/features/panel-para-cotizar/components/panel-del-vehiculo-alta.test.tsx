import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProveedorAtajos } from '@/shared/ui/atajos'
import type { AltaDelPanel } from '../alta-del-panel'
import type { VehiculoDelPanel } from '../../../entities/panel-para-cotizar'
import { PanelDelVehiculo } from './panel-del-vehiculo'

// El alta de adentro del panel (4.14-2c1): «+», «Traer», Enter y los avisos de un enlace. El alta en sí se prueba en `alta-desde-el-panel.test.tsx`.
const altaMontada = vi.fn()
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
let filas = [vehiculo(OTRO, 'Civic otro')]
vi.mock('../../../composicion.client', () => ({
  leerListaDelPanel: () =>
    Promise.resolve({ ok: true, data: { filas, siguiente: null, anterior: null } }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  filas = [vehiculo(OTRO, 'Civic otro')]
})

const URL_BASE = '?origen=o&lead=l&panel=vehiculo'
function montar({ esSubasta = true, url = URL_BASE, alta = null as AltaDelPanel | null } = {}) {
  const cambios: UrlUpdateEvent[] = []
  render(
    <NuqsTestingAdapter searchParams={url} onUrlUpdate={(cambio) => cambios.push(cambio)} hasMemory>
      <ProveedorAtajos>
        <PanelDelVehiculo
          abierto
          alCerrar={vi.fn()}
          origenId="o"
          esSubasta={esSubasta}
          elegido={null}
          alta={alta}
          claveDeLaUrl="vehiculo"
          historial={null}
        />
      </ProveedorAtajos>
    </NuqsTestingAdapter>,
  )
  return { cambios }
}

const ALTA_DE_SUBASTA: AltaDelPanel = {
  origen: {
    id: 'o',
    nombre: 'Copart USA',
    color: '#000000',
    activo: true,
    sustantivo: 'vehículo',
    genero: 'm',
    tipo: 'subasta',
  },
  apibara: { activa: true, puedeConfigurar: false },
}
const ALTA_MANUAL: AltaDelPanel = {
  ...ALTA_DE_SUBASTA,
  origen: { ...ALTA_DE_SUBASTA.origen, tipo: 'manual' },
}
const ENLACE = 'https://www.copart.com/lot/58540656/clean-title-2024-ford-bronco-big-bend'

describe('PanelDelVehiculo: dar de alta desde el panel', () => {
  it('«+» abre el alta a mano en la URL, sin ir al servidor', async () => {
    const { cambios } = montar({ alta: ALTA_DE_SUBASTA })
    fireEvent.click(await screen.findByRole('button', { name: 'Cargar a mano' }))
    await waitFor(() => expect(cambios.at(-1)?.queryString).toContain('alta=mano'))
    expect(cambios.at(-1)?.options.history).toBe('replace')
    expect(cambios.at(-1)?.options.shallow).not.toBe(false)
    expect(await screen.findByText('Alta mano')).toBeTruthy()
    expect(screen.queryByRole('searchbox')).toBeNull()
    expect(screen.queryByRole('tab')).toBeNull()
    expect(altaMontada).toHaveBeenLastCalledWith(
      expect.objectContaining({ textoInicial: '', consultarAlMontar: false }),
    )
  })

  it('con `?alta=mano` dibuja el alta y «Volver a la lista» la cierra y deja lo buscado', async () => {
    const { cambios } = montar({ alta: ALTA_DE_SUBASTA, url: `${URL_BASE}&buscar=Civic&alta=mano` })
    expect(await screen.findByText('Alta mano')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Volver a la lista' }))
    await waitFor(() => expect(cambios.at(-1)?.queryString).toBe(`${URL_BASE}&buscar=Civic`))
    expect(await screen.findByText('Civic otro')).toBeTruthy()
  })

  it('elegir el vehículo creado quita también `alta` y lo buscado', async () => {
    const { cambios } = montar({ alta: ALTA_DE_SUBASTA, url: `${URL_BASE}&buscar=Civic&alta=mano` })
    fireEvent.click(await screen.findByRole('button', { name: 'Crear y elegir' }))
    await waitFor(() =>
      expect(cambios.at(-1)?.queryString).toBe(`?origen=o&lead=l&vehiculo=${NUEVO}`),
    )
    expect(cambios.at(-1)?.options.shallow).toBe(false)
  })

  it('sin `alta` no hay «+» y un `?alta=` de la URL se ignora', async () => {
    montar({ url: `${URL_BASE}&alta=mano` })
    expect(await screen.findByText('Civic otro')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Cargar a mano' })).toBeNull()
    expect(screen.queryByText('Alta mano')).toBeNull()
  })

  it('un lote se busca y se puede traer: «Traer» deja lo tipeado en `buscar` y consulta al montar', async () => {
    const { cambios } = montar({ alta: ALTA_DE_SUBASTA, url: `${URL_BASE}&buscar=58540656` })
    fireEvent.click(await screen.findByRole('button', { name: 'Traer el lote 58540656' }))
    await waitFor(() => expect(screen.getByText('Alta subasta')).toBeTruthy())
    expect(cambios.at(-1)?.queryString).toBe(`${URL_BASE}&buscar=58540656&alta=subasta`)
    expect(altaMontada).toHaveBeenLastCalledWith(
      expect.objectContaining({ textoInicial: '58540656', consultarAlMontar: true }),
    )
  })

  it('recargar con `?alta=subasta` muestra lo pegado y no vuelve a consultar', async () => {
    montar({ alta: ALTA_DE_SUBASTA, url: `${URL_BASE}&buscar=58540656&alta=subasta` })
    expect(await screen.findByText('Alta subasta')).toBeTruthy()
    expect(altaMontada).toHaveBeenLastCalledWith(
      expect.objectContaining({ textoInicial: '58540656', consultarAlMontar: false }),
    )
  })

  it('en un origen manual, `?alta=subasta` es «a mano»', async () => {
    montar({ alta: ALTA_MANUAL, esSubasta: false, url: `${URL_BASE}&alta=subasta` })
    expect(await screen.findByText('Alta mano')).toBeTruthy()
  })
})

describe('PanelDelVehiculo: Enter y los enlaces', () => {
  it('Enter con un enlace de la subasta lo trae sin esperar a la URL', async () => {
    const { cambios } = montar({ alta: ALTA_DE_SUBASTA })
    const campo = await screen.findByRole('searchbox')
    fireEvent.change(campo, { target: { value: ENLACE } })
    fireEvent.keyDown(campo, { key: 'Enter' })
    expect(await screen.findByText('Alta subasta')).toBeTruthy()
    expect(cambios.at(-1)?.queryString).toContain('alta=subasta')
    expect(altaMontada).toHaveBeenLastCalledWith(
      expect.objectContaining({ textoInicial: ENLACE, consultarAlMontar: true }),
    )
  })

  it('Enter con un lote que ya aparece en los resultados no trae (cada consulta gasta cuota)', async () => {
    montar({ alta: ALTA_DE_SUBASTA, url: `${URL_BASE}&buscar=58540656` })
    await screen.findByText('Civic otro')
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Enter' })
    expect(screen.queryByText('Alta subasta')).toBeNull()
  })

  it('Enter con un lote cuya búsqueda volvió vacía lo trae', async () => {
    filas = []
    montar({ alta: ALTA_DE_SUBASTA, url: `${URL_BASE}&buscar=58540656` })
    await screen.findByText(/Ningún vehículo de este origen tiene «58540656»/)
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Enter' })
    expect(await screen.findByText('Alta subasta')).toBeTruthy()
  })

  it('Enter con un nombre no hace nada', async () => {
    montar({ alta: ALTA_DE_SUBASTA, url: `${URL_BASE}&buscar=Civic` })
    await screen.findByText('Civic otro')
    fireEvent.keyDown(screen.getByRole('searchbox'), { key: 'Enter' })
    expect(screen.queryByText(/^Alta /)).toBeNull()
  })

  it('un enlace que no se puede traer dice por qué y deja las pestañas', async () => {
    montar({ alta: null, url: `${URL_BASE}&buscar=${encodeURIComponent(ENLACE)}` })
    expect(
      await screen.findByText(
        'No puedes dar de alta en este origen: busca el vehículo por nombre, VIN o lote.',
      ),
    ).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Últ. cotización' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Traer/ })).toBeNull()
    cleanup()
    montar({
      alta: ALTA_MANUAL,
      esSubasta: false,
      url: `${URL_BASE}&buscar=${encodeURIComponent(ENLACE)}`,
    })
    expect(await screen.findByText(/Este origen no trae vehículos de una subasta/)).toBeTruthy()
    cleanup()
    montar({
      alta: { ...ALTA_DE_SUBASTA, apibara: { activa: false, puedeConfigurar: false } },
      url: `${URL_BASE}&buscar=${encodeURIComponent(ENLACE)}`,
    })
    expect(await screen.findByText(/La consulta de subastas está apagada/)).toBeTruthy()
  })
})
