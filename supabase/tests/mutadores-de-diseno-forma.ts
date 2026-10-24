// Los mutadores del corpus de `validar_diseno()` que rompen la FORMA: uno por cada comprobación `/*Dnn*/` de la migración
// (`…005600_validar_diseno.sql`), así una prueba de mutación que apague una cae en el corpus. Cada uno cambia un objeto del diseño; el
// nombre lleva la marca. La clave `__proto__` no está: JS no puede guardarla en un registro, y la prueban los casos a mano del juego.
import { elegir, esObjeto, type Json, type Objeto } from './mutadores-de-formula'
import {
  deTipo,
  itemsDe,
  modos,
  raiz,
  secciones,
  tarjeta,
  type Entrada,
  type MutadorDeDiseno,
} from './mutadores-de-diseno-base'
import type { Azar } from './mutadores-de-formula'

type Objetivo = (e: Entrada, azar: Azar) => Objeto | undefined
const lista = (x: Json | undefined): Json[] => (Array.isArray(x) ? x : [])

const cabecera: Objetivo = (e) => {
  const c = raiz(e)?.['cabecera']
  return esObjeto(c) ? c : undefined
}
const unModo: Objetivo = (e, azar) => elegir(azar, modos(e))
const unBucket: Objetivo = (e, azar) => {
  const m = elegir(azar, modos(e))
  return m ? elegir(azar, lista(m['buckets']).filter(esObjeto)) : undefined
}
const unaSeccion: Objetivo = (e, azar) => elegir(azar, secciones(e))
const unItem =
  (...tipos: string[]): Objetivo =>
  (e, azar) =>
    elegir(azar, itemsDe(e, deTipo(...tipos)))?.it
const laTarjeta: Objetivo = (e) => tarjeta(e)

// Un mutador de forma: busca su objeto, lo cambia y dice qué hizo.
function forma(
  marca: string,
  objetivo: Objetivo,
  cambiar: (o: Objeto, azar: Azar) => string,
): MutadorDeDiseno {
  return {
    nombre: `forma_${marca}`,
    aplicar: (e, azar) => {
      const o = objetivo(e, azar)
      return o ? `forma_${marca}(${cambiar(o, azar)})` : null
    },
  }
}
const poner =
  (clave: string, valor: Json) =>
  (o: Objeto): string => {
    o[clave] = valor
    return `${clave}=${[...JSON.stringify(valor)].slice(0, 20).join('')}`
  }
const sobra = poner('clase', 'text-red-500')

// Un cambio de la raíz o de un lugar de una lista: reemplaza el elemento entero.
function reemplazar(
  marca: string,
  donde: (e: Entrada, azar: Azar) => Json[] | undefined,
  valor: Json,
) {
  return {
    nombre: `forma_${marca}`,
    aplicar: (e: Entrada, azar: Azar) => {
      const l = donde(e, azar)
      if (!l || l.length === 0) return null
      const i = azar.entero(l.length)
      l[i] = valor
      return `forma_${marca}(${i})`
    },
  }
}

export const MUTADORES_DE_FORMA_DE_DISENO: readonly MutadorDeDiseno[] = [
  {
    nombre: 'forma_D01',
    aplicar: (e, azar) => {
      e.diseno = elegir(azar, [[], 'hola', 7, null] as Json[]) ?? []
      return 'forma_D01'
    },
  },
  {
    nombre: 'forma_D02',
    aplicar: (e, azar) => {
      const r = raiz(e)
      if (!r) return null
      const v = elegir(azar, [[], 'x', 7, null, undefined] as (Json | undefined)[])
      if (v === undefined) delete r['cabecera']
      else r['cabecera'] = v
      return 'forma_D02'
    },
  },
  forma('D03', cabecera, sobra),
  forma('D04', cabecera, (c, azar) =>
    poner('ver_total_bs', elegir(azar, ['si', 1, null] as Json[]) ?? 1)(c),
  ),
  forma('D05', cabecera, poner('modos', {})),
  reemplazar(
    'D06',
    (e, azar) => {
      const m = cabecera(e, azar)?.['modos']
      return Array.isArray(m) ? m : undefined
    },
    'paralelo',
  ),
  forma('D07', unModo, sobra),
  forma('D08', unModo, poner('clave', 'Paralelo')),
  forma('D09', unModo, (m, azar) => poner('nombre', azar.entero(2) === 0 ? '' : 'x'.repeat(41))(m)),
  forma('D10', unModo, poner('total_en', 'Mala')),
  forma('D11', unModo, poner('buckets', 'x')),
  forma('D32', unModo, poner('buckets', [])),
  forma(
    'D12',
    (e, azar) => unModo(e, azar),
    (m) => {
      const bs = m['buckets']
      if (Array.isArray(bs)) bs[0] = 'x'
      return 'buckets[0]=x'
    },
  ),
  forma('D13', unBucket, sobra),
  forma('D14', unBucket, poner('bucket', 'Mala')),
  forma('D15', unBucket, poner('nodo', 'Mala')),
  forma('D16', (e) => raiz(e), poner('secciones', {})),
  forma('D33', (e) => raiz(e), poner('secciones', [])),
  reemplazar(
    'D17',
    (e) => {
      const s = raiz(e)?.['secciones']
      return Array.isArray(s) ? s : undefined
    },
    'x',
  ),
  forma('D18', unaSeccion, poner('estilo', 'color: red')),
  forma('D19', unaSeccion, poner('id', 'Mala')),
  forma('D20', unaSeccion, (s, azar) =>
    poner('titulo', elegir(azar, [null, '', '😀'.repeat(81)] as Json[]) ?? null)(s),
  ),
  forma('D21', unaSeccion, poner('presentacion', 'modal')),
  forma('D22', unaSeccion, poner('nivel_ver', 'Mala')),
  forma('D23', unaSeccion, poner('nivel_editar', 5)),
  forma('D24', unaSeccion, poner('items', {})),
  forma('D34', unaSeccion, poner('items', [])),
  forma('D26', (e) => raiz(e), poner('tarjeta_total', 'x')),
  forma('D27', laTarjeta, sobra),
  forma('D28', laTarjeta, poner('nodo', 'TOTAL')),
  forma('D29', laTarjeta, poner('secundarios', 'x')),
  forma('D30', laTarjeta, poner('secundarios', [1])),
  forma('D31', (e) => raiz(e), poner('tema', 'oscuro')),
  reemplazar(
    'D40',
    (e, azar) => {
      const s = elegir(azar, secciones(e))
      const items = s?.['items']
      return Array.isArray(items) ? items : undefined
    },
    'x',
  ),
  forma(
    'D41',
    unItem('celda', 'atajos', 'variante', 'interruptor', 'subtotal'),
    poner('tipo', 'grafico'),
  ),
  forma(
    'D42',
    unItem('celda', 'atajos', 'variante', 'interruptor', 'subtotal'),
    poner('color', '#ff0000'),
  ),
  forma(
    'D43',
    unItem('celda', 'atajos', 'variante', 'interruptor', 'subtotal'),
    poner('nodo', 'Mala'),
  ),
  forma('D44', unItem('celda'), (c, azar) =>
    poner('ancho', elegir(azar, ['50%', 'mitad; color: red', 'grande'] as Json[]) ?? '50%')(c),
  ),
  forma('D45', unItem('celda'), poner('secundario', 'otro')),
  forma('D46', unItem('celda'), poner('nivel_ver', 5)),
  forma('D47', unItem('celda'), poner('nivel_editar', 'Mala')),
  forma('D48', unItem('celda'), poner('ayuda', 'x')),
  forma('D49', unItem('celda'), poner('ayuda', { tabla: 'una_tabla', texto: 'x' })),
  forma('D50', unItem('celda'), poner('ayuda', { tabla: 'Mala' })),
  forma('D51', unItem('celda'), poner('ayuda', { texto: 'x', color: 'rojo' })),
  forma('D52', unItem('celda'), (c, azar) =>
    poner('ayuda', { texto: azar.entero(2) === 0 ? '' : 'x'.repeat(301) })(c),
  ),
  forma('D53', unItem('celda'), poner('ayuda', {})),
  forma('D54', unItem('atajos'), poner('columna', 'Mala')),
  forma('D55', unItem('atajos'), poner('filas', '8')),
  forma('D56', unItem('atajos'), poner('filas', 0)),
  forma('D57', unItem('atajos'), (a, azar) =>
    poner('filas', elegir(azar, [13, 100] as Json[]) ?? 13)(a),
  ),
  forma('D58', unItem('atajos'), (a, azar) =>
    poner('filas', elegir(azar, [1.5, 0.5, 12.5] as Json[]) ?? 1.5)(a),
  ),
  forma('D59', unItem('interruptor'), poner('efecto', 'otro')),
]
