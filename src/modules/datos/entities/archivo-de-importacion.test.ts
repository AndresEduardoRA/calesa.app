import { describe, expect, it } from 'vitest'
import { leerCsv, textoDeBytes } from '@/shared/lib/csv/leer'
import {
  armarArchivo,
  mapeoDeColumnas,
  normalizarFila,
  rutaDelArchivo,
} from './archivo-de-importacion'
import {
  filaDelLote,
  LIMITES_DEL_ARCHIVO,
  validarEncabezados,
  type EntidadImportable,
  type FilaNormalizada,
} from './plantillas'

const TIPO = '0b6f4c1e-1a2b-4c3d-8e9f-0a1b2c3d4e5f'
const CATEGORIA = '1c7a5d2f-2b3c-4d4e-9f0a-1b2c3d4e5f60'
const USUARIO = '2d8b6e3a-3c4d-4e5f-8a1b-2c3d4e5f6071'
const IMPORTACION = '3e9c7f4b-4d5e-4f6a-9b2c-3d4e5f607182'

// Lo que la función edge hace con el archivo (`supabase/functions/importar-csv/procesar.ts`): leerlo, exigir las columnas y pasar cada fila por
// `filaDelLote` con su número (la 1 del lote es la fila 2 del archivo de la persona: D32).
function comoLoLeeLaFuncion(entidad: EntidadImportable, texto: string) {
  const bytes = textoDeBytes(new TextEncoder().encode(texto), LIMITES_DEL_ARCHIVO)
  if (!bytes.ok) throw new Error(bytes.error.tipo)
  const leido = leerCsv(bytes.texto, LIMITES_DEL_ARCHIVO)
  if (!leido.ok) throw new Error(leido.error.tipo)
  expect(validarEncabezados(entidad, leido.encabezados)).toBeNull()
  return leido.filas.map((celdas, i) => filaDelLote(entidad, celdas, i + 1))
}

const conNumero = (filas: readonly FilaNormalizada[]) =>
  filas.map((fila, i) => ({ fila: i + 1, ...fila }))

describe('armarArchivo: contrato con la función', () => {
  it('leads: lo que lee la función es, fila por fila, lo que dejó la guarda', () => {
    const filas: FilaNormalizada[] = [
      {
        datos: {
          nombre: 'Ana, "la del norte"; sur',
          telefono_principal: '+591 70000001',
          tipo_lead_id: TIPO,
          atributos: { ciudad: 'La Paz; El Alto', nota: 'dijo "sí"\r\nluego no', pisos: 3 },
        },
      },
      { rechazo: { motivo: 'El tipo «X» no existe; los activos: A, B.', campo: 'Tipo' } },
      { datos: { nombre: ' con espacios ', telefono_principal: '70000002', tipo_lead_id: TIPO } },
      { rechazo: { motivo: 'Falta el nombre.' } },
    ]
    const armado = armarArchivo('leads', filas)
    if (!armado.ok) throw new Error(armado.motivo)
    expect(armado.filas).toBe(4)
    expect(armado.validas).toBe(2)
    expect(armado.bytes).toBe(new TextEncoder().encode(armado.texto).length)
    const esperadas = filas.map((fila) => normalizarFila('leads', fila))
    expect(comoLoLeeLaFuncion('leads', armado.texto)).toEqual(conNumero(esperadas))
  })

  it('vehículos: números, sí o no, categoría y atributos llegan con su tipo', () => {
    const filas: FilaNormalizada[] = [
      {
        datos: {
          titulo: 'Toyota, Hilux',
          anio: 2019,
          precio: 12500.5,
          precio_negociable: true,
          acepta_permuta: false,
          kilometraje: 1234567,
          categoria_id: CATEGORIA,
          atributos: { color: 'rojo', extras: ['a', 'b'] },
        },
      },
      { rechazo: { motivo: 'Tiene que ser Sí o No.', campo: 'Placado' } },
    ]
    const armado = armarArchivo('vehiculos', filas)
    if (!armado.ok) throw new Error(armado.motivo)
    const leidas = comoLoLeeLaFuncion('vehiculos', armado.texto)
    expect(leidas).toEqual(conNumero(filas.map((fila) => normalizarFila('vehiculos', fila))))
    expect(leidas[0]).toEqual({ fila: 1, datos: filas[0] && 'datos' in filas[0] && filas[0].datos })
  })
})

describe('normalizarFila: guarda D34', () => {
  const etiquetas: Record<string, string> = { precio: 'Precio', anio: 'Año' }
  const etiquetaDe = (clave: string) => etiquetas[clave]

  it('rechaza lo que la función rechazaría, con la etiqueta como campo', () => {
    const base = { titulo: 'Auto' }
    expect(normalizarFila('vehiculos', { datos: { ...base, precio: 1.005 } }, etiquetaDe)).toEqual({
      rechazo: {
        motivo: 'Tiene que ser un número entre 0 y 999999999999, con punto decimal.',
        campo: 'Precio',
      },
    })
    expect(normalizarFila('vehiculos', { datos: { ...base, anio: 1899 } }, etiquetaDe)).toEqual({
      rechazo: { motivo: 'Tiene que ser un número entero entre 1900 y 2100.', campo: 'Año' },
    })
    expect(normalizarFila('vehiculos', { datos: { ...base, color: 'rojo' } })).toEqual({
      rechazo: { motivo: 'Dato desconocido para la importación.', campo: 'color' },
    })
    expect(
      normalizarFila('leads', {
        datos: { nombre: 'Ana', telefono_principal: '1', tipo_lead_id: TIPO.toUpperCase() },
      }),
    ).toEqual({ rechazo: { motivo: 'No es un identificador válido.', campo: 'tipo_lead_id' } })
  })

  it('omite atributos vacíos y textos vacíos; una fila sin datos queda rechazada', () => {
    expect(
      normalizarFila('leads', { datos: { nombre: 'Ana', atributos: {}, origen_lead_id: '' } }),
    ).toEqual({
      datos: { nombre: 'Ana' },
    })
    expect(normalizarFila('leads', { datos: { atributos: {} } })).toEqual({
      rechazo: { motivo: 'La fila no tiene datos.' },
    })
  })

  it('un rechazo sale con su motivo y su campo dentro de los topes', () => {
    expect(
      normalizarFila('leads', {
        rechazo: { motivo: `  ${'m'.repeat(600)}`, campo: 'c'.repeat(130) },
      }),
    ).toEqual({
      rechazo: { motivo: 'm'.repeat(500), campo: 'c'.repeat(120) },
    })
    expect(normalizarFila('leads', { rechazo: { motivo: '   ', campo: ' ' } })).toEqual({
      rechazo: { motivo: 'La fila no se pudo convertir.' },
    })
  })
})

describe('armarArchivo: topes', () => {
  const fila: FilaNormalizada = {
    datos: { nombre: 'Ana', telefono_principal: '1', tipo_lead_id: TIPO },
  }

  it('sin filas, con más de 20.000 o con más de 10 MB no arma', () => {
    expect(armarArchivo('leads', [])).toEqual({
      ok: false,
      motivo: 'El archivo no tiene filas para importar.',
    })
    expect(
      armarArchivo(
        'leads',
        Array.from({ length: 20001 }, () => fila),
      ),
    ).toEqual({
      ok: false,
      motivo: 'El archivo tiene más de 20000 filas: pártelo en dos.',
    })
    const larga: FilaNormalizada = {
      datos: { nombre: 'Ana', atributos: { nota: 'x'.repeat(19000) } },
    }
    expect(
      armarArchivo(
        'leads',
        Array.from({ length: 600 }, () => larga),
      ),
    ).toEqual({
      ok: false,
      motivo: 'El archivo convertido pasa de 10 MB: pártelo en dos.',
    })
  })

  it('con 20.000 filas arma', () => {
    const armado = armarArchivo(
      'leads',
      Array.from({ length: 20000 }, () => fila),
    )
    expect(armado.ok && armado.validas).toBe(20000)
  })
})

describe('mapeoDeColumnas', () => {
  it('corta, nombra los vacíos y numera los repetidos', () => {
    const mapeo = mapeoDeColumnas(
      ['a'.repeat(130), '', 'Teléfono', 'Teléfono', '__proto__', 'Columna 2'],
      ['nombre', null, 'telefono_principal', null, null, null],
    )
    expect(mapeo).toEqual({
      ['a'.repeat(120)]: 'nombre',
      'Columna 2': null,
      Teléfono: 'telefono_principal',
      'Teléfono (2)': null,
      'Columna 5': null,
      'Columna 2 (2)': null,
    })
    expect(Object.getPrototypeOf(mapeo)).toBe(Object.prototype)
  })

  it('un largo distinto es un error de programación', () => {
    expect(() => mapeoDeColumnas(['a'], [])).toThrow()
  })
})

describe('rutaDelArchivo', () => {
  it('va a la carpeta de quien importa, con el id de la importación en minúsculas', () => {
    expect(rutaDelArchivo(USUARIO, IMPORTACION)).toBe(`${USUARIO}/${IMPORTACION}.csv`)
    expect(() => rutaDelArchivo(USUARIO, '../otro')).toThrow()
    expect(rutaDelArchivo(USUARIO.toUpperCase(), IMPORTACION.toUpperCase())).toBe(
      `${USUARIO}/${IMPORTACION}.csv`,
    )
  })
})
