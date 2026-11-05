import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProveedorAtajos } from '@/shared/ui/atajos'
import type { OrigenResumen } from '@/modules/origenes/client'
import type { AltaDelPanel } from '../alta-del-panel'
import { AltaDesdeElPanel } from './alta-desde-el-panel'

vi.mock('server-only', () => ({}))
const crear = vi.fn()
vi.mock('../../alta/hooks/use-vehiculos', () => ({
  useVehiculos: () => ({ crear, guardar: vi.fn(), enCurso: false }),
}))
const exito = vi.fn()
vi.mock('@/shared/ui/toasts', () => ({ avisarExito: (...args: unknown[]) => exito(...args) }))

const ORIGEN: OrigenResumen = {
  id: '00000000-0000-4000-8000-0000000000aa',
  nombre: 'Corea',
  color: '#000000',
  activo: true,
  sustantivo: 'vehículo',
  genero: 'm',
  tipo: 'manual',
}
const ALTA: AltaDelPanel = { origen: ORIGEN, apibara: { activa: false, puedeConfigurar: false } }
// El layout lo lee `useLayoutActivo()` de `origenes` (su prueba es la de ese hook): aquí se le dice en qué estado está.
const LISTO = { estado: 'listo', layout: { campos: [], categorias: [] } } as const
let layoutLeido: { estado: string; [clave: string]: unknown } = LISTO
const reintentar = vi.fn()
const pedidoDelLayout = vi.fn()
vi.mock('@/modules/origenes/client', async () => ({
  ...(await vi.importActual<Record<string, unknown>>('@/modules/origenes/client')),
  useLayoutActivo: (origenId: string) => {
    pedidoDelLayout(origenId)
    return { leido: layoutLeido, reintentar }
  },
}))
const NUEVO = '00000000-0000-4000-8000-000000000012'

beforeEach(() => {
  layoutLeido = LISTO
  crear.mockResolvedValue({ ok: true, data: { id: NUEVO, numero: 12 } })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
})

function dibujar() {
  const acciones = { alVolver: vi.fn(), alElegir: vi.fn() }
  render(
    <NuqsTestingAdapter>
      <ProveedorAtajos>
        <AltaDesdeElPanel
          alta={ALTA}
          vista="mano"
          textoInicial=""
          consultarAlMontar={false}
          {...acciones}
        />
      </ProveedorAtajos>
    </NuqsTestingAdapter>,
  )
  return acciones
}

async function montar() {
  const acciones = dibujar()
  await screen.findByRole('button', { name: 'Crear y elegir' })
  return acciones
}

describe('AltaDesdeElPanel', () => {
  it('ofrece «Crear y elegir» y «Volver a la lista»; sin «Guardar y cargar otro» ni «Abrir ficha»', async () => {
    await montar()
    expect(screen.getByRole('button', { name: 'Crear y elegir' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Volver a la lista' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Guardar y cargar otro' })).toBeNull()
  })

  it('«Volver a la lista» y «Cancelar» vuelven', async () => {
    const { alVolver } = await montar()
    fireEvent.click(screen.getByRole('button', { name: 'Volver a la lista' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(alVolver).toHaveBeenCalledTimes(2)
  })

  it('«Crear y elegir» crea el vehículo, avisa sin acción y elige el nuevo', async () => {
    const { alElegir } = await montar()
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Ford Bronco 2024' } })
    fireEvent.click(screen.getByRole('button', { name: 'Crear y elegir' }))
    await waitFor(() => expect(alElegir).toHaveBeenCalledWith(expect.any(String)))
    expect(crear).toHaveBeenCalledWith(
      expect.objectContaining({ origenId: ORIGEN.id, id: alElegir.mock.calls[0]?.[0] }),
    )
    expect(exito).toHaveBeenCalledWith('Vehículo #12 creado')
  })

  it('Ctrl+S crea y elige; el atajo de «guardar y seguir» también crea y elige', async () => {
    const { alElegir } = await montar()
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Ford Bronco 2024' } })
    fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    await waitFor(() => expect(alElegir).toHaveBeenCalledOnce())
    fireEvent.change(screen.getByLabelText(/Título/), { target: { value: 'Otro 2020' } })
    fireEvent.keyDown(window, { key: 'S', ctrlKey: true, shiftKey: true })
    await waitFor(() => expect(alElegir).toHaveBeenCalledTimes(2))
  })

  it('sin título no crea y dice por qué', async () => {
    const { alElegir } = await montar()
    fireEvent.click(screen.getByRole('button', { name: 'Crear y elegir' }))
    await screen.findAllByText(/obligatorio|requerido|Escribe|falta/i)
    expect(crear).not.toHaveBeenCalled()
    expect(alElegir).not.toHaveBeenCalled()
  })

  it('lee el layout del origen al abrirse; mientras carga dice que carga y deja volver', () => {
    layoutLeido = { estado: 'cargando' }
    const { alVolver } = dibujar()
    expect(screen.getByLabelText('Cargando el formulario')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Crear y elegir' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Volver a la lista' }))
    expect(alVolver).toHaveBeenCalledOnce()
    expect(pedidoDelLayout).toHaveBeenCalledWith(ORIGEN.id)
  })

  it('si el layout no llega ofrece reintentar, y volver', () => {
    layoutLeido = { estado: 'error', error: { codigo: 'inesperado', mensaje: 'No se pudo.' } }
    const { alVolver } = dibujar()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(reintentar).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Volver a la lista' }))
    expect(alVolver).toHaveBeenCalledOnce()
  })
})
