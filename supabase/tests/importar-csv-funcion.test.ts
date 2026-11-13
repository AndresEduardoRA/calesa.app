// @vitest-environment node
// La función `importar-csv` (supabase/functions/importar-csv): el pase antes que nada, los lotes con la marca de la base, el
// presupuesto de tiempo, el archivo que no sirve y el CSV que se borra sólo al terminar o fallar. Ver el soporte.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  archivoDeLeads,
  BaseFalsa,
  bytesDe,
  cargar,
  cargarFuncion,
  ID,
  IMPORTACION,
  llamarFuncion,
  RUTA,
  SERVICIO,
  simularBase,
  type ModuloProcesar,
} from './importar-csv-soporte'

const PASE = '22222222-2222-4222-8222-222222222222'
const TIPO_DISTINTIVO = 'ZQXJ-tipo-de-una-persona'
let procesar: ModuloProcesar
let espias: { mock: { calls: unknown[] } }[] = []

beforeAll(async () => {
  procesar = await cargar<ModuloProcesar>('procesar.ts')
  await cargarFuncion()
})

afterAll(() => {
  vi.unstubAllGlobals()
})

// info, warn y error: todo lo que la función registra.
beforeEach(() => {
  espias = (['info', 'warn', 'error'] as const).map((metodo) =>
    vi.spyOn(console, metodo).mockImplementation(() => undefined),
  )
})

const correr = (base: BaseFalsa) => procesar.procesarImportacion(ID, base.dependencias(), 0)

describe('el pase', () => {
  it('sin pase, con uno sin forma de uuid o con GET: 401, 401 y 405 sin ningún pedido a la base', async () => {
    const pedidos = simularBase(new BaseFalsa())
    expect((await llamarFuncion({})).estado).toBe(401)
    expect((await llamarFuncion({ pase: 'no-es-un-uuid' })).estado).toBe(401)
    expect((await llamarFuncion(null, 'GET')).estado).toBe(405)
    expect(pedidos).toEqual([])
  })

  it('un pase que no vale: 401 y sólo el pedido de canjearlo', async () => {
    const pedidos = simularBase(new BaseFalsa(), null)
    const respuesta = await llamarFuncion({ pase: PASE })
    expect(respuesta.estado).toBe(401)
    expect(respuesta.json).toMatchObject({ ok: false, error: { codigo: 'sin_pase' } })
    expect(pedidos.map((p) => p.url)).toEqual(['http://base.test/rest/v1/rpc/importacion_abrir'])
    expect(pedidos[0]?.cuerpo).toEqual({ p_pase: PASE })
    expect(pedidos[0]?.autorizacion).toBe(`Bearer ${SERVICIO}`)
  })
})

describe('el camino', () => {
  it('120 filas: empezar, tres lotes consecutivos, terminar y borrar; nada personal sale', async () => {
    const base = new BaseFalsa(
      IMPORTACION,
      archivoDeLeads(120, {
        7: { rechazo: { motivo: 'El tipo «Frío» no existe.', campo: 'tipo_lead_id' } },
        60: { datos: { nombre: 'Persona 60', tipo_lead_id: TIPO_DISTINTIVO } },
      }),
    )
    const pedidos = simularBase(base)
    const respuesta = await llamarFuncion({ pase: PASE })
    expect(respuesta.estado).toBe(200)
    expect(respuesta.json).toEqual({
      ok: true,
      data: { importacion: ID, estado: 'terminada', procesadas: 120, filas_total: 120 },
    })
    expect(base.nombres()).toEqual([
      'importacion_abrir',
      'importacion_empezar',
      'importacion_procesar_lote',
      'importacion_procesar_lote',
      'importacion_procesar_lote',
      'importacion_terminar',
    ])
    expect(base.llamadas[1]?.args).toEqual({ p_importacion: ID, p_total: 120 })
    const lotes = base.lotes()
    expect(lotes.map((l) => [l.p_desde, l.p_filas.length])).toEqual([
      [1, 50],
      [51, 50],
      [101, 20],
    ])
    const filas = lotes.flatMap((l) => l.p_filas) as { fila: number }[]
    expect(filas.map((f) => f.fila)).toEqual(Array.from({ length: 120 }, (_, i) => i + 1))
    expect(filas[6]).toEqual({
      fila: 7,
      rechazo: { motivo: 'El tipo «Frío» no existe.', campo: 'tipo_lead_id' },
    })
    expect(filas[59]).toEqual({
      fila: 60,
      rechazo: { motivo: 'No es un identificador válido.', campo: 'tipo_lead_id' },
    })
    expect(base.llamadas.at(-1)?.args).toEqual({ p_importacion: ID })
    expect(base.borrados).toEqual([RUTA])
    expect(pedidos.filter((p) => p.metodo === 'DELETE')).toHaveLength(1)
    // Ni la respuesta ni un log llevan la ruta (lleva el uid) ni una celda.
    const registrado = JSON.stringify([respuesta.texto, ...espias.map((e) => e.mock.calls)])
    for (const dato of [RUTA, '44444444', 'Persona', TIPO_DISTINTIVO, '71000000']) {
      expect(registrado).not.toContain(dato)
    }
  })

  it('una excepción da 500 y el log sólo dice qué pedido respondió qué', async () => {
    const base = new BaseFalsa()
    base.alLote = () => {
      throw new Error(`fila de ${TIPO_DISTINTIVO}`)
    }
    simularBase(base)
    const respuesta = await llamarFuncion({ pase: PASE })
    expect(respuesta.estado).toBe(500)
    expect(respuesta.json).toMatchObject({ ok: false, error: { codigo: 'inesperado' } })
    expect(JSON.stringify(espias.map((e) => e.mock.calls))).not.toContain('ZQXJ')
    expect(base.borrados).toEqual([])
  })
})

describe('la marca la dice la base', () => {
  it('retoma: empezar devuelve 50 procesadas y el primer lote es el 51', async () => {
    const base = new BaseFalsa(IMPORTACION, archivoDeLeads(120))
    base.filasTotal = 120
    base.procesadas = 50
    const resultado = await correr(base)
    expect(base.lotes().map((l) => l.p_desde)).toEqual([51, 101])
    expect(resultado).toEqual({
      importacion: ID,
      estado: 'terminada',
      procesadas: 120,
      filas_total: 120,
    })
  })

  it('otra invocación adelante: el lote vuelve todo saltado y ésta se va sin terminar ni borrar', async () => {
    const base = new BaseFalsa(IMPORTACION, archivoDeLeads(120))
    base.alLote = (lote, b) => {
      b.procesadas = 100
      return b.lote(lote)
    }
    const resultado = await correr(base)
    expect(base.lotes()).toHaveLength(1)
    expect(base.nombres()).not.toContain('importacion_terminar')
    expect(base.borrados).toEqual([])
    expect(resultado.estado).toBe('procesando')
  })

  it('permiso perdido: el lote vuelve fallida, se borra el CSV y nada más', async () => {
    const base = new BaseFalsa(IMPORTACION, archivoDeLeads(120))
    base.alLote = () => ({ estado: 'fallida', rechazado: 'Ya no puedes crear leads.' })
    const resultado = await correr(base)
    expect(base.nombres()).toEqual(['importacion_empezar', 'importacion_procesar_lote'])
    expect(base.borrados).toEqual([RUTA])
    expect(resultado.estado).toBe('fallida')
  })

  it('empezar sin permiso: fallida, se borra el CSV y ningún lote', async () => {
    const base = new BaseFalsa()
    base.empezar = () => ({ estado: 'fallida', rechazado: 'Ya no puedes crear leads.' })
    expect((await correr(base)).estado).toBe('fallida')
    expect(base.nombres()).toEqual(['importacion_empezar'])
    expect(base.borrados).toEqual([RUTA])
  })
})

describe('el tiempo', () => {
  it('pasados 45 s tras el primer lote devuelve procesando, sin terminar ni borrar', async () => {
    const base = new BaseFalsa(IMPORTACION, archivoDeLeads(120))
    base.alLote = (lote, b) => {
      b.reloj += procesar.PRESUPUESTO_MS
      return b.lote(lote)
    }
    const resultado = await correr(base)
    expect(resultado).toEqual({
      importacion: ID,
      estado: 'procesando',
      procesadas: 50,
      filas_total: 120,
    })
    expect(base.nombres()).not.toContain('importacion_terminar')
    expect(base.borrados).toEqual([])
  })
})

describe('el archivo', () => {
  it('no está: terminar con el motivo, sin borrar y sin empezar', async () => {
    const base = new BaseFalsa(IMPORTACION, null)
    expect((await correr(base)).estado).toBe('fallida')
    expect(base.llamadas).toEqual([
      {
        nombre: 'importacion_terminar',
        args: {
          p_importacion: ID,
          p_error: 'No encontramos el archivo de la importación: vuelve a subirlo.',
        },
      },
    ])
    expect(base.borrados).toEqual([])
  })

  it('no es UTF-8: terminar con el texto de la lectura y borrar', async () => {
    const base = new BaseFalsa(IMPORTACION, new Uint8Array([0x6e, 0x6f, 0xe9, 0x0a, 0x61]))
    await correr(base)
    expect(base.nombres()).toEqual(['importacion_terminar'])
    expect(String(base.llamadas[0]?.args['p_error'])).toMatch(/no está en UTF-8/)
    expect(base.borrados).toEqual([RUTA])
  })

  it('encabezados de otra plantilla: terminar con el motivo y borrar', async () => {
    const base = new BaseFalsa(IMPORTACION, bytesDe('nombre;telefono\r\nAna;70000001\r\n'))
    await correr(base)
    expect(base.nombres()).toEqual(['importacion_terminar'])
    expect(String(base.llamadas[0]?.args['p_error'])).toMatch(/no tiene las columnas/)
    expect(base.borrados).toEqual([RUTA])
  })

  it('una importación ya terminada: ningún pedido más que leer la fila', async () => {
    const base = new BaseFalsa({ ...IMPORTACION, estado: 'terminada' })
    expect((await correr(base)).estado).toBe('terminada')
    expect(base.llamadas).toEqual([])
    expect(base.borrados).toEqual([])
  })
})
