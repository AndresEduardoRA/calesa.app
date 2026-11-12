// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as Leads from '@/modules/leads'

vi.mock('server-only', () => ({}))

// Lo de la base, simulado en la composición de `datos`: corren de verdad el route, la orquestación, el flujo y las columnas. Lo que se prueba es
// el contrato de la 9.05-1 (auditoría del informe, punto 6): la constancia antes del primer byte, y 403 o 429 sin leer ninguna fila.
const prepararSesion = vi.fn()
const contar = vi.fn()
const pagina = vi.fn()
const registrar = vi.fn()
const nombres = vi.fn()
vi.mock('@/modules/datos/composicion', () => ({
  prepararSesion: (ahora: number) => prepararSesion(ahora),
  leerLeadsAExportar: () => ({ contar, pagina }),
  registrarExportacion: () => registrar,
  leerNombresDePersonas: (_cliente: unknown, ids: string[]) => nombres(ids),
}))
const getPermisos = vi.fn()
vi.mock('@/modules/equipo', () => ({ getPermisos: () => getPermisos() }))
const leerAjustes = vi.fn()
vi.mock('@/modules/empresa', () => ({ leerAjustes: () => leerAjustes() }))
const leerLayoutDeLeads = vi.fn()
const leerCatalogosDeLead = vi.fn()
// Las celdas de `leads` son las de verdad: sólo se simulan las lecturas.
vi.mock('@/modules/leads', async (importOriginal) => ({
  ...(await importOriginal<typeof Leads>()),
  leerLayoutDeLeads: () => leerLayoutDeLeads(),
  leerCatalogosDeLead: () => leerCatalogosDeLead(),
}))

import { TOPE_POR_ENTIDAD } from '@/modules/datos'
import { POST } from './route'

const AHORA = new Date('2026-11-12T20:00:00Z')
const PERMISO = { clave: 'datos.exportar.todo', origenId: null, alcance: 'todos' }
const fila = (n: number) => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  numero: null,
  nombre: `Lead ${String(n)}`,
  telefono: '591•••••12',
  telefonoVisible: false,
  tipoLeadId: 't1',
  origenLeadId: null,
  atributos: {},
  duenoId: 'd1',
  creadoEn: '2026-11-12T19:00:00+00:00',
  ultimoSeguimientoEn: null,
})
const CURSOR = { instante: '2026-11-12T19:00:00+00:00', id: 'x', sentido: 'siguiente' }
const ok = <T>(data: T) => ({ ok: true, data })

const pedir = (
  cuerpo: unknown = {
    entidad: 'leads',
    delimitador: ';',
    desde: '2026-11-01',
    hasta: '2026-11-10',
  },
  origen?: string,
) =>
  POST(
    new Request('http://localhost/datos/exportar', {
      method: 'POST',
      headers: { host: 'localhost', ...(origen ? { origin: origen } : {}) },
      body: JSON.stringify(cuerpo),
    }),
  )

const ningunaLectura = () => {
  expect(contar).not.toHaveBeenCalled()
  expect(registrar).not.toHaveBeenCalled()
  expect(pagina).not.toHaveBeenCalled()
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(AHORA)
  getPermisos.mockResolvedValue([PERMISO])
  leerAjustes.mockResolvedValue({
    ok: true,
    data: { ajustes: { zonaHoraria: 'America/La_Paz', telefonoCc: '+591' } },
  })
  prepararSesion.mockResolvedValue(ok({ cliente: {}, venceEn: AHORA.getTime() / 1000 + 3600 }))
  leerLayoutDeLeads.mockResolvedValue(ok([]))
  leerCatalogosDeLead.mockResolvedValue(
    ok({ origenes: [], tipos: [{ id: 't1', nombre: 'Prospecto' }] }),
  )
  contar.mockResolvedValue(ok({ n: 2, hayMas: false }))
  registrar.mockResolvedValue(ok({ ok: true }))
  pagina.mockResolvedValue(ok({ filas: [fila(1), fila(2)], siguiente: null }))
  nombres.mockResolvedValue(ok(new Map([['d1', 'Ana']])))
})
afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('POST /datos/exportar', () => {
  it('T1 · sin el permiso, 403 sin abrir la sesión ni leer nada', async () => {
    getPermisos.mockResolvedValue([])
    const respuesta = await pedir()
    expect(respuesta.status).toBe(403)
    expect(await respuesta.json()).toMatchObject({ codigo: 'sin_permiso' })
    expect(prepararSesion).not.toHaveBeenCalled()
    ningunaLectura()
  })

  it('T2 · cuenta, deja la constancia y recién después lee la primera página', async () => {
    const respuesta = await pedir()
    expect(respuesta.status).toBe(200)
    expect(respuesta.headers.get('Content-Type')).toBe('text/csv; charset=utf-8')
    expect(respuesta.headers.get('X-Total-De-Filas')).toBe('2')
    expect(respuesta.headers.get('Content-Disposition')).toBe(
      'attachment; filename="leads-todos-2026-11-12.csv"',
    )
    expect(respuesta.headers.get('Cache-Control')).toBe('no-store')
    // Antes de leer el cuerpo, la constancia ya quedó y no se pidió ninguna fila.
    expect(registrar).toHaveBeenCalledTimes(1)
    expect(registrar).toHaveBeenCalledWith('leads', 2, { desde: '2026-11-01', hasta: '2026-11-10' })
    expect(pagina).not.toHaveBeenCalled()
    // `text()` se come el BOM: se lee en bytes.
    const texto = new TextDecoder('utf-8', { ignoreBOM: true }).decode(
      await respuesta.arrayBuffer(),
    )
    expect(contar.mock.invocationCallOrder[0]).toBeLessThan(
      registrar.mock.invocationCallOrder[0] ?? 0,
    )
    expect(registrar.mock.invocationCallOrder[0]).toBeLessThan(
      pagina.mock.invocationCallOrder[0] ?? 0,
    )
    expect(texto).toBe(
      '﻿Nombre;Teléfono;Tipo;Origen;Dueño;Creado;Último seguimiento\r\n' +
        'Lead 1;591•••••12;Prospecto;;Ana;2026-11-12T15:00;\r\n' +
        'Lead 2;591•••••12;Prospecto;;Ana;2026-11-12T15:00;\r\n',
    )
    expect(registrar).toHaveBeenCalledTimes(1)
  })

  it('T3 · el registrar da 42501: 403 y ninguna fila', async () => {
    registrar.mockResolvedValue({ ok: false, error: { codigo: 'sin_permiso', mensaje: 'x' } })
    const respuesta = await pedir()
    expect(respuesta.status).toBe(403)
    expect(respuesta.headers.get('Content-Type')).not.toContain('text/csv')
    expect(pagina).not.toHaveBeenCalled()
  })

  it('T4 · el cupo de la hora se gastó: 429 con libreEn y ninguna fila', async () => {
    registrar.mockResolvedValue(ok({ ok: false, libreEn: '2026-11-12T20:40:00+00:00' }))
    const respuesta = await pedir()
    expect(respuesta.status).toBe(429)
    expect(await respuesta.json()).toEqual({
      codigo: 'limite',
      libreEn: '2026-11-12T20:40:00+00:00',
    })
    expect(pagina).not.toHaveBeenCalled()
  })

  it('T5 · con más del tope (409) o ninguna (404), no se registra nada', async () => {
    contar.mockResolvedValue(ok({ n: 250000, hayMas: true }))
    const demasiadas = await pedir()
    expect(demasiadas.status).toBe(409)
    expect(await demasiadas.json()).toEqual({
      codigo: 'demasiadas',
      tope: TOPE_POR_ENTIDAD.leads,
    })
    contar.mockResolvedValue(ok({ n: 0, hayMas: false }))
    expect((await pedir()).status).toBe(404)
    expect(registrar).not.toHaveBeenCalled()
    expect(pagina).not.toHaveBeenCalled()
  })
})

describe('POST /datos/exportar: el flujo', () => {
  it('T6 · si la segunda página falla, el flujo se corta con error (nunca un CSV que parezca entero)', async () => {
    contar.mockResolvedValue(ok({ n: 1500, hayMas: false }))
    pagina
      .mockResolvedValueOnce(ok({ filas: [fila(1)], siguiente: CURSOR }))
      .mockResolvedValueOnce({ ok: false, error: { codigo: 'inesperado', mensaje: 'se cayó' } })
    const respuesta = await pedir()
    expect(respuesta.status).toBe(200)
    await expect(respuesta.text()).rejects.toThrow()
    expect(pagina).toHaveBeenCalledTimes(2)
  })

  it('T7 · otro origen (403) o un pedido que no se entiende (400): nada se llama', async () => {
    expect((await pedir(undefined, 'https://otra.app')).status).toBe(403)
    for (const cuerpo of [
      { entidad: 'vehiculos', delimitador: ';' },
      { entidad: 'cotizaciones', delimitador: ';' },
      { entidad: 'leads', delimitador: ';', origen: '00000000-0000-4000-8000-000000000001' },
      { entidad: 'leads', delimitador: ';', desde: '2026-11-10', hasta: '2026-11-01' },
    ]) {
      expect((await pedir(cuerpo)).status).toBe(400)
    }
    expect(getPermisos).not.toHaveBeenCalled()
    expect(prepararSesion).not.toHaveBeenCalled()
    ningunaLectura()
  })

  it('T8 · con un token que vence a los 10 s, el flujo corta sin pedir la primera página', async () => {
    prepararSesion.mockResolvedValue(ok({ cliente: {}, venceEn: AHORA.getTime() / 1000 + 10 }))
    const respuesta = await pedir()
    await expect(respuesta.text()).rejects.toThrow()
    expect(pagina).not.toHaveBeenCalled()
  })

  it('T12 · el archivo nunca lleva más filas que las registradas', async () => {
    pagina.mockResolvedValue(ok({ filas: [fila(1), fila(2), fila(3)], siguiente: null }))
    const texto = await (await pedir()).text()
    const lineas = texto.split('\r\n').filter((linea) => linea !== '')
    expect(lineas).toHaveLength(1 + 2)
    expect(texto).not.toContain('Lead 3')
  })

  it('sin sesión, 401 y nada se lee', async () => {
    prepararSesion.mockResolvedValue({
      ok: false,
      error: { codigo: 'no_autenticado', mensaje: 'x' },
    })
    expect((await pedir()).status).toBe(401)
    ningunaLectura()
  })
})
