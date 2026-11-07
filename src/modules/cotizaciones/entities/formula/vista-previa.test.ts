import { describe, expect, it } from 'vitest'
import type { Formula } from '../formula'
import { evaluar } from '../motor'
import { validarFormula } from '../validar'
import { entradaDePrueba, TERRENO_VACIO, type TerrenoDePrueba } from './terreno-de-prueba'
import { calcularLaVistaPrevia, cifraDeLaFila } from './vista-previa'

// valor (input), anio (input), tc (oficial), f (el factor del tramo de «dep»), base = 900, doble = base*2, un cálculo por el tramo y el total.
function formulaValida(extra: Record<string, unknown> = {}): Formula {
  const definicion = {
    nodos: [
      { id: 'tc', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'TC', formato: 'raw' },
      { id: 'valor', tipo: 'input', etiqueta: 'Valor', formato: 'usd' },
      { id: 'anio', tipo: 'input', etiqueta: 'Año' },
      {
        id: 'f',
        tipo: 'tramo',
        etiqueta: 'Factor',
        tabla: 'dep',
        sobre: 'anio',
        columna: 'factor',
      },
      { id: 'base', tipo: 'constante', etiqueta: 'Base', formato: 'usd' },
      { id: 'opc', tipo: 'bandera', etiqueta: 'Opción' },
      {
        id: 'doble',
        tipo: 'calculo',
        op: 'multiplicar',
        etiqueta: 'Doble',
        de: ['base', 'tc'],
        formato: 'usd',
      },
      {
        id: 'total',
        tipo: 'calculo',
        op: 'suma',
        etiqueta: 'Total',
        de: ['doble', 'f'],
        salida: 'total',
        bucket: 'b',
        formato: 'usd',
      },
    ],
    buckets: { b: 'tc' },
    ...extra,
  }
  const v = validarFormula(definicion, { base: 900 })
  if (!v.ok) throw new Error(v.error.mensaje)
  return v.formula
}

function variantesSinDefecto(): Formula {
  const definicion = {
    nodos: [
      { id: 'tc', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'TC' },
      {
        id: 'v',
        tipo: 'opcion',
        etiqueta: 'Variante',
        opciones: [
          { clave: 'a', etiqueta: 'A', titulo: 'Opción A' },
          { clave: 'b', etiqueta: 'B', titulo: 'Opción B' },
        ],
      },
      { id: 'k', tipo: 'constante', etiqueta: 'K', solo_en: ['a'] },
      {
        id: 'total',
        tipo: 'calculo',
        op: 'suma',
        etiqueta: 'Total',
        de: ['k'],
        salida: 'total',
        bucket: 'b',
      },
    ],
    buckets: { b: 'tc' },
  }
  const v = validarFormula(definicion, { k: 3 })
  if (!v.ok) throw new Error(v.error.mensaje)
  return v.formula
}

function variantesYCondicion(): { formula: Formula } {
  const definicion = {
    nodos: [
      { id: 'tc', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'TC' },
      {
        id: 'v',
        tipo: 'opcion',
        etiqueta: 'Variante',
        por_defecto: 'a',
        opciones: [
          { clave: 'a', etiqueta: 'A', titulo: 'Opción A' },
          { clave: 'b', etiqueta: 'B', titulo: 'Opción B' },
        ],
      },
      { id: 'flag', tipo: 'bandera', etiqueta: 'Flag' },
      { id: 'ka', tipo: 'constante', etiqueta: 'KA', solo_en: ['a'] },
      { id: 'kb', tipo: 'constante', etiqueta: 'KB', solo_en: ['b'] },
      { id: 'kc', tipo: 'constante', etiqueta: 'KC', condicion: 'flag' },
      {
        id: 'total',
        tipo: 'calculo',
        op: 'suma',
        etiqueta: 'Total',
        de: ['ka'],
        salida: 'total',
        bucket: 'b',
      },
    ],
    buckets: { b: 'tc' },
  }
  const v = validarFormula(definicion, { ka: 1, kb: 2, kc: 3 })
  if (!v.ok) throw new Error(v.error.mensaje)
  return v
}

const terreno: TerrenoDePrueba = {
  tipos_cambio: { oficial: 2 },
  tablas: { dep: [{ desde: 0, hasta: 5, factor: 0.5 }] },
  avisos: [],
}

describe('calcularLaVistaPrevia', () => {
  it('iguala a evaluar() directo con las cifras de prueba', () => {
    const f = formulaValida()
    const v = calcularLaVistaPrevia(f, terreno)
    const r = evaluar(f, entradaDePrueba(terreno))
    expect(v.tipo).toBe('calculada')
    if (v.tipo !== 'calculada') return
    expect(Object.fromEntries(v.valores)).toEqual(r.valores)
    expect(Object.fromEntries(v.estados)).toEqual(r.estados)
    expect(v.totales).toEqual({ usd: r.totales.usd, bs: r.totales.bs })
    expect(v.valores.get('doble')).toBe(1800)
    expect(v.valores.get('f')).toBe(0.5)
  })

  it('un tipo de cambio ausente da null con su faltante', () => {
    const v = calcularLaVistaPrevia(formulaValida(), { ...TERRENO_VACIO, tablas: terreno.tablas })
    expect(v.tipo).toBe('calculada')
    if (v.tipo !== 'calculada') return
    expect(v.valores.get('tc')).toBeNull()
    expect(v.faltantes.get('tc')).toBe('tipo_de_cambio_sin_valor')
    expect(v.valores.get('doble')).toBeNull()
    expect(v.faltantes.has('doble')).toBe(false)
  })

  it('la tabla congelada manda sobre una viva distinta (D5)', () => {
    const congelada: Formula = {
      ...formulaValida(),
      params: {
        constantes: { base: 900 },
        tablas: { dep: [{ desde: 0, hasta: 5, factor: 0.9 }] },
      },
    }
    const v = calcularLaVistaPrevia(congelada, terreno)
    expect(v.tipo).toBe('calculada')
    if (v.tipo !== 'calculada') return
    expect(v.valores.get('f')).toBe(0.9)
  })

  it('una tabla sin filas deja el tramo sin cifra', () => {
    const v = calcularLaVistaPrevia(formulaValida(), { ...terreno, tablas: {} })
    expect(v.tipo).toBe('calculada')
    if (v.tipo !== 'calculada') return
    expect(v.valores.get('f')).toBeNull()
    expect(v.faltantes.get('f')).toBe('tabla_sin_filas')
  })

  it('sin fórmula validada es no_valida', () => {
    expect(calcularLaVistaPrevia(null, terreno)).toEqual({ tipo: 'no_valida' })
  })

  it('una variante sin opción por defecto da no_calcula y no lanza', () => {
    expect(calcularLaVistaPrevia(variantesSinDefecto(), terreno)).toEqual({ tipo: 'no_calcula' })
  })

  it('no muta lo que recibe', () => {
    const f = formulaValida()
    const antes = JSON.stringify(f)
    const t = JSON.stringify(terreno)
    calcularLaVistaPrevia(f, terreno)
    expect(JSON.stringify(f)).toBe(antes)
    expect(JSON.stringify(terreno)).toBe(t)
  })
})

describe('cifraDeLaFila', () => {
  const f = formulaValida()
  const nodo = (id: string) => {
    const n = f.definicion.nodos.find((x) => x.id === id)
    if (!n) throw new Error(id)
    return n
  }

  it('un cálculo y una constante dan su valor con el formato de su nodo', () => {
    const v = calcularLaVistaPrevia(f, terreno)
    expect(cifraDeLaFila(v, nodo('doble'))).toEqual({ tipo: 'valor', valor: 1800, formato: 'usd' })
    expect(cifraDeLaFila(v, nodo('base'))).toEqual({ tipo: 'valor', valor: 900, formato: 'usd' })
  })

  it('un input vale 0', () => {
    expect(cifraDeLaFila(calcularLaVistaPrevia(f, terreno), nodo('valor'))).toEqual({
      tipo: 'valor',
      valor: 0,
      formato: 'usd',
    })
  })

  it('una bandera no dibuja nada, ni sin vista calculada', () => {
    const v = calcularLaVistaPrevia(f, terreno)
    expect(cifraDeLaFila(v, nodo('opc'))).toEqual({ tipo: 'nada' })
    expect(cifraDeLaFila({ tipo: 'no_valida' }, nodo('doble'))).toEqual({ tipo: 'nada' })
  })

  it('null con su faltante, o sin faltante propio si nace aguas arriba', () => {
    const v = calcularLaVistaPrevia(f, { ...terreno, tipos_cambio: {} })
    expect(cifraDeLaFila(v, nodo('tc'))).toEqual({
      tipo: 'sin_cifra',
      faltante: 'tipo_de_cambio_sin_valor',
    })
    expect(cifraDeLaFila(v, nodo('doble'))).toEqual({ tipo: 'sin_cifra', faltante: null })
  })
})

describe('cifraDeLaFila con variante y condición', () => {
  it('fuera de la variante o con la condición apagada, apagada (sin cifra 0)', () => {
    const validada = variantesYCondicion()
    const v = calcularLaVistaPrevia(validada.formula, terreno)
    const n = (id: string) => {
      const nodo = validada.formula.definicion.nodos.find((x) => x.id === id)
      if (!nodo) throw new Error(id)
      return nodo
    }
    expect(cifraDeLaFila(v, n('kb'))).toEqual({
      tipo: 'apagada',
      estado: 'fuera_de_variante',
    })
    expect(cifraDeLaFila(v, n('kc'))).toEqual({
      tipo: 'apagada',
      estado: 'condicion_apagada',
    })
    expect(cifraDeLaFila(v, n('v'))).toEqual({
      tipo: 'texto',
      texto: 'a',
    })
  })
})
