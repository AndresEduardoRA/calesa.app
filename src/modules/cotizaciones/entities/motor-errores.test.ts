import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { esquemaFormula, type Formula, type ModoDeCambio } from './formula'
import { evaluar } from './motor'
import { esquemaEntrada, type Entrada } from './motor-entrada'
import { ErrorDelMotor } from './motor-errores'
import { validarFormula } from './validar'

// La ruta va por una variable: con un literal, Vite reescribe `new URL('./…', import.meta.url)` como un recurso.
const leer = (ruta: string): unknown =>
  JSON.parse(readFileSync(new URL(ruta, import.meta.url), 'utf8'))
const juego = leer('./casos-de-formula.json') as {
  casos: { nombre: string; definicion: unknown; params: unknown }[]
}

// Una fórmula del juego de fórmulas, validada.
function delJuego(nombre: string): Formula {
  const c = juego.casos.find((x) => x.nombre === nombre)
  const r = validarFormula(c?.definicion, c?.params)
  if (!r.ok) throw new Error(r.error.mensaje)
  return r.formula
}

// Una fórmula con la forma del Zod pero sin las reglas cruzadas: el motor revisa sus rasgos antes que nada.
const conForma = (nodos: unknown[], extra: Record<string, unknown> = {}): Formula =>
  esquemaFormula.parse({ definicion: { nodos, buckets: { b: 'tc' }, ...extra }, params: {} })

const TC = { id: 'tc', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'TC' }
const TOTAL = {
  id: 'total',
  tipo: 'calculo',
  op: 'suma',
  de: ['a'],
  etiqueta: 'T',
  salida: 'total',
  bucket: 'b',
}
const A = { id: 'a', tipo: 'input', etiqueta: 'A' }

const entrada = (x: Partial<Entrada> = {}): Entrada =>
  esquemaEntrada.parse({
    inputs: {},
    banderas: {},
    tipos_cambio: { oficial: 1 },
    vehiculo: {},
    tablas: {},
    ...x,
  })

// Lo que lanza `evaluar`, o «no lanzó».
function lanzado(
  f: () => unknown,
): { codigo: string; donde?: string; message: string } | 'no lanzó' {
  try {
    f()
  } catch (e) {
    if (e instanceof ErrorDelMotor) return { codigo: e.codigo, donde: e.donde, message: e.message }
    throw e
  }
  return 'no lanzó'
}

describe('ErrorDelMotor', () => {
  it('es un Error con su nombre, su código y dónde', () => {
    const e = new ErrorDelMotor('modo_invalido', 'x', 'buckets.b')
    expect([e instanceof Error, e.name, e.codigo, e.donde, e.message]).toEqual([
      true,
      'ErrorDelMotor',
      'modo_invalido',
      'buckets.b',
      'x',
    ])
  })
})

describe('lo que el motor todavía no evalúa lanza y nombra el rasgo (llega con los overrides)', () => {
  it('lo sobrescribible: el Excel entero y «Amnistia»', () => {
    for (const nombre of [
      'excel: las cuatro cotizaciones en una fórmula con su variante',
      'excel: la multa de «Amnistia», gasolina y gas',
    ]) {
      const e = lanzado(() => evaluar(delJuego(nombre), entrada({ variante: 'gasolina' })))
      expect(e, nombre).toMatchObject({
        codigo: 'rasgo_pendiente',
        message: expect.stringContaining('«sobrescribible»'),
      })
    }
  })

  it('sugerido_de lanza sólo si el input llega sin tipear: con valor tipeado, el número es lo tipeado', () => {
    const semilla = delJuego('semilla: subasta_usa')
    const e = lanzado(() => evaluar(semilla, entrada({ inputs: { remate: 10000 } })))
    expect(e).toMatchObject({
      codigo: 'rasgo_pendiente',
      donde: 'fob_tabla',
      message: expect.stringContaining('«sugerido_de»'),
    })
    const tipeado = evaluar(semilla, entrada({ inputs: { remate: 10000, fob_tabla: 12000 } }))
    expect(tipeado.valores['fob_tabla']).toBe(12000)
  })
})

describe('la variante que elige la entrada', () => {
  const OPCION = {
    id: 'v',
    tipo: 'opcion',
    etiqueta: 'V',
    opciones: [
      { clave: 'a', etiqueta: 'A', titulo: 'A' },
      { clave: 'b', etiqueta: 'B', titulo: 'B' },
    ],
  }
  const conVariante = (porDefecto?: string) => {
    const r = validarFormula(
      {
        nodos: [
          { ...OPCION, ...(porDefecto === undefined ? {} : { por_defecto: porDefecto }) },
          TC,
          A,
          TOTAL,
        ],
        buckets: { b: 'tc' },
      },
      {},
    )
    if (!r.ok) throw new Error(r.error.mensaje)
    return r.formula
  }

  it('una clave que la variante no tiene, o una clave sin variante, es un error de llamada', () => {
    expect(lanzado(() => evaluar(conVariante('a'), entrada({ variante: 'c' })))).toMatchObject({
      codigo: 'entrada_invalida',
      donde: 'v',
    })
    expect(
      lanzado(() => evaluar(conForma([TC, A, TOTAL]), entrada({ variante: 'a' }))),
    ).toMatchObject({ codigo: 'entrada_invalida' })
  })

  it('sin clave vale la por defecto; sin clave ni por defecto, es un error de llamada', () => {
    expect(evaluar(conVariante('b'), entrada()).valores['v']).toBe('b')
    expect(lanzado(() => evaluar(conVariante(), entrada()))).toMatchObject({
      codigo: 'entrada_invalida',
      donde: 'v',
    })
  })

  it('dos variantes, o un solo_en sin variante, son una fórmula sin validar', () => {
    const dos = conForma([OPCION, { ...OPCION, id: 'w' }, TC, A, TOTAL])
    const sinVariante = conForma([TC, { ...A, solo_en: ['a'] }, TOTAL])
    expect(lanzado(() => evaluar(dos, entrada()))).toMatchObject({
      codigo: 'formula_sin_validar',
      donde: 'w',
    })
    expect(lanzado(() => evaluar(sinVariante, entrada()))).toMatchObject({
      codigo: 'formula_sin_validar',
      donde: 'a',
    })
  })
})

describe('un modo que no corresponde a la fórmula es un error de llamada', () => {
  const moto = () => {
    const nodos = [
      TC,
      { id: 'tc_p', tipo: 'tipo_cambio', clave: 'paralelo', etiqueta: 'P' },
      { ...A, grupo: 'g' },
      { id: 'n', tipo: 'input', etiqueta: 'N', grupo: 'h' },
      { id: 'total', tipo: 'calculo', op: 'suma', de: ['a', 'n'], etiqueta: 'T', salida: 'total' },
    ]
    const grupos = [
      { id: 'g', etiqueta: 'G', tono: 't', bucket: 'exterior' },
      { id: 'h', etiqueta: 'H', tono: 't', bucket: 'aduana' },
    ]
    const r = validarFormula(
      { nodos, buckets: { exterior: 'tc_p', aduana: 'tc' }, total_en: 'tc_p', grupos },
      {},
    )
    if (!r.ok) throw new Error(r.error.mensaje)
    return r.formula
  }
  const modos: [string, ModoDeCambio, string][] = [
    [
      'un bucket nombra un nodo que no es un tipo de cambio',
      { buckets: { exterior: 'a', aduana: 'tc' }, total_en: 'tc' },
      'buckets.exterior',
    ],
    [
      'el total_en no es un tipo de cambio',
      { buckets: { exterior: 'tc_p', aduana: 'tc' }, total_en: 'n' },
      'total_en',
    ],
    [
      'no cubre el bucket de un grupo',
      { buckets: { exterior: 'tc_p' }, total_en: 'tc_p' },
      'aduana',
    ],
  ]
  it.each(modos)('%s', (_, modo, donde) => {
    expect(lanzado(() => evaluar(moto(), entrada(), modo))).toMatchObject({
      codigo: 'modo_invalido',
      donde,
    })
  })

  it('sin grupos, tampoco puede dejar sin cubrir el bucket del total', () => {
    const f = delJuego('semilla: oficina')
    const modo = { buckets: { destino: 'tc_paralelo' }, total_en: 'tc_paralelo' }
    expect(lanzado(() => evaluar(f, entrada(), modo))).toMatchObject({
      codigo: 'modo_invalido',
      donde: 'origen',
    })
  })
})

describe('la entrada y la fórmula', () => {
  const f = conForma([TC, { id: 'f', tipo: 'bandera', etiqueta: 'F' }, A, TOTAL])

  it('una clave de inputs que no es un input, o de banderas que no es una bandera, es un error de llamada', () => {
    const malas: Partial<Entrada>[] = [
      { inputs: { f: 1 } },
      { inputs: { nada: 1 } },
      { banderas: { a: true } },
    ]
    for (const x of malas) {
      expect(
        lanzado(() => evaluar(f, entrada(x))),
        JSON.stringify(x),
      ).toMatchObject({ codigo: 'entrada_invalida' })
    }
  })

  it('una fórmula que no pasó por validarFormula lanza en vez de inventar un número', () => {
    const adelante = conForma([TC, { ...TOTAL, de: ['a'] }, A])
    const sinTotal = conForma([TC, A])
    expect(lanzado(() => evaluar(adelante, entrada()))).toMatchObject({
      codigo: 'formula_sin_validar',
    })
    expect(lanzado(() => evaluar(sinTotal, entrada()))).toMatchObject({
      codigo: 'formula_sin_validar',
    })
  })
})
