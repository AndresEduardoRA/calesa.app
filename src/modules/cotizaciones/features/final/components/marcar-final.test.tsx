import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter, type UrlUpdateEvent } from 'nuqs/adapters/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import type { CotizacionDeLaHoja } from '../../../entities/hoja-de-una-guardada'

const h = vi.hoisted(() => ({
  marcar: vi.fn(),
  refresh: vi.fn(),
  orden: [] as string[],
  toasts: {
    avisar: vi.fn(),
    avisarConDeshacer: vi.fn(),
    avisarError: vi.fn(),
    avisarExito: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: h.refresh }) }))
vi.mock('../actions/marcar-final', () => ({ marcarFinal: h.marcar }))
vi.mock('@/shared/ui/toasts', () => h.toasts)

import { marcarLaFinal } from '../hooks/marcar-la-final'
import { HUECOS_DE_FINAL_EN_LA_GUARDADA } from './huecos-en-la-guardada'

afterEach(cleanup)

const ID = '22222222-2222-4222-8222-222222222222'
const ORIGEN = '33333333-3333-4333-8333-333333333333'
const OTRO_ORIGEN = '44444444-4444-4444-8444-444444444444'

const cotizacion = (cambios: Partial<CotizacionDeLaHoja> = {}): CotizacionDeLaHoja => ({
  id: ID,
  numero: 7,
  clase: 'preventa',
  version: 1,
  origenId: ORIGEN,
  leadId: '55555555-5555-4555-8555-555555555555',
  vehiculoId: '66666666-6666-4666-8666-666666666666',
  modoTc: null,
  verTotalBs: false,
  titulo: null,
  notas: null,
  creadoEn: '2026-11-01T10:00:00+00:00',
  actualizadoEn: '2026-11-07T11:00:00.123456+00:00',
  ...cambios,
})

const gestiona = (origenId: string | null = ORIGEN): Permisos =>
  [{ clave: 'cotizaciones.final.gestionar', origenId, alcance: 'todos' }] as Permisos

let actualizaciones: UrlUpdateEvent[] = []

function dibujar(
  opciones: {
    cotizacion?: CotizacionDeLaHoja
    puedeGuardar?: boolean
    permisos?: Permisos
    url?: string
  } = {},
) {
  const { Acciones } = HUECOS_DE_FINAL_EN_LA_GUARDADA
  if (!Acciones) {
    throw new Error('El área final no llena `Acciones`')
  }
  return render(
    <NuqsTestingAdapter
      searchParams={opciones.url ?? ''}
      onUrlUpdate={(evento) => {
        actualizaciones.push(evento)
      }}
    >
      <Acciones
        cotizacion={opciones.cotizacion ?? cotizacion()}
        puedeGuardar={opciones.puedeGuardar ?? true}
        permisos={opciones.permisos ?? gestiona()}
      />
    </NuqsTestingAdapter>,
  )
}

const boton = () => screen.queryByRole('button', { name: 'Marcar final' })
const dialogo = () => screen.findByRole('dialog')
const confirmar = async (veces = 1) => {
  const d = await dialogo()
  const enDialogo = [...d.querySelectorAll('button')].find((b) => b.textContent === 'Marcar final')
  for (let i = 0; i < veces; i++) {
    fireEvent.click(enDialogo as HTMLElement)
  }
}

beforeEach(() => {
  h.marcar.mockReset()
  h.refresh.mockReset()
  h.orden.length = 0
  actualizaciones = []
  for (const f of Object.values(h.toasts)) f.mockReset()
  h.toasts.avisarExito.mockImplementation(() => h.orden.push('aviso'))
})

describe('«Marcar final» en la cabecera de la guardada: quién lo ve', () => {
  it('llena `Acciones` y no `Debajo`', () => {
    expect(HUECOS_DE_FINAL_EN_LA_GUARDADA.Acciones).toBeTypeOf('function')
    expect(HUECOS_DE_FINAL_EN_LA_GUARDADA.Debajo).toBeUndefined()
  })

  it('lo ve en una preventa quien gestiona finales en su origen', () => {
    dibujar()
    expect(boton()).toBeTruthy()
  })

  it('nada con una final, sin la clave o con la clave de otro origen', () => {
    for (const caso of [
      { cotizacion: cotizacion({ clase: 'final' }) },
      { permisos: [] as Permisos },
      { permisos: gestiona(OTRO_ORIGEN) },
    ]) {
      const { container } = dibujar(caso)
      expect(container.textContent).toBe('')
      cleanup()
    }
  })
})

describe('apagado con su motivo', () => {
  it('sin vehículo, a quien puede guardarla: elige y guarda', () => {
    dibujar({ cotizacion: cotizacion({ vehiculoId: null }) })
    const b = boton() as HTMLButtonElement
    expect(b.disabled).toBe(true)
    const motivo = document.getElementById(b.getAttribute('aria-describedby') ?? '')
    expect(motivo?.textContent).toBe('Para marcarla final, elige el vehículo y guarda.')
  })

  it('sin lead, a quien no puede guardarla: que se lo pida a quien la cotizó', () => {
    dibujar({ cotizacion: cotizacion({ leadId: null }), puedeGuardar: false })
    expect(screen.getByText('Para marcarla final le falta el cliente: pídeselo a quien la cotizó.'))
  })

  it('con la URL del diálogo no lo abre: avisa el motivo y limpia la URL', async () => {
    dibujar({ cotizacion: cotizacion({ vehiculoId: null }), url: '?panel=marcar-final' })
    await waitFor(() =>
      expect(h.toasts.avisarError).toHaveBeenCalledWith({
        codigo: 'no_encontrado',
        mensaje: 'Para marcarla final, elige el vehículo y guarda.',
      }),
    )
    await waitFor(() => expect(actualizaciones.at(-1)?.queryString).toBe(''))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('el diálogo', () => {
  it('el clic escribe ?panel=marcar-final', async () => {
    dibujar()
    fireEvent.click(boton() as HTMLElement)
    await waitFor(() => expect(actualizaciones.at(-1)?.queryString).toBe('?panel=marcar-final'))
  })

  it('con la URL abre con su título y lo que pasa', async () => {
    dibujar({ url: '?panel=marcar-final' })
    const d = await dialogo()
    expect(d.textContent).toContain('Marcar como final la cotización n.º 7')
    expect(d.textContent).toContain(
      'Pasa a ser la final de su vehículo: el vehículo queda vinculado a su lead, el lead pasa a cliente y las demás cotizaciones del vehículo van a tu papelera, de donde se pueden restaurar. Se marca lo guardado: lo que escribiste y no guardaste se pierde.',
    )
  })

  it('entra: cierra la URL, después avisa, y recién ahí termina; una sola llamada', async () => {
    let responder: (valor: unknown) => void = () => undefined
    h.marcar.mockReturnValue(
      new Promise((r) => {
        responder = r
      }),
    )
    dibujar({ url: '?panel=marcar-final' })
    await confirmar(2)
    expect(h.marcar).toHaveBeenCalledTimes(1)
    expect(h.marcar).toHaveBeenCalledWith({ id: ID })
    responder({ data: { ok: true, data: null } })
    await waitFor(() => expect(h.toasts.avisarExito).toHaveBeenCalled())
    expect(h.toasts.avisarExito).toHaveBeenCalledWith(
      'Marcaste la n.º 7 como final. Si el vehículo tenía otras, están en tu papelera.',
    )
    await waitFor(() => expect(actualizaciones.at(-1)?.queryString).toBe(''))
  })

  it('`marcarLaFinal()` cierra la URL antes de avisar, y los dos antes de volver', async () => {
    h.marcar.mockResolvedValue({ data: { ok: true, data: null } })
    const vuelta = await marcarLaFinal({ id: ID, numero: 7, cerrar: () => h.orden.push('cerrar') })
    h.orden.push('volvio')
    expect(vuelta).toBeNull()
    expect(h.orden).toEqual(['cerrar', 'aviso', 'volvio'])
  })
})

describe('cuando no entra, el diálogo sigue abierto y lo dice', () => {
  it('un conflicto lo dice adentro, con «Recargar», y sigue abierto', async () => {
    h.marcar.mockResolvedValue({
      data: {
        ok: false,
        error: {
          codigo: 'conflicto',
          mensaje: 'La cotización cambió mientras la marcabas. Vuelve a intentarlo.',
        },
      },
    })
    dibujar({ url: '?panel=marcar-final' })
    await confirmar()
    const d = await dialogo()
    await waitFor(() =>
      expect(d.textContent).toContain(
        'La cotización cambió mientras la marcabas. Vuelve a intentarlo.',
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Recargar' }))
    expect(h.refresh).toHaveBeenCalled()
    expect(h.toasts.avisarExito).not.toHaveBeenCalled()
  })

  it('el 23505 del índice dice que otra ya es la final, nunca el genérico', async () => {
    h.marcar.mockResolvedValue({
      data: {
        ok: false,
        error: { codigo: 'duplicado', mensaje: 'Ya existe un registro con esos datos.' },
      },
    })
    dibujar({ url: '?panel=marcar-final' })
    await confirmar()
    const d = await dialogo()
    await waitFor(() =>
      expect(d.textContent).toContain(
        'Otra cotización de este vehículo ya es la final. Recarga para verla.',
      ),
    )
    expect(d.textContent).not.toContain('Ya existe un registro')
    expect(screen.getByRole('button', { name: 'Recargar' })).toBeTruthy()
  })

  it('una regla dice el texto de la base, sin «Recargar»', async () => {
    h.marcar.mockResolvedValue({
      data: {
        ok: false,
        error: {
          codigo: 'regla',
          mensaje:
            'Este vehículo está vinculado a otro lead. Desvincúlalo antes de marcar la final.',
        },
      },
    })
    dibujar({ url: '?panel=marcar-final' })
    await confirmar()
    const d = await dialogo()
    await waitFor(() =>
      expect(d.textContent).toContain('Este vehículo está vinculado a otro lead.'),
    )
    expect(screen.queryByRole('button', { name: 'Recargar' })).toBeNull()
  })

  it('un error que no sabemos si entró pide recargar', async () => {
    h.marcar.mockResolvedValue({
      data: {
        ok: false,
        error: { codigo: 'inesperado', mensaje: 'Algo falló de nuestro lado.' },
      },
    })
    dibujar({ url: '?panel=marcar-final' })
    await confirmar()
    const d = await dialogo()
    await waitFor(() =>
      expect(d.textContent).toContain('No sabemos si se marcó: recarga para verlo.'),
    )
  })
})
