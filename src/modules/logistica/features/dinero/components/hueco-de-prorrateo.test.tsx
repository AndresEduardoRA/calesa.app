import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@/shared/lib/errores'
import { ProveedorRegional } from '@/shared/ui/regional'

const CATEGORIA = '0b6f1a0e-6a43-4c1e-9d3b-6c1d3f7a9e11'
const UNIDADES = [
  { id: '11111111-1111-4111-8111-111111111111', titulo: 'Hilux' },
  { id: '22222222-2222-4222-8222-222222222222', titulo: 'Frontier' },
  { id: '33333333-3333-4333-8333-333333333333', titulo: 'Jimny' },
]

const lecturas = vi.hoisted(() => ({ unidades: [] as { id: string; titulo: string }[] }))
const prorratear = vi.hoisted(() => vi.fn())

vi.mock('../../../areas/dinero/composicion.client', () => ({
  NO_SE_CARGARON_LAS_UNIDADES: 'No se pudieron cargar las unidades del grupo.',
  NO_SE_CARGARON_LAS_OPCIONES: 'No se pudieron cargar las opciones del gasto.',
  leerUnidadesDelGrupo: () => Promise.resolve(ok({ unidades: lecturas.unidades, hayMas: false })),
  leerOpcionesDeGasto: () =>
    Promise.resolve(
      ok({
        categorias: [
          { id: CATEGORIA, nombre: 'Flete', proposito: 'flete', activo: true, orden: 1 },
        ],
        monedas: [{ codigo: 'USD', nombre: 'Dólar', simbolo: '$' }],
        tiposDeCambio: [],
      }),
    ),
}))

// La Server Action trae `server-only` por su composición: aquí es un doble.
vi.mock('../actions/prorratear-gasto', () => ({ prorratearGasto: prorratear }))

import { HuecoDeProrrateo } from './hueco-de-prorrateo'

const grupo = { tipo: 'embarque' as const, id: 'BOOKING-1' }

const CON_EL_DIALOGO = '?panel=prorratear'

function dibujar(url = '') {
  return render(
    <NuqsTestingAdapter searchParams={url}>
      <ProveedorRegional locale="es-BO" monedaBase="USD" zonaHoraria="America/La_Paz">
        <HuecoDeProrrateo grupo={grupo} />
      </ProveedorRegional>
    </NuqsTestingAdapter>,
  )
}

async function escribirElGasto(monto: string) {
  fireEvent.change(await screen.findByLabelText('Categoría'), { target: { value: CATEGORIA } })
  fireEvent.change(screen.getByLabelText('Monto a repartir'), { target: { value: monto } })
}

beforeEach(() => {
  lecturas.unidades = UNIDADES
  prorratear.mockReset()
})

afterEach(() => {
  cleanup()
})

describe('HuecoDeProrrateo: la vista previa', () => {
  it('con 3 unidades y 100,00 muestra 33,34 · 33,33 · 33,33 y la suma 100,00, sin equivalente en base', async () => {
    const { container } = dibujar()
    await escribirElGasto('100')
    await waitFor(() => {
      expect(container.querySelectorAll('[data-vista-del-reparto] li')).toHaveLength(3)
    })
    const montos = [
      ...container.querySelectorAll('[data-vista-del-reparto] [data-monto-valor]'),
    ].map((n) => n.textContent)
    expect(montos).toHaveLength(4)
    expect(montos[0]).toMatch(/33,34/)
    expect(montos[1]).toMatch(/33,33/)
    expect(montos[2]).toMatch(/33,33/)
    expect(montos[3]).toMatch(/100,00/)
    expect(screen.getByText(/lo calcula el sistema al confirmar/)).toBeTruthy()
  })

  it('un grupo sin unidades lo dice y no ofrece repartir', async () => {
    lecturas.unidades = []
    dibujar()
    expect(
      await screen.findByText('Este grupo no tiene unidades. No hay nada que repartir.'),
    ).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Repartir/ })).toBeNull()
  })
})

describe('HuecoDeProrrateo: confirmar', () => {
  // La URL ya trae `?panel=prorratear`: el diálogo aparece en cuanto lo escrito es válido (abrirlo con el botón lo prueba el e2e de la página que monte el hueco).
  async function escribirYEsperarElDialogo() {
    await escribirElGasto('100')
    return screen.findByRole('button', { name: 'Repartir' })
  }

  it('confirmar llama la action una vez con las unidades en orden y trata «ya existía» como éxito', async () => {
    prorratear.mockResolvedValue({
      data: { ok: true, data: { lote: 'x', yaExistia: true, ids: [] } },
    })
    dibujar(CON_EL_DIALOGO)
    ;(await escribirYEsperarElDialogo()).click()
    await waitFor(() => {
      expect(prorratear).toHaveBeenCalledTimes(1)
    })
    const pedido = prorratear.mock.calls[0]?.[0] as { unidades: string[]; monto: number }
    expect(pedido.unidades).toEqual(UNIDADES.map((u) => u.id))
    expect(pedido.monto).toBe(100)
    await waitFor(() => {
      expect((screen.getByLabelText('Monto a repartir') as HTMLInputElement).value).toBe('')
    })
  })

  it('una respuesta perdida conserva el lote al reintentar; un rechazo de la base se dice en el diálogo y no limpia lo escrito', async () => {
    prorratear
      .mockResolvedValueOnce({
        data: {
          ok: false,
          error: { codigo: 'inesperado', mensaje: 'No pudimos leer la respuesta.' },
        },
      })
      .mockResolvedValueOnce({
        data: {
          ok: false,
          error: {
            codigo: 'sin_permiso',
            mensaje: 'No tienes el permiso «logistica.gastos.editar».',
          },
        },
      })
    dibujar(CON_EL_DIALOGO)
    const repartir = await escribirYEsperarElDialogo()
    repartir.click()
    expect(await screen.findByText('No pudimos leer la respuesta.')).toBeTruthy()
    // No se sabe si la base escribió: el diálogo sigue abierto y reintentar manda el mismo lote.
    repartir.click()
    expect(await screen.findByText('No tienes el permiso «logistica.gastos.editar».')).toBeTruthy()
    expect(prorratear).toHaveBeenCalledTimes(2)
    const [primero, segundo] = prorratear.mock.calls.map((c) => (c[0] as { lote: string }).lote)
    expect(segundo).toBe(primero)
    expect((screen.getByLabelText('Monto a repartir') as HTMLInputElement).value).toBe('100')
  })
})
