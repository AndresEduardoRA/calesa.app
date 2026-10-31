import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@/shared/lib/errores'
import { ProveedorAtajos } from '@/shared/ui/atajos'
import type { DatoParaElegir, LectorDeOpciones } from '../../../entities/dato-para-elegir'
import { PanelDelVehiculo } from './panel-del-vehiculo'

// El grupo del dato del vehículo, de mentira: lee al montarse y avisa al panel de que guardó.
vi.mock('./dato-del-elegido', () => ({
  DatoDelElegido: (props: {
    dato: DatoParaElegir
    leerOpciones: LectorDeOpciones
    alGuardado: () => void
  }) => {
    void props.leerOpciones(props.dato.tablas)
    return (
      <div role="group" aria-label={props.dato.campo}>
        <button type="button" onClick={props.alGuardado}>
          autos
        </button>
      </div>
    )
  },
}))
vi.mock('./diferidos', () => ({ AltaDesdeElPanelDiferida: () => null }))
vi.mock('next/navigation', () => ({
  usePathname: () => '/cotizaciones/nuevo',
  useSearchParams: () => new URLSearchParams('origen=o&lead=l&panel=vehiculo'),
}))
vi.mock('../../../composicion.client', () => ({
  leerListaDelPanel: () => Promise.resolve(ok({ filas: [], siguiente: null, anterior: null })),
}))

const ELEGIDO = '00000000-0000-4000-8000-000000000001'
const leerOpciones = vi.fn<LectorDeOpciones>(() =>
  Promise.resolve(ok({ etiqueta: null, opciones: ['autos'], hayMas: false })),
)
const PARA_ELEGIR = {
  version: 'v1',
  editable: true,
  datos: [{ campo: 'tipo_vehiculo', valor: null, tablas: [{ tabla: 't', columna: 'tipo' }] }],
  leerOpciones,
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function montar(conElegido = true) {
  const cambios: UrlUpdateEvent[] = []
  render(
    <NuqsTestingAdapter
      searchParams={`?origen=o&lead=l&vehiculo=${ELEGIDO}&panel=vehiculo&lista=ultima`}
      onUrlUpdate={(cambio) => cambios.push(cambio)}
      hasMemory
    >
      <ProveedorAtajos>
        <PanelDelVehiculo
          abierto
          alCerrar={vi.fn()}
          origenId="o"
          esSubasta
          elegido={
            conElegido
              ? { id: ELEGIDO, numero: 3, titulo: 'Corolla elegido', lote: '77', portadaRuta: null }
              : null
          }
          alta={null}
          claveDeLaUrl="vehiculo"
          paraElegir={conElegido ? PARA_ELEGIR : null}
        />
      </ProveedorAtajos>
    </NuqsTestingAdapter>,
  )
  return { cambios }
}

describe('PanelDelVehiculo: el dato del vehículo en «Elegido»', () => {
  it('el grupo de cada dato va dentro de «Elegido»', async () => {
    montar()
    const region = await screen.findByRole('region', { name: 'Elegido' })
    expect(within(region).getByRole('group', { name: 'tipo_vehiculo' })).toBeTruthy()
    expect(leerOpciones).toHaveBeenCalledWith(PARA_ELEGIR.datos[0]?.tablas)
  })

  it('sin elegido no hay grupo ni se piden las opciones', async () => {
    montar(false)
    await screen.findByRole('searchbox', { name: 'Buscar un vehículo' })
    expect(screen.queryByRole('group', { name: 'tipo_vehiculo' })).toBeNull()
    expect(leerOpciones).not.toHaveBeenCalled()
  })

  it('guardado el dato, cierra como al elegir: el mismo vehículo, sin el panel, en el servidor', async () => {
    const { cambios } = montar()
    fireEvent.click(await screen.findByRole('button', { name: 'autos' }))
    await waitFor(() =>
      expect(cambios.at(-1)?.queryString).toBe(`?origen=o&lead=l&vehiculo=${ELEGIDO}`),
    )
    expect(cambios.at(-1)?.options.shallow).toBe(false)
    expect(cambios.at(-1)?.options.history).toBe('replace')
  })
})
