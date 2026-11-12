// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// Exportar las cotizaciones (9.05-2c). Lo de la base, simulado en la composición de `datos` y en `getOrigenes`: corren de verdad el route, la
// orquestación, el flujo y las columnas. Lo que se prueba es lo de leads (`route.test.ts`) para la entidad nueva: la constancia antes del primer
// byte, el origen optativo, el total tal como llega y que los nombres de los clientes sólo se piden con `leads.ver`.
const prepararSesion = vi.fn()
const contar = vi.fn()
const pagina = vi.fn()
const registrar = vi.fn()
const leerCotizaciones = vi.fn()
const leerClientes = vi.fn()
const leerTitulos = vi.fn()
vi.mock('@/modules/datos/composicion', () => ({
  prepararSesion: (ahora: number) => prepararSesion(ahora),
  leerLeadsAExportar: () => ({ contar, pagina }),
  leerVehiculosAExportar: () => ({ contar, pagina }),
  leerCotizacionesAExportar: (_cliente: unknown, origenId: string | null) => {
    leerCotizaciones(origenId)
    return { contar, pagina }
  },
  leerClientesDeCotizaciones: (_cliente: unknown, ids: readonly string[]) => leerClientes(ids),
  leerTitulosDeVehiculos: (_cliente: unknown, ids: readonly string[]) => leerTitulos(ids),
  registrarExportacion: () => registrar,
  leerNombresDePersonas: () => Promise.resolve({ ok: true, data: new Map() }),
}))
const getPermisos = vi.fn()
vi.mock('@/modules/equipo', () => ({ getPermisos: () => getPermisos() }))
const leerAjustes = vi.fn()
vi.mock('@/modules/empresa', () => ({ leerAjustes: () => leerAjustes() }))
const getOrigenes = vi.fn()
vi.mock('@/modules/origenes', () => ({
  getOrigenes: (inactivos?: boolean) => getOrigenes(inactivos),
  leerLayout: vi.fn(),
}))
vi.mock('@/modules/flujos', () => ({ leerFasesDeOrigen: vi.fn() }))

import { TOPE_POR_ENTIDAD } from '@/modules/datos'
import { POST } from './route'

const AHORA = new Date('2026-11-12T20:00:00Z')
const EXPORTAR = { clave: 'datos.exportar.todo', origenId: null, alcance: 'todos' }
const VER_LEADS = { clave: 'leads.ver', origenId: null, alcance: 'todos' }
const ORIGEN = '3f0c9a43-6a2e-4c43-9b1a-0b6d1c2e8f10'
const INACTIVO = '3f0c9a43-6a2e-4c43-9b1a-0b6d1c2e8f11'
const LEAD = '00000000-0000-4000-8000-0000000000a1'
const VEHICULO = '00000000-0000-4000-8000-0000000000b1'
const OCULTO = '00000000-0000-4000-8000-0000000000b2'
const ok = <T>(data: T) => ({ ok: true, data })
const origen = (id: string, nombre: string, activo: boolean) => ({
  id,
  nombre,
  color: 'azul',
  activo,
  sustantivo: 'unidad',
  genero: 'f',
  tipo: 'manual',
})
const cotizacion = (n: number, parcial: Record<string, unknown> = {}) => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  numero: n,
  origenId: ORIGEN,
  leadId: LEAD,
  vehiculoId: VEHICULO,
  clase: 'preventa',
  estado: 'activa',
  titulo: `Cotización ${String(n)}`,
  totalBase: 98765.43,
  creadoEn: '2026-11-12T19:00:00+00:00',
  actualizadoEn: '2026-11-12T19:30:00+00:00',
  ...parcial,
})

const pedir = (cuerpo: unknown = { entidad: 'cotizaciones', delimitador: ';' }) =>
  POST(
    new Request('http://localhost/datos/exportar', {
      method: 'POST',
      headers: { host: 'localhost' },
      body: JSON.stringify(cuerpo),
    }),
  )

const leer = async (respuesta: Response) =>
  new TextDecoder('utf-8', { ignoreBOM: true }).decode(await respuesta.arrayBuffer())

const ningunaLectura = () => {
  expect(contar).not.toHaveBeenCalled()
  expect(registrar).not.toHaveBeenCalled()
  expect(pagina).not.toHaveBeenCalled()
  expect(leerClientes).not.toHaveBeenCalled()
  expect(leerTitulos).not.toHaveBeenCalled()
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(AHORA)
  getPermisos.mockResolvedValue([EXPORTAR, VER_LEADS])
  leerAjustes.mockResolvedValue({
    ok: true,
    data: { ajustes: { zonaHoraria: 'America/La_Paz', telefonoCc: '+591', monedaBase: 'BOB' } },
  })
  prepararSesion.mockResolvedValue(ok({ cliente: {}, venceEn: AHORA.getTime() / 1000 + 3600 }))
  getOrigenes.mockResolvedValue(
    ok([origen(ORIGEN, 'Taller Norte', true), origen(INACTIVO, 'Feria 2024', false)]),
  )
  contar.mockResolvedValue(ok({ n: 3, hayMas: false }))
  registrar.mockResolvedValue(ok({ ok: true }))
  pagina.mockResolvedValue(
    ok({
      filas: [
        cotizacion(1),
        cotizacion(2, { clase: 'final', estado: 'invalida', totalBase: 1234.5, titulo: null }),
        cotizacion(3, { vehiculoId: OCULTO, leadId: null, totalBase: 0.1 }),
      ],
      siguiente: null,
    }),
  )
  leerClientes.mockResolvedValue(ok(new Map([[LEAD, 'Ana Pérez']])))
  // El vehículo oculto no llega: la RLS no lo deja ver.
  leerTitulos.mockResolvedValue(ok(new Map([[VEHICULO, 'Toyota Hilux']])))
})
afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('POST /datos/exportar: cotizaciones', () => {
  it('T20 · cuenta, deja la constancia, lee la página y recién después sus nombres; el total tal como llega', async () => {
    const respuesta = await pedir()
    expect(respuesta.status).toBe(200)
    expect(respuesta.headers.get('Content-Disposition')).toBe(
      'attachment; filename="cotizaciones-todos-2026-11-12.csv"',
    )
    expect(registrar).toHaveBeenCalledTimes(1)
    expect(registrar).toHaveBeenCalledWith('cotizaciones', 3, {})
    expect(pagina).not.toHaveBeenCalled()
    const texto = await leer(respuesta)
    expect(leerCotizaciones).toHaveBeenCalledWith(null)
    const orden = [contar, registrar, pagina, leerClientes].map(
      (simulado) => simulado.mock.invocationCallOrder[0] ?? 0,
    )
    expect(orden).toEqual(orden.toSorted((a, b) => a - b))
    expect(orden.every((n) => n > 0)).toBe(true)
    expect(leerClientes).toHaveBeenCalledWith([LEAD])
    expect(leerTitulos).toHaveBeenCalledWith([VEHICULO, OCULTO])
    const encabezados =
      'N.º;Título;Cliente;Vehículo;Origen;Clase;Estado;Total (BOB);Creado;Actualizado'
    expect(texto).toBe(
      `﻿${encabezados}\r\n` +
        '1;Cotización 1;Ana Pérez;Toyota Hilux;Taller Norte;Preventa;Activa;98765,43;2026-11-12T15:00;2026-11-12T15:30\r\n' +
        '2;;Ana Pérez;Toyota Hilux;Taller Norte;Final;Inválida;1234,5;2026-11-12T15:00;2026-11-12T15:30\r\n' +
        '3;Cotización 3;;;Taller Norte;Preventa;Activa;0,1;2026-11-12T15:00;2026-11-12T15:30\r\n',
    )
  })

  it('T21 · con un origen (aunque esté inactivo): su etiqueta en el archivo y en la constancia', async () => {
    const respuesta = await pedir({ entidad: 'cotizaciones', delimitador: ';', origen: INACTIVO })
    expect(respuesta.status).toBe(200)
    expect(respuesta.headers.get('Content-Disposition')).toBe(
      'attachment; filename="cotizaciones-feria-2024-todos-2026-11-12.csv"',
    )
    expect(registrar).toHaveBeenCalledWith('cotizaciones', 3, { origen: INACTIVO })
    expect(leerCotizaciones).toHaveBeenCalledWith(INACTIVO)
    expect(getOrigenes).toHaveBeenCalledWith(true)
  })

  it('T21 · un origen que no está da 404 sin contar ni registrar', async () => {
    const otro = '3f0c9a43-6a2e-4c43-9b1a-0b6d1c2e8f99'
    const respuesta = await pedir({ entidad: 'cotizaciones', delimitador: ';', origen: otro })
    expect(respuesta.status).toBe(404)
    expect(await respuesta.json()).toMatchObject({ codigo: 'vacia' })
    ningunaLectura()
  })

  it('T21 · sin leads.ver, la columna Cliente va vacía y los clientes no se piden', async () => {
    getPermisos.mockResolvedValue([EXPORTAR])
    const texto = await leer(await pedir())
    expect(leerClientes).not.toHaveBeenCalled()
    expect(texto.split('\r\n')[1]).toBe(
      '1;Cotización 1;;Toyota Hilux;Taller Norte;Preventa;Activa;98765,43;2026-11-12T15:00;2026-11-12T15:30',
    )
  })
})

describe('POST /datos/exportar: cotizaciones que no se exportan', () => {
  it('T22 · con más del tope, 409 con el tope de cotizaciones y sin registrar', async () => {
    contar.mockResolvedValue(ok({ n: TOPE_POR_ENTIDAD.cotizaciones, hayMas: true }))
    const respuesta = await pedir()
    expect(respuesta.status).toBe(409)
    expect(await respuesta.json()).toEqual({
      codigo: 'demasiadas',
      tope: TOPE_POR_ENTIDAD.cotizaciones,
    })
    expect(contar).toHaveBeenCalledWith(expect.anything(), TOPE_POR_ENTIDAD.cotizaciones)
    expect(registrar).not.toHaveBeenCalled()
    expect(pagina).not.toHaveBeenCalled()
  })

  it('T22 · si no se leen los orígenes, 500 sin contar', async () => {
    getOrigenes.mockResolvedValue({ ok: false, error: { codigo: 'inesperado', mensaje: 'x' } })
    expect((await pedir()).status).toBe(500)
    ningunaLectura()
  })

  it('T23 · un origen que no es guid o una clave de más: 400 sin llamar nada', async () => {
    for (const cuerpo of [
      { entidad: 'cotizaciones', delimitador: ';', origen: 'x' },
      { entidad: 'cotizaciones', delimitador: ';', lead: LEAD },
    ]) {
      expect((await pedir(cuerpo)).status).toBe(400)
    }
    expect(getPermisos).not.toHaveBeenCalled()
    expect(getOrigenes).not.toHaveBeenCalled()
    ningunaLectura()
  })
})
