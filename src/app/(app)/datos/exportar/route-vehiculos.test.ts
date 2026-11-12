// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

// Exportar los vehículos de un origen (9.05-2b). Lo de la base, simulado en la composición de `datos` y en las lecturas de `origenes` y `flujos`:
// corren de verdad el route, la orquestación, el flujo y las columnas (con los `camposComunes` de verdad). Lo que se prueba es lo de leads
// (`route.test.ts`) para la entidad nueva: la constancia antes del primer byte, el origen y el precio tal como llega.
const prepararSesion = vi.fn()
const contar = vi.fn()
const pagina = vi.fn()
const registrar = vi.fn()
const leerVehiculos = vi.fn()
vi.mock('@/modules/datos/composicion', () => ({
  prepararSesion: (ahora: number) => prepararSesion(ahora),
  leerLeadsAExportar: () => ({ contar, pagina }),
  leerVehiculosAExportar: (_cliente: unknown, origenId: string) => {
    leerVehiculos(origenId)
    return { contar, pagina }
  },
  registrarExportacion: () => registrar,
  leerNombresDePersonas: () => Promise.resolve({ ok: true, data: new Map() }),
}))
const getPermisos = vi.fn()
vi.mock('@/modules/equipo', () => ({ getPermisos: () => getPermisos() }))
const leerAjustes = vi.fn()
vi.mock('@/modules/empresa', () => ({ leerAjustes: () => leerAjustes() }))
const getOrigenes = vi.fn()
const leerLayout = vi.fn()
vi.mock('@/modules/origenes', () => ({
  getOrigenes: (inactivos?: boolean) => getOrigenes(inactivos),
  leerLayout: (origenId: string) => leerLayout(origenId),
}))
const leerFasesDeOrigen = vi.fn()
vi.mock('@/modules/flujos', () => ({
  leerFasesDeOrigen: (origenId: string) => leerFasesDeOrigen(origenId),
}))

import { TOPE_POR_ENTIDAD } from '@/modules/datos'
import { POST } from './route'

const AHORA = new Date('2026-11-12T20:00:00Z')
const PERMISO = { clave: 'datos.exportar.todo', origenId: null, alcance: 'todos' }
const ORIGEN = '3f0c9a43-6a2e-4c43-9b1a-0b6d1c2e8f10'
const INACTIVO = '3f0c9a43-6a2e-4c43-9b1a-0b6d1c2e8f11'
const ok = <T>(data: T) => ({ ok: true, data })
const origen = (id: string, nombre: string, activo: boolean) => ({
  id,
  nombre,
  color: 'azul',
  activo,
  sustantivo: 'unidad',
  genero: 'f',
  tipo: 'subasta',
})
const campoColor = {
  id: 'cc',
  clave: 'color',
  etiqueta: 'Color',
  tipo: 'opcion',
  opciones: [{ clave: 'r', etiqueta: 'Rojo' }],
  orden: 10,
  activo: true,
}
const vehiculo = (n: number) => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  numero: n,
  titulo: `Auto ${String(n)}`,
  marca: 'Toyota',
  modelo: 'RAV4',
  anio: 2021,
  vin: null,
  categoriaId: 'c1',
  kilometraje: null,
  placado: true,
  lote: '77',
  plataforma: null,
  urlOrigen: null,
  precio: 12500.5,
  precioNegociable: null,
  aceptaPermuta: false,
  faseId: 'f1',
  atributos: { color: 'r' },
  creadoEn: '2026-11-12T19:00:00+00:00',
  actualizadoEn: '2026-11-12T19:30:00+00:00',
})

const pedir = (cuerpo: unknown = { entidad: 'vehiculos', delimitador: ';', origen: ORIGEN }) =>
  POST(
    new Request('http://localhost/datos/exportar', {
      method: 'POST',
      headers: { host: 'localhost' },
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
  getOrigenes.mockResolvedValue(
    ok([origen(ORIGEN, 'Subasta USA', true), origen(INACTIVO, 'Feria 2024', false)]),
  )
  leerLayout.mockResolvedValue(
    ok({ campos: [campoColor], categorias: [{ id: 'c1', nombre: 'SUV' }] }),
  )
  leerFasesDeOrigen.mockResolvedValue(ok([{ id: 'f1', nombre: 'En tránsito', activa: true }]))
  contar.mockResolvedValue(ok({ n: 2, hayMas: false }))
  registrar.mockResolvedValue(ok({ ok: true }))
  pagina.mockResolvedValue(ok({ filas: [vehiculo(1), vehiculo(2)], siguiente: null }))
})
afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('POST /datos/exportar: vehículos de un origen', () => {
  it('T13 · cuenta, deja la constancia con el origen y recién después escribe sus columnas', async () => {
    const respuesta = await pedir()
    expect(respuesta.status).toBe(200)
    expect(respuesta.headers.get('Content-Disposition')).toBe(
      'attachment; filename="vehiculos-subasta-usa-todos-2026-11-12.csv"',
    )
    expect(registrar).toHaveBeenCalledTimes(1)
    expect(registrar).toHaveBeenCalledWith('vehiculos', 2, { origen: ORIGEN })
    expect(pagina).not.toHaveBeenCalled()
    const texto = new TextDecoder('utf-8', { ignoreBOM: true }).decode(
      await respuesta.arrayBuffer(),
    )
    expect(contar.mock.invocationCallOrder[0]).toBeLessThan(
      registrar.mock.invocationCallOrder[0] ?? 0,
    )
    expect(registrar.mock.invocationCallOrder[0]).toBeLessThan(
      pagina.mock.invocationCallOrder[0] ?? 0,
    )
    expect(leerVehiculos).toHaveBeenCalledWith(ORIGEN)
    expect(getOrigenes).toHaveBeenCalledWith(true)
    const encabezados =
      'N.º;Título;Marca;Modelo;Año;VIN;Categoría;Kilometraje;Placado;Lote;Plataforma;Enlace de la subasta;Precio;' +
      'Precio negociable;Acepta permuta;Color;Fase;Creado;Actualizado'
    const fila = (n: number) =>
      `${String(n)};Auto ${String(n)};Toyota;RAV4;2021;;SUV;;Sí;77;;;12500,5;;No;Rojo;En tránsito;2026-11-12T15:00;2026-11-12T15:30`
    expect(texto).toBe(`﻿${encabezados}\r\n${fila(1)}\r\n${fila(2)}\r\n`)
  })

  it('T14 · un origen inactivo exporta; uno que no está da 404 sin contar ni registrar', async () => {
    expect((await pedir({ entidad: 'vehiculos', delimitador: ';', origen: INACTIVO })).status).toBe(
      200,
    )
    expect(registrar).toHaveBeenCalledWith('vehiculos', 2, { origen: INACTIVO })
    vi.clearAllMocks()
    const otro = '3f0c9a43-6a2e-4c43-9b1a-0b6d1c2e8f99'
    const respuesta = await pedir({ entidad: 'vehiculos', delimitador: ';', origen: otro })
    expect(respuesta.status).toBe(404)
    expect(await respuesta.json()).toMatchObject({ codigo: 'vacia' })
    ningunaLectura()
  })

  it('T14 · un no_encontrado del layout de un origen que existe es un error (500), no un 404', async () => {
    leerLayout.mockResolvedValue({ ok: false, error: { codigo: 'no_encontrado', mensaje: 'x' } })
    expect((await pedir()).status).toBe(500)
    ningunaLectura()
  })

  it('T14 · sin el permiso, 403 sin leer ni los orígenes', async () => {
    getPermisos.mockResolvedValue([])
    expect((await pedir()).status).toBe(403)
    expect(getOrigenes).not.toHaveBeenCalled()
    ningunaLectura()
  })

  it('T15 · con más del tope de vehículos, 409 con ese tope y sin registrar', async () => {
    contar.mockResolvedValue(ok({ n: TOPE_POR_ENTIDAD.vehiculos, hayMas: true }))
    const respuesta = await pedir()
    expect(respuesta.status).toBe(409)
    expect(await respuesta.json()).toEqual({
      codigo: 'demasiadas',
      tope: TOPE_POR_ENTIDAD.vehiculos,
    })
    expect(contar).toHaveBeenCalledWith(expect.anything(), TOPE_POR_ENTIDAD.vehiculos)
    expect(registrar).not.toHaveBeenCalled()
    expect(pagina).not.toHaveBeenCalled()
  })

  it('T16 · sin origen, leads con origen o cotizaciones: 400 sin llamar nada', async () => {
    for (const cuerpo of [
      { entidad: 'vehiculos', delimitador: ';' },
      { entidad: 'leads', delimitador: ';', origen: ORIGEN },
      { entidad: 'cotizaciones', delimitador: ';', origen: ORIGEN },
    ]) {
      expect((await pedir(cuerpo)).status).toBe(400)
    }
    expect(getPermisos).not.toHaveBeenCalled()
    expect(getOrigenes).not.toHaveBeenCalled()
    ningunaLectura()
  })
})
