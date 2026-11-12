import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import { ProveedorRegional } from '@/shared/ui/regional'
import type { Gasto } from '../../../entities/dinero/gasto'
import type { Unidad } from '../../../entities/nucleo/unidad'

const ORIGEN = '11111111-1111-4111-8111-111111111111'

const lecturas = vi.hoisted(() => ({
  permisos: [] as Permisos,
  gastos: [] as Gasto[],
}))

vi.mock('../../../areas/dinero/composicion.client', () => ({
  TOPE_DE_GASTOS_DE_LA_UNIDAD: 50,
  NO_SE_CARGARON_LOS_GASTOS: 'No se pudieron cargar los gastos.',
  NO_SE_CARGO_EL_MARGEN: 'No se pudo cargar el margen.',
  NO_SE_CARGARON_LAS_OPCIONES: 'No se pudieron cargar las opciones del gasto.',
  leerMisPermisos: () => Promise.resolve(ok(lecturas.permisos)),
  leerGastosDeLaUnidad: () => Promise.resolve(ok({ gastos: lecturas.gastos, hayMas: false })),
  leerOpcionesDeGasto: () =>
    Promise.resolve(ok({ categorias: [], monedas: [], tiposDeCambio: [] })),
  subirComprobante: () => Promise.resolve(ok('x')),
  urlDelComprobante: () => Promise.resolve(ok('https://example.test/x')),
}))

// Las Server Actions traen `server-only` por su composición: aquí no se llaman.
vi.mock('../actions/registrar-gasto', () => ({ registrarGasto: vi.fn() }))
vi.mock('../actions/guardar-gasto', () => ({ guardarGasto: vi.fn() }))
vi.mock('../actions/eliminar-gasto', () => ({ eliminarGasto: vi.fn() }))

import { HuecoDeGastos } from './hueco-de-gastos'

const unidad = { id: '22222222-2222-4222-8222-222222222222', origenId: ORIGEN } as Unidad

const gasto: Gasto = {
  id: '33333333-3333-4333-8333-333333333333',
  vehiculoId: unidad.id,
  categoriaId: '44444444-4444-4444-8444-444444444444',
  categoriaNombre: 'Flete',
  moneda: 'BOB',
  monto: 696,
  tipoCambioId: '55555555-5555-4555-8555-555555555555',
  tipoCambioAplicado: 6.96,
  // Lo que devolvió la base: deliberadamente NO es 696 / 6,96 para probar que el componente no calcula.
  montoBase: 123.45,
  fecha: '2026-11-10',
  proveedor: 'Naviera',
  comprobanteRuta: null,
  loteId: null,
  notas: null,
  actualizadoEn: '2026-11-10T12:00:00Z',
}

const concesion = (clave: 'logistica.gastos.ver' | 'logistica.gastos.editar') => ({
  clave,
  origenId: ORIGEN,
  alcance: 'todos' as const,
})

function dibujar() {
  return render(
    <NuqsTestingAdapter>
      <ProveedorRegional locale="es-BO" monedaBase="USD" zonaHoraria="America/La_Paz">
        <HuecoDeGastos unidad={unidad} />
      </ProveedorRegional>
    </NuqsTestingAdapter>,
  )
}

beforeEach(() => {
  lecturas.gastos = [gasto]
})

afterEach(() => {
  cleanup()
})

describe('HuecoDeGastos', () => {
  it('sin permiso de editar no hay «Registrar gasto» ni «Editar»', async () => {
    lecturas.permisos = [concesion('logistica.gastos.ver')]
    dibujar()
    await screen.findByText('Flete')
    expect(screen.queryByRole('button', { name: /Registrar gasto/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Más acciones/ })).toBeNull()
  })

  it('con permiso de editar ofrece «Registrar gasto» y «Más acciones»', async () => {
    lecturas.permisos = [concesion('logistica.gastos.ver'), concesion('logistica.gastos.editar')]
    dibujar()
    await screen.findByText('Flete')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Registrar gasto/ })).toBeTruthy()
    })
    expect(screen.getByRole('button', { name: /Más acciones de gasto de Flete/ })).toBeTruthy()
  })

  it('el equivalente en base es el que devolvió la base: el componente nunca multiplica', async () => {
    lecturas.permisos = [concesion('logistica.gastos.ver')]
    const { container } = dibujar()
    await screen.findByText('Flete')
    const montos = [...container.querySelectorAll('[data-monto-valor]')].map((n) => n.textContent)
    expect(montos).toHaveLength(2)
    expect(montos[0]).toMatch(/696/)
    expect(montos[1]).toMatch(/123,45/)
    expect(screen.getByText(/Equivale a/)).toBeTruthy()
  })

  it('una unidad sin gastos lo dice', async () => {
    lecturas.gastos = []
    lecturas.permisos = [concesion('logistica.gastos.ver')]
    dibujar()
    expect(await screen.findByText('Esta unidad no tiene gastos registrados.')).toBeTruthy()
  })
})
