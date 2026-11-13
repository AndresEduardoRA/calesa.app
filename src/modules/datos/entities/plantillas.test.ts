import { describe, expect, it } from 'vitest'
import { leerCsv, textoDeBytes } from '@/shared/lib/csv/leer'
import {
  escribirArchivo,
  filaDelLote,
  LIMITES_DEL_ARCHIVO,
  PLANTILLAS,
  validarCelda,
  validarEncabezados,
  type FilaNormalizada,
  type Validador,
} from './plantillas'

// Una celda que no puede aparecer por casualidad en un motivo.
const DISTINTIVA = 'ZQXJ-celda-de-una-persona'

describe('validarCelda', () => {
  const casos: [Validador, string, boolean][] = [
    [{ tipo: 'texto', max: 5 }, 'abcde', true],
    [{ tipo: 'texto', max: 5 }, 'abcdef', false],
    [{ tipo: 'uuid' }, '0b6f4c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f', true],
    [{ tipo: 'uuid' }, '0B6F4C1E-1A2B-4C3D-8E9F-0A1B2C3D4E5F', false],
    [{ tipo: 'entero', min: 1900, max: 2100 }, '1900', true],
    [{ tipo: 'entero', min: 1900, max: 2100 }, '1899', false],
    [{ tipo: 'entero', min: 1900, max: 2100 }, '1.5', false],
    [{ tipo: 'entero', min: 0, max: 5000 }, '1e3', false],
    [{ tipo: 'numero', min: 0, max: 10, decimales: 2 }, '0.01', true],
    [{ tipo: 'numero', min: 0, max: 10, decimales: 2 }, '0.001', false],
    [{ tipo: 'numero', min: 0, max: 10, decimales: 2 }, '1,5', false],
    [{ tipo: 'numero', min: 0, max: 10, decimales: 2 }, '-1', false],
    [{ tipo: 'si_no' }, 'true', true],
    [{ tipo: 'si_no' }, 'Sí', false],
    [{ tipo: 'objeto', max: 100 }, '{}', true],
    [{ tipo: 'objeto', max: 100 }, '[]', false],
    [{ tipo: 'objeto', max: 100 }, 'null', false],
    [{ tipo: 'objeto', max: 100 }, '{"a":', false],
    [{ tipo: 'objeto', max: 3 }, '{"a":1}', false],
  ]

  it.each(casos)('%j con %j → %s', (validador, celda, ok) => {
    expect(validarCelda(validador, celda).ok).toBe(ok)
  })

  it('da el valor con su tipo', () => {
    expect(validarCelda({ tipo: 'entero', min: 0, max: 10 }, '7')).toEqual({ ok: true, valor: 7 })
    expect(validarCelda({ tipo: 'numero', min: 0, max: 10, decimales: 2 }, '2.5')).toEqual({
      ok: true,
      valor: 2.5,
    })
    expect(validarCelda({ tipo: 'si_no' }, 'false')).toEqual({ ok: true, valor: false })
    expect(validarCelda({ tipo: 'objeto', max: 100 }, '{"x":[1]}')).toEqual({
      ok: true,
      valor: { x: [1] },
    })
  })

  it('ningún motivo contiene el texto de la celda', () => {
    const validadores: Validador[] = [
      { tipo: 'texto', max: 3 },
      { tipo: 'uuid' },
      { tipo: 'entero', min: 0, max: 10 },
      { tipo: 'numero', min: 0, max: 10, decimales: 2 },
      { tipo: 'si_no' },
      { tipo: 'objeto', max: 100 },
      { tipo: 'objeto', max: 3 },
    ]
    for (const validador of validadores) {
      const resultado = validarCelda(validador, DISTINTIVA)
      expect(resultado.ok).toBe(false)
      if (!resultado.ok) {
        expect(resultado.motivo).not.toContain('ZQXJ')
        expect(resultado.motivo).not.toContain('celda')
      }
    }
  })
})

describe('PLANTILLAS', () => {
  it('leads lleva las claves de _importacion_fila_lead, en su orden', () => {
    // `v_permitidas` de `_importacion_fila_lead()`, en la base
    expect(PLANTILLAS.leads.map((c) => c.clave)).toEqual([
      'nombre',
      'telefono_principal',
      'tipo_lead_id',
      'origen_lead_id',
      'atributos',
    ])
  })

  it('vehiculos lleva las claves de vehiculo_crear, en su orden', () => {
    // las claves que lee `vehiculo_crear()`, en la base
    expect(PLANTILLAS.vehiculos.map((c) => c.clave)).toEqual([
      'titulo',
      'marca',
      'modelo',
      'anio',
      'vin',
      'lote',
      'plataforma',
      'url_origen',
      'precio',
      'precio_negociable',
      'acepta_permuta',
      'placado',
      'kilometraje',
      'categoria_id',
      'atributos',
    ])
  })
})

describe('validarEncabezados', () => {
  const exactos = ['rechazo_motivo', 'rechazo_campo', ...PLANTILLAS.leads.map((c) => c.clave)]

  it('acepta los exactos y rechaza otro orden, uno de más o uno de menos', () => {
    expect(validarEncabezados('leads', exactos)).toBeNull()
    const otroOrden = [exactos[1] ?? '', exactos[0] ?? '', ...exactos.slice(2)]
    for (const malos of [otroOrden, [...exactos, 'extra'], exactos.slice(0, -1)]) {
      expect(validarEncabezados('leads', malos)).toMatch(/no tiene las columnas/)
    }
    expect(validarEncabezados('vehiculos', exactos)).not.toBeNull()
  })
})

describe('filaDelLote', () => {
  const ORIGEN = '0b6f4c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f'

  it('rechazo_motivo gana sobre datos válidos, cortado a 500, y el campo largo se omite', () => {
    expect(filaDelLote('leads', ['No se pudo', 'telefono_principal', 'Ana'], 3)).toEqual({
      fila: 3,
      rechazo: { motivo: 'No se pudo', campo: 'telefono_principal' },
    })
    const largo = filaDelLote('leads', ['m'.repeat(600), 'c'.repeat(121), 'Ana'], 4)
    expect(largo).toEqual({ fila: 4, rechazo: { motivo: 'm'.repeat(500) } })
  })

  it('la primera columna inválida da su clave como campo, sin la celda', () => {
    const fila = filaDelLote('leads', ['', '', 'Ana', '7000', DISTINTIVA, 'otro-malo', ''], 9)
    expect(fila).toEqual({
      fila: 9,
      rechazo: { motivo: 'No es un identificador válido.', campo: 'tipo_lead_id' },
    })
  })

  it('omite las vacías y deja {} si todas lo están', () => {
    expect(filaDelLote('leads', ['', '', 'Ana', '', '', ORIGEN, ''], 1)).toEqual({
      fila: 1,
      datos: { nombre: 'Ana', origen_lead_id: ORIGEN },
    })
    expect(filaDelLote('leads', ['', '', '', '', '', '', ''], 2)).toEqual({ fila: 2, datos: {} })
  })
})

describe('escribirArchivo → leerCsv → filaDelLote', () => {
  it('ida y vuelta de leads con celdas difíciles', () => {
    const filas: FilaNormalizada[] = [
      {
        datos: {
          nombre: 'Pérez, "el Toro"; Juan',
          telefono_principal: ' 70000001',
          origen_lead_id: '0b6f4c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f',
          atributos: { nota: 'línea 1\nlínea 2 "citada"', monto: 12.5, vip: true },
        },
      },
      { rechazo: { motivo: 'El tipo «Frío» no existe.', campo: 'tipo_lead_id' } },
      { datos: { nombre: '=SUMA(A1:A2)', telefono_principal: '+59170000002' } },
      { rechazo: { motivo: 'Fila vacía' } },
    ]
    const texto = escribirArchivo('leads', filas)
    const bytes = textoDeBytes(new TextEncoder().encode(texto), LIMITES_DEL_ARCHIVO)
    expect(bytes.ok).toBe(true)
    if (!bytes.ok) return
    const leido = leerCsv(bytes.texto, LIMITES_DEL_ARCHIVO)
    expect(leido.ok).toBe(true)
    if (!leido.ok) return
    expect(leido.delimitador).toBe(',')
    expect(validarEncabezados('leads', leido.encabezados)).toBeNull()
    const vueltas = leido.filas.map((celdas, i) => filaDelLote('leads', celdas, i + 1))
    expect(vueltas).toEqual(filas.map((f, i) => ({ fila: i + 1, ...f })))
  })

  it('ida y vuelta de vehículos con números y sí/no', () => {
    const filas: FilaNormalizada[] = [
      {
        datos: {
          titulo: 'Toyota Corolla 2018',
          anio: 2018,
          precio: 12500.75,
          precio_negociable: true,
          acepta_permuta: false,
          kilometraje: 0,
        },
      },
    ]
    const leido = leerCsv(escribirArchivo('vehiculos', filas), LIMITES_DEL_ARCHIVO)
    expect(leido.ok).toBe(true)
    if (!leido.ok) return
    expect(leido.filas.map((c, i) => filaDelLote('vehiculos', c, i + 1))).toEqual([
      { fila: 1, ...filas[0] },
    ])
  })
})
