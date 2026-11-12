import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ok } from '@/shared/lib/errores'
import type { ClavePermiso, Permisos } from '@/shared/lib/permisos'
import { ProveedorRegional } from '@/shared/ui/regional'
import type { Pago } from '../../../entities/dinero/pago'
import type { Unidad } from '../../../entities/nucleo/unidad'

const ORIGEN = '11111111-1111-4111-8111-111111111111'

const lecturas = vi.hoisted(() => ({
  permisos: [] as Permisos,
  pagos: [] as Pago[],
}))

vi.mock('../../../areas/dinero/composicion.client', () => ({
  TOPE_DE_PAGOS_DE_LA_UNIDAD: 50,
  NO_SE_CARGARON_LOS_PAGOS: 'No se pudieron cargar los pagos.',
  NO_SE_CARGARON_LAS_OPCIONES: 'No se pudieron cargar las opciones del gasto.',
  leerMisPermisos: () => Promise.resolve(ok(lecturas.permisos)),
  leerPagosDeLaUnidad: () => Promise.resolve(ok({ pagos: lecturas.pagos, hayMas: false })),
  leerOpcionesDeGasto: () =>
    Promise.resolve(ok({ categorias: [], monedas: [], tiposDeCambio: [] })),
  subirComprobante: () => Promise.resolve(ok('x')),
  urlDelComprobante: () => Promise.resolve(ok('https://example.test/x')),
}))

// Las Server Actions traen `server-only` por su composición: aquí no se llaman.
vi.mock('../actions/registrar-pago', () => ({ registrarPago: vi.fn() }))
vi.mock('../actions/guardar-pago', () => ({ guardarPago: vi.fn() }))
vi.mock('../actions/eliminar-pago', () => ({ eliminarPago: vi.fn() }))
vi.mock('../actions/confirmar-pago', () => ({ confirmarPago: vi.fn() }))
vi.mock('../actions/anular-pago', () => ({ anularPago: vi.fn() }))

import { HuecoDePagos } from './hueco-de-pagos'

const unidad = { id: '22222222-2222-4222-8222-222222222222', origenId: ORIGEN } as Unidad

const sinConfirmar: Pago = {
  id: '33333333-3333-4333-8333-333333333333',
  vehiculoId: unidad.id,
  leadId: null,
  concepto: 'Anticipo',
  moneda: 'BOB',
  monto: 696,
  tipoCambioId: '55555555-5555-4555-8555-555555555555',
  tipoCambioAplicado: 6.96,
  // Lo que devolvió la base: deliberadamente NO es 696 / 6,96 para probar que el componente no calcula.
  montoBase: 123.45,
  metodo: null,
  fecha: '2026-11-10',
  confirmado: false,
  confirmadoPor: null,
  confirmadoPorNombre: null,
  confirmadoEn: null,
  comprobanteRuta: null,
  notas: null,
  actualizadoEn: '2026-11-10T12:00:00Z',
}

const confirmado: Pago = {
  ...sinConfirmar,
  id: '44444444-4444-4444-8444-444444444444',
  concepto: 'Saldo',
  confirmado: true,
  confirmadoPor: '66666666-6666-4666-8666-666666666666',
  confirmadoPorNombre: 'Ana',
  confirmadoEn: '2026-11-11T18:30:00Z',
}

// `logistica.pagos.confirmar` es global (sin origen); las otras, del origen de la unidad.
const concesion = (clave: ClavePermiso, origenId: string | null = ORIGEN) => ({
  clave,
  origenId,
  alcance: 'todos' as const,
})
const VER = concesion('logistica.pagos.ver')
const EDITAR = concesion('logistica.pagos.editar')
const CONFIRMAR = concesion('logistica.pagos.confirmar', null)

function dibujar() {
  return render(
    <NuqsTestingAdapter>
      <ProveedorRegional locale="es-BO" monedaBase="USD" zonaHoraria="America/La_Paz">
        <HuecoDePagos unidad={unidad} />
      </ProveedorRegional>
    </NuqsTestingAdapter>,
  )
}

beforeEach(() => {
  lecturas.pagos = [sinConfirmar]
})

afterEach(() => {
  cleanup()
})

describe('HuecoDePagos: pagos sin confirmar', () => {
  it('sin permiso de confirmar no hay «Confirmar pago» ni «Anular pago»', async () => {
    lecturas.permisos = [VER, EDITAR]
    dibujar()
    await screen.findByText('Anticipo')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Registrar pago/ })).toBeTruthy()
    })
    expect(screen.queryByRole('button', { name: 'Confirmar pago' })).toBeNull()
    expect(screen.queryByText('Anular pago')).toBeNull()
    expect(screen.getByText('Sin confirmar')).toBeTruthy()
  })

  it('con confirmar y sin editar ofrece «Confirmar pago» y no «Registrar» ni «Editar»', async () => {
    lecturas.permisos = [VER, CONFIRMAR]
    dibujar()
    await screen.findByText('Anticipo')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Confirmar pago' })).toBeTruthy()
    })
    expect(screen.queryByRole('button', { name: /Registrar pago/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Más acciones/ })).toBeNull()
  })

  it('con editar ofrece «Registrar pago» y «Más acciones»', async () => {
    lecturas.permisos = [VER, EDITAR]
    dibujar()
    await screen.findByText('Anticipo')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Más acciones de pago Anticipo/ })).toBeTruthy()
    })
  })

  it('el equivalente en base es el que devolvió la base: el componente nunca multiplica', async () => {
    lecturas.permisos = [VER]
    const { container } = dibujar()
    await screen.findByText('Anticipo')
    const montos = [...container.querySelectorAll('[data-monto-valor]')].map((n) => n.textContent)
    expect(montos).toHaveLength(2)
    expect(montos[0]).toMatch(/696/)
    expect(montos[1]).toMatch(/123,45/)
    expect(screen.getByText(/Equivale a/)).toBeTruthy()
  })
})

describe('HuecoDePagos: pagos confirmados', () => {
  beforeEach(() => {
    lecturas.pagos = [confirmado]
  })

  it('muestra el sello con el nombre y, con todos los permisos, no ofrece editar ni eliminar', async () => {
    lecturas.permisos = [VER, EDITAR, CONFIRMAR]
    dibujar()
    expect(await screen.findByText('Confirmado por Ana el 11 nov 2026, 14:30')).toBeTruthy()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Más acciones de pago Saldo/ })).toBeTruthy()
    })
    expect(screen.queryByRole('button', { name: 'Confirmar pago' })).toBeNull()
    expect(screen.queryByText('Sin confirmar')).toBeNull()
    // Sólo «Anular pago» está en el menú: el pago sellado no se edita ni se elimina.
    screen.getByRole('button', { name: /Más acciones de pago Saldo/ }).click()
    expect(await screen.findByText('Anular pago')).toBeTruthy()
    expect(screen.queryByText('Editar')).toBeNull()
    expect(screen.queryByText('Eliminar')).toBeNull()
  })

  it('sin la clave de confirmar no ofrece «Anular pago» ni ningún control', async () => {
    lecturas.permisos = [VER, EDITAR]
    dibujar()
    await screen.findByText('Confirmado por Ana el 11 nov 2026, 14:30')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Registrar pago/ })).toBeTruthy()
    })
    expect(screen.queryByRole('button', { name: /Más acciones/ })).toBeNull()
  })
})

describe('HuecoDePagos: la lista', () => {
  it('una unidad sin pagos lo dice', async () => {
    lecturas.pagos = []
    lecturas.permisos = [VER]
    dibujar()
    expect(await screen.findByText('Esta unidad no tiene pagos registrados.')).toBeTruthy()
  })
})
