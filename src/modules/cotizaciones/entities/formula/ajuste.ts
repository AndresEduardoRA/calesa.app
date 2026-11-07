// El ⚙ de una celda de la hoja (4.20-3a): qué nodos ajusta y cómo se lee el valor nuevo que se tipea. Lo puro, sin React ni I/O; la pantalla es del 4.20-3b. La regla de
// verdad (el permiso del origen, la constante que existe, el mismo valor, la publicada esperada) es de `formula_cambiar_constante()`: esto sólo evita pedir lo que la
// base va a rechazar y dice por qué junto al campo.
import { formatearParaEditar } from '@/shared/lib/formato'
import { avisoDeNumero, leerNumeroTipeado } from '@/shared/lib/numero-tipeado'
import type { CeldaDeHoja, TipoDeNodoDeHoja } from '../hoja'
import type { Formato } from '../nodos'

export const MENSAJE_DEL_VALOR_VACIO = 'Escribe el valor nuevo.'
// El mismo texto que el 22023 de `formula_cambiar_constante()` (`hint = 'valor'`): la base y la pantalla dicen lo mismo.
export const MENSAJE_DEL_MISMO_VALOR = 'La constante ya tiene ese valor.'
export const MENSAJE_SIN_LEER_EL_VALOR = 'No se pudo leer el valor por defecto.'
export const MENSAJE_SIN_LA_CONSTANTE =
  'La fórmula publicada de este origen ya no tiene esta constante.'

// El valor por defecto de unas constantes en la publicada de un origen (lo lee el ⚙ al abrirse, 4.20-3a): su id (la esperada que manda el cambio), su número y el valor de
// cada nodo pedido, nulo si la publicada ya no lo tiene o no es un número.
export type ValorPorDefecto = {
  publicadaId: string
  version: number
  valores: Record<string, number | null>
}

// Un nodo que el ⚙ de una celda ajusta: la celda, su secundario (el porcentaje de un par) o los dos. `tipo` dice qué panel lleva: una constante tiene formulario; un tipo
// de cambio dice dónde se cambia (4.20-3b).
export type NodoDelAjuste = {
  nodo: string
  tipo: TipoDeNodoDeHoja
  formato: Formato
  editable: boolean
  nombre: string
}

// Qué ajusta el ⚙ de una celda, en su orden: primero la celda si la base le dio `ajustes`, después su secundario si lo tiene. La base da `ajustes` sólo a una constante
// (con `cotizaciones.configurar` del origen) o a un tipo de cambio (con `empresa.tipos_cambio.gestionar`).
export function nodosDelAjuste(celda: CeldaDeHoja): NodoDelAjuste[] {
  const nodos: NodoDelAjuste[] = []
  if (celda.ajustes) {
    nodos.push({
      nodo: celda.nodo,
      tipo: celda.tipoDeNodo,
      formato: celda.formato,
      editable: celda.editable,
      nombre: celda.etiqueta,
    })
  }
  const { secundario } = celda
  if (secundario?.ajustes === true) {
    nodos.push({
      nodo: secundario.nodo,
      tipo: secundario.tipoDeNodo,
      formato: secundario.formato,
      editable: secundario.editable,
      nombre: `Porcentaje de ${celda.etiqueta}`,
    })
  }
  return nodos
}

// Las cifras significativas que la base conserva al leer un número: el mismo redondeo que `normalizar()` de la XCell (`src/shared/ui/xcell/estado.ts:9-13`, que no lo
// exporta). Sin él, «1,1» en un porcentaje daría 0,011000000000000001 y eso se publicaría en `params`.
const CIFRAS = 15
const normalizar = (n: number): number => Number(n.toPrecision(CIFRAS))

export type ValorTipeado = { ok: true; valor: number } | { ok: false; aviso: string }

// Lo que se tipea en «Valor nuevo», con el lector de toda la app y el locale de la empresa. Un porcentaje se tipea en puntos («13») y se manda la fracción que guarda
// `params` (0,13). Igual al valor por defecto leído (los dos a 15 cifras) no se pide: la base lo rechazaría.
export function valorTipeado(
  texto: string,
  formato: Formato,
  locale: string,
  porDefecto: number | null,
): ValorTipeado {
  const leido = leerNumeroTipeado(texto, locale)
  if (!leido.ok) {
    return { ok: false, aviso: avisoDeNumero(texto, leido.motivo, locale) }
  }
  if (leido.valor === null) {
    return { ok: false, aviso: MENSAJE_DEL_VALOR_VACIO }
  }
  const valor = normalizar(formato === 'pct' ? leido.valor / 100 : leido.valor)
  if (porDefecto !== null && valor === normalizar(porDefecto)) {
    return { ok: false, aviso: MENSAJE_DEL_MISMO_VALOR }
  }
  return { ok: true, valor }
}

// El texto con que abre «Valor nuevo»: el valor por defecto con su precisión completa, en puntos si es un porcentaje.
export function textoInicial(valor: number, formato: Formato, locale: string): string {
  return formatearParaEditar(normalizar(formato === 'pct' ? valor * 100 : valor), { locale })
}
