import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProveedorAtajos, useAtajo } from '@/shared/ui/atajos'
import type { Resultado } from '@/shared/lib/errores'
import type { CatalogosDeLead } from '../../../entities/catalogos'
import type { ClienteDelPanel } from '../../../entities/panel-para-cotizar'
import { PanelDelCliente } from './panel-del-cliente'

const ELEGIDO = '00000000-0000-4000-8000-000000000001'
const OTRO = '00000000-0000-4000-8000-000000000002'
const cliente = (id: string, nombre: string, tipoId = 't1'): ClienteDelPanel => ({
  id,
  nombre,
  tipoId,
  numeros: { numero: 8, numeroPropio: null, creadorDelPropio: null },
  recienteEn: '2026-10-29T08:00:00Z',
  creadoEn: null,
})
let filas = [cliente(ELEGIDO, 'Ana elegida'), cliente(OTRO, 'Beto otro', 't2')]
let respuesta: () => Promise<Resultado<unknown>> = () =>
  Promise.resolve({ ok: true, data: { filas, siguiente: null, anterior: null } })
const CATALOGO: CatalogosDeLead = {
  origenes: [],
  tipos: [
    { id: 't1', clave: 'p', nombre: 'Prospecto', clase: 'prospecto', activo: true },
    { id: 't2', clave: 'c', nombre: 'Cliente VIP', clase: 'cliente', activo: true },
  ],
  tiposDeSeguimiento: [],
}
const leer = vi.fn((_pedido: { lista: string; busqueda: { texto: string } | null }) => respuesta())
vi.mock('../../../composicion.client', () => ({
  leerClientesDelPanel: (pedido: { lista: string; busqueda: { texto: string } | null }) =>
    leer(pedido),
  leerCatalogoDelPanel: () => Promise.resolve({ ok: true, data: CATALOGO }),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  filas = [cliente(ELEGIDO, 'Ana elegida'), cliente(OTRO, 'Beto otro', 't2')]
  respuesta = () => Promise.resolve({ ok: true, data: { filas, siguiente: null, anterior: null } })
})

function Hoja({ alGuardar }: { alGuardar: () => void }) {
  useAtajo('guardar', alGuardar)
  return null
}

function montar({
  alGuardar = vi.fn(),
  conElegido = true,
  puedeCrear = false,
  url = '?origen=o&vehiculo=v&panel=cliente',
} = {}) {
  const cambios: UrlUpdateEvent[] = []
  render(
    <NuqsTestingAdapter searchParams={url} onUrlUpdate={(c) => cambios.push(c)} hasMemory>
      <ProveedorAtajos>
        <Hoja alGuardar={alGuardar} />
        <PanelDelCliente
          abierto
          alCerrar={vi.fn()}
          elegido={
            conElegido
              ? {
                  id: ELEGIDO,
                  nombre: 'Ana elegida',
                  tipoId: 't1',
                  numeros: { numero: 8, numeroPropio: null, creadorDelPropio: null },
                }
              : null
          }
          claveDeLaUrl="lead"
          numeroGlobal
          puedeCrear={puedeCrear}
        />
      </ProveedorAtajos>
    </NuqsTestingAdapter>,
  )
  return { alGuardar, cambios }
}

describe('PanelDelCliente', () => {
  it('tiene las pestañas «Todos», «Prospecto» y «Cliente» y abre en «Todos»', async () => {
    montar()
    await screen.findByText('Beto otro')
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
      'Todos',
      'Prospecto',
      'Cliente',
    ])
    expect(screen.getByRole('tab', { name: 'Todos' }).getAttribute('aria-selected')).toBe('true')
  })

  it('cada fila dice el tipo del lead como texto, su nombre y su número', async () => {
    montar()
    const fila = await screen.findByRole('button', { name: /Beto otro/ })
    expect(fila.textContent).toContain('Cliente VIP')
    expect(fila.textContent).toContain('N.º 8')
    expect(screen.getByRole('button', { name: /Ana elegida/ }).textContent).toContain('Prospecto')
  })

  it('el elegido va arriba con «Quitar» y su fila dice «Elegido»; quitar saca el lead de la URL', async () => {
    const { cambios } = montar()
    const elegida = await screen.findByRole('button', { name: /Ana elegida/, current: true })
    expect(elegida.textContent).toContain('Elegido')
    expect(
      screen.getByRole('button', { name: /Beto otro/ }).getAttribute('aria-current'),
    ).toBeNull()
    expect(screen.getByRole('region', { name: 'Elegido' }).textContent).toContain('Ana elegida')
    fireEvent.click(screen.getByRole('button', { name: 'Quitar' }))
    await waitFor(() => expect(cambios.at(-1)?.queryString).toBe('?origen=o&vehiculo=v'))
    expect(cambios.at(-1)?.options.history).toBe('replace')
    expect(cambios.at(-1)?.options.shallow).toBe(false)
  })

  it('sin elegido no hay región «Elegido» ni «Quitar»', async () => {
    montar({ conElegido: false })
    await screen.findByText('Beto otro')
    expect(screen.queryByRole('region', { name: 'Elegido' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Quitar' })).toBeNull()
  })

  it('elegir pone el lead y quita el panel, la pestaña, lo buscado y la página, en el servidor y reemplazando la entrada', async () => {
    const { cambios } = montar({
      url: '?origen=o&vehiculo=v&panel=cliente&clase=cliente&buscar=Beto&cursor=abc',
    })
    fireEvent.click(await screen.findByRole('button', { name: /Beto otro/ }))
    await waitFor(() =>
      expect(cambios.at(-1)?.queryString).toBe(`?origen=o&vehiculo=v&lead=${OTRO}`),
    )
    expect(cambios.at(-1)?.options.history).toBe('replace')
    expect(cambios.at(-1)?.options.shallow).toBe(false)
  })

  it('con el panel abierto, Ctrl+S no guarda la hoja', async () => {
    const { alGuardar } = montar()
    await screen.findByText('Beto otro')
    fireEvent.keyDown(window, { key: 's', ctrlKey: true })
    expect(alGuardar).not.toHaveBeenCalled()
  })
})

describe('PanelDelCliente: «Nuevo lead»', () => {
  it('con permiso para crear, «Nuevo lead» abre el alta del shell con `elegir` y quita pestaña, búsqueda y página, reemplazando la entrada y sin ir al servidor', async () => {
    const { cambios } = montar({
      puedeCrear: true,
      url: '?origen=o&vehiculo=v&panel=cliente&clase=cliente&buscar=Beto&cursor=abc',
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Nuevo lead' }))
    await waitFor(() =>
      expect(cambios.at(-1)?.queryString).toBe('?origen=o&vehiculo=v&panel=nuevo-lead&elegir=lead'),
    )
    expect(cambios.at(-1)?.options.history).toBe('replace')
    expect(cambios.at(-1)?.options.shallow).not.toBe(false)
  })

  it('sin permiso para crear no hay «Nuevo lead»', async () => {
    montar()
    await screen.findByText('Beto otro')
    expect(screen.queryByRole('button', { name: 'Nuevo lead' })).toBeNull()
  })
})

describe('PanelDelCliente: el buscador y los estados', () => {
  it('sin texto, el campo va arriba de «Elegido»; con un texto no hay pestañas y dice «Resultados»', async () => {
    montar()
    const campo = await screen.findByRole('searchbox', { name: 'Buscar por nombre o número' })
    const elegido = screen.getByRole('region', { name: 'Elegido' })
    expect(campo.compareDocumentPosition(elegido) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.queryByText('Resultados')).toBeNull()
    cleanup()
    montar({ url: '?origen=o&panel=cliente&buscar=Beto' })
    await screen.findByText('Beto otro')
    expect(screen.getByRole('heading', { name: 'Resultados' })).toBeTruthy()
    expect(screen.queryByRole('tab')).toBeNull()
    expect(leer).toHaveBeenCalledWith(
      expect.objectContaining({
        lista: 'busqueda',
        busqueda: expect.objectContaining({ texto: 'Beto' }),
      }),
    )
  })

  it('con menos de 3 letras avisa y deja las pestañas', async () => {
    montar({ url: '?origen=o&panel=cliente&buscar=Be' })
    expect(await screen.findByText('Escribe al menos 3 letras')).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Todos' })).toBeTruthy()
  })

  it('vacío por primera vez, de una clase y de una búsqueda', async () => {
    filas = []
    montar()
    expect(await screen.findByText('Todavía no tienes leads en tu cartera.')).toBeTruthy()
    cleanup()
    montar({ url: '?origen=o&panel=cliente&clase=cliente' })
    expect(await screen.findByText('No tienes leads de esta clase en tu cartera.')).toBeTruthy()
    cleanup()
    montar({ url: '?origen=o&panel=cliente&buscar=zzq' })
    expect(
      await screen.findByText('Ningún lead que puedas ver tiene «zzq» en el nombre o ese número.'),
    ).toBeTruthy()
  })

  it('un error se dice con «Reintentar»', async () => {
    respuesta = () => Promise.resolve({ ok: false, error: { codigo: 'inesperado', mensaje: 'x' } })
    montar()
    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain('No se pudieron cargar los leads.')
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy()
  })
})
