// Lo que comparten los mutadores del corpus diferencial de `validar_diseno()` (`corpus-de-diseno.ts`): la entrada, el tipo de un
// mutador y los ayudantes que leen el diseño y la fórmula. Un mutador cambia la entrada en su lugar y
// devuelve qué hizo, o null si no se aplica a ese diseño (no tiene modos, ni atajos, ni un nivel…). La entrada trae también la
// definición de la fórmula, que sólo se lee.
import { clonar, elegir, esObjeto, type Azar, type Json, type Objeto } from './mutadores-de-formula'

export type ContextoJson = { niveles: string[]; retirados: string[]; tonos: string[] }
export type Entrada = { diseno: Json; contexto: ContextoJson; definicion: Objeto }
export type MutadorDeDiseno = {
  nombre: string
  aplicar: (e: Entrada, azar: Azar) => string | null
}

export { clonar }

export const lista = (x: Json | undefined): Json[] => (Array.isArray(x) ? x : [])
export const objetos = (x: Json | undefined): Objeto[] => lista(x).filter(esObjeto)
export const texto = (o: Objeto, clave: string): string | undefined => {
  const v = o[clave]
  return typeof v === 'string' ? v : undefined
}

export const raiz = (e: Entrada): Objeto | undefined => (esObjeto(e.diseno) ? e.diseno : undefined)
export const secciones = (e: Entrada): Objeto[] => objetos(raiz(e)?.['secciones'])
export const modos = (e: Entrada): Objeto[] => {
  const cab = raiz(e)?.['cabecera']
  return esObjeto(cab) ? objetos(cab['modos']) : []
}
export const tarjeta = (e: Entrada): Objeto | undefined => {
  const t = raiz(e)?.['tarjeta_total']
  return esObjeto(t) ? t : undefined
}

// Un ítem con su sección y su lugar.
export type Lugar = { s: Objeto; it: Objeto; k: number }
export function itemsDe(e: Entrada, filtro: (it: Objeto) => boolean = () => true): Lugar[] {
  const salida: Lugar[] = []
  for (const s of secciones(e)) {
    lista(s['items']).forEach((it, k) => {
      if (esObjeto(it) && filtro(it)) salida.push({ s, it, k })
    })
  }
  return salida
}
export const deTipo =
  (...tipos: string[]) =>
  (it: Objeto) =>
    tipos.includes(texto(it, 'tipo') ?? '')

// Los nodos de la fórmula (sólo lectura).
export const nodosDeFormula = (e: Entrada, filtro: (n: Objeto) => boolean = () => true): Objeto[] =>
  objetos(e.definicion['nodos']).filter(filtro)
export const idsDe = (e: Entrada, filtro: (n: Objeto) => boolean): string[] =>
  nodosDeFormula(e, filtro).map((n) => texto(n, 'id') ?? '?')
export const esNodo =
  (...tipos: string[]) =>
  (n: Objeto) =>
    tipos.includes(texto(n, 'tipo') ?? '')
export const porcentajeDe = (n: Objeto) =>
  texto(n, 'tipo') === 'calculo' && texto(n, 'op') === 'porcentaje_de'

export function poner(s: Objeto, it: Json) {
  const items = s['items']
  if (Array.isArray(items)) items.push(it)
}
const quitarItem = ({ s, k }: Lugar) => {
  const items = s['items']
  if (Array.isArray(items)) items.splice(k, 1)
}
export const quitar = quitarItem
export const celdaDe = (nodo: string): Objeto => ({ tipo: 'celda', nodo, ancho: 'completo' })
export const otraSeccion = (e: Entrada, azar: Azar, no?: Objeto) =>
  elegir(
    azar,
    secciones(e).filter((s) => s !== no),
  )
