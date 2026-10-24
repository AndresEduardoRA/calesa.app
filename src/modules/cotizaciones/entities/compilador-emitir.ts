// De un árbol a nodos del grafo (docs/COTIZADOR.md › «Fórmulas como texto (4.07)»). Una pasada en post-orden con pila explícita:
// los hijos de izquierda a derecha y después el padre. Cada operación anidada y cada número escrito es un nodo auxiliar
// `<destino>__<n>`, con `n` desde 1 en ese orden; la raíz es la fila que se compila y no se numera. Un nombre no crea nodo.
import {
  argumentoInvalido,
  error,
  type Arbol,
  type Calculo,
  type ErrorCrudo,
  type Numero,
} from './compilador-arbol'
import type { Nombres } from './compilador-nombres'
import { esta, type Medidor } from './medidor'
import type { Nodo, NodoCalculo } from './nodos'

export type Emitido = {
  nodos: Nodo[]
  params: Record<string, number>
  // El tramo del texto de cada nodo que se emitió, por id (todavía sin línea ni columna).
  rangos: Map<string, { desde: number; hasta: number }>
}

type Comunes = Partial<
  Pick<NodoCalculo, 'formato' | 'descripcion' | 'grupo' | 'salida' | 'bucket' | 'solo_en'>
>

const ANCHO_DE_ETIQUETA = 80
const LECTURA_DE_ETIQUETA = 100

// El fragmento del texto con los espacios juntos, a lo sumo 80 caracteres.
function etiquetaDe(texto: string, desde: number, hasta: number, m: Medidor): string {
  const trozo = texto.slice(desde, Math.min(hasta, desde + LECTURA_DE_ETIQUETA))
  let s = ''
  let espacio = false
  for (let i = 0; i < trozo.length; i += 1) {
    m.visitas += 1
    const c = trozo.charCodeAt(i)
    if (c === 32 || c === 9 || c === 10 || c === 13 || c === 160) espacio = true
    else {
      if (espacio) s += ' '
      espacio = false
      s += trozo.charAt(i)
    }
  }
  const largo = s.length > ANCHO_DE_ETIQUETA || hasta - desde > LECTURA_DE_ETIQUETA
  return largo ? `${s.slice(0, ANCHO_DE_ETIQUETA - 1)}…` : s || '·'
}

// El id del auxiliar n: si no cabe en 41, se recorta el prefijo.
function idAuxiliar(destino: string, n: number): string {
  const sufijo = `__${String(n)}`
  return destino.slice(0, 41 - sufijo.length) + sufijo
}

function comunesDe(d: Nombres['destino']): Comunes {
  const c: Comunes = {}
  if (d.formato !== undefined) c.formato = d.formato
  if (d.descripcion !== undefined) c.descripcion = d.descripcion
  if (d.grupo !== undefined) c.grupo = d.grupo
  if (d.salida !== undefined) c.salida = d.salida
  if (d.bucket !== undefined) c.bucket = d.bucket
  if (d.solo_en !== undefined) c.solo_en = d.solo_en
  return c
}

type Datos = {
  id: string
  a: Calculo
  de: string[]
  pct: string | undefined
  etiqueta: string
  comunes: Comunes
}

// Las operaciones que sólo llevan `de` (y el pct de PORCENTAJE_DE).
function calculoSimple({ id, a, de, pct, etiqueta, comunes }: Datos): Nodo | undefined {
  const base = { id, tipo: 'calculo' as const, etiqueta, ...comunes }
  const [x = '', y = ''] = de
  switch (a.op) {
    case 'suma':
    case 'multiplicar':
    case 'restar':
      return { ...base, op: a.op, de }
    case 'dividir':
      return { ...base, op: 'dividir', de: [x, y] }
    case 'porcentaje_de':
      return { ...base, op: 'porcentaje_de', de, pct: pct ?? '' }
    case 'si':
    case 'redondear':
    case 'depreciar':
      return undefined
  }
}

// Las que traen campos propios.
function calculoConCampos({ id, a, de, etiqueta, comunes }: Datos): Nodo {
  const base = { id, tipo: 'calculo' as const, etiqueta, ...comunes }
  const [x = ''] = de
  const c = a.campos
  if (a.op === 'si') return { ...base, op: 'si', de: [x], condicion: c.condicion ?? '' }
  if (a.op === 'redondear') return { ...base, op: 'redondear', de: [x], n: c.n ?? 0 }
  return {
    ...base,
    op: 'depreciar',
    de: [x],
    tabla: c.tabla ?? '',
    sobre: c.sobre ?? '',
    columna: c.columna ?? '',
  }
}

const nodoDeCalculo = (d: Datos): Nodo => calculoSimple(d) ?? calculoConCampos(d)

type Marca = { a: Arbol; i: number }

type Emision = {
  texto: string
  raiz: Arbol
  nombres: Nombres
  comunes: Comunes
  salida: Emitido
  ids: string[]
  n: number
}

// El próximo hijo por visitar: los términos y, al final, el pct.
function hijoPendiente(marca: Marca): Arbol | undefined {
  const a = marca.a
  if (a.k !== 'calc') return undefined
  const hijo =
    marca.i < a.hijos.length ? a.hijos[marca.i] : marca.i === a.hijos.length ? a.pct : undefined
  if (hijo !== undefined) marca.i += 1
  return hijo
}

// El id del nodo que nace de `a`: el de la fila si es la raíz, o el auxiliar que toca.
function nuevoId(em: Emision, a: Arbol): string | ErrorCrudo {
  if (a === em.raiz) return em.nombres.destino.id
  em.n += 1
  const id = idAuxiliar(em.nombres.destino.id, em.n)
  const ocupado = esta(em.nombres.ocupados, id, em.nombres.m)
  return ocupado ? error('auxiliar_ocupado', a.desde, a.hasta, { nombre: id }) : id
}

function emitirNumero(em: Emision, a: Numero, id: string, etiqueta: string) {
  const esRaiz = a === em.raiz
  em.salida.params[id] = a.valor
  const formato = esRaiz
    ? (em.nombres.destino.formato ?? (a.pct ? 'pct' : undefined))
    : a.pct || a.comoPct
      ? 'pct'
      : 'raw'
  em.salida.nodos.push({
    id,
    tipo: 'constante',
    etiqueta,
    ...(esRaiz ? em.comunes : {}),
    ...(formato === undefined ? {} : { formato }),
  })
}

function emitirCalculo(em: Emision, a: Calculo, id: string, etiqueta: string) {
  const pct = a.pct === undefined ? undefined : em.ids.pop()
  const de = em.ids.splice(em.ids.length - a.hijos.length, a.hijos.length)
  const comunes = a === em.raiz ? em.comunes : {}
  em.salida.nodos.push(nodoDeCalculo({ id, a, de, pct, etiqueta, comunes }))
}

// Un nodo ya con todos sus hijos emitidos.
function emitirUno(em: Emision, a: Numero | Calculo): ErrorCrudo | undefined {
  const id = nuevoId(em, a)
  if (typeof id !== 'string') return id
  em.salida.rangos.set(id, { desde: a.desde, hasta: a.hasta })
  const m = em.nombres.m
  const etiqueta =
    a === em.raiz ? em.nombres.destino.etiqueta : etiquetaDe(em.texto, a.desde, a.hasta, m)
  if (a.k === 'num') emitirNumero(em, a, id, etiqueta)
  else emitirCalculo(em, a, id, etiqueta)
  em.ids.push(id)
  return undefined
}

// Un nombre solo es la suma de uno: la fila lo lee.
function emitirNombreSolo(em: Emision, raiz: Arbol) {
  if (raiz.k !== 'ref') return
  const id = em.nombres.destino.id
  em.salida.rangos.set(id, { desde: raiz.desde, hasta: raiz.hasta })
  const a: Calculo = {
    k: 'calc',
    op: 'suma',
    hijos: [raiz],
    campos: {},
    deFuncion: false,
    paren: false,
    desde: raiz.desde,
    hasta: raiz.hasta,
  }
  const etiqueta = em.nombres.destino.etiqueta
  em.salida.nodos.push(
    nodoDeCalculo({ id, a, de: [raiz.nodo.id], pct: undefined, etiqueta, comunes: em.comunes }),
  )
}

export function emitir(texto: string, raiz: Arbol, nombres: Nombres): Emitido | ErrorCrudo {
  const em: Emision = {
    texto,
    raiz,
    nombres,
    comunes: comunesDe(nombres.destino),
    salida: { nodos: [], params: {}, rangos: new Map() },
    ids: [],
    n: 0,
  }
  const pila: Marca[] = [{ a: raiz, i: 0 }]
  for (;;) {
    const marca = pila[pila.length - 1]
    if (marca === undefined) break
    nombres.m.visitas += 1
    const hijo = hijoPendiente(marca)
    if (hijo !== undefined) {
      pila.push({ a: hijo, i: 0 })
      continue
    }
    pila.pop()
    const a = marca.a
    if (a.k === 'clave') return argumentoInvalido(a)
    if (a.k === 'ref') {
      em.ids.push(a.nodo.id)
      continue
    }
    const r = emitirUno(em, a)
    if (r !== undefined) return r
  }
  emitirNombreSolo(em, raiz)
  return em.salida
}
