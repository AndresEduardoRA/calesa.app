// Lo puro de la XCell: los estados que salen del binding, cómo se lee lo tipeado y cuándo hay un cambio que emitir. Sin React y sin
// I/O: la celda NO calcula nada del cotizador, sólo traduce lo que la persona escribe a un número y se lo dice a la hoja.
import { aNumero } from '@/shared/lib/campos/esquema-de-valor'
import { formatearParaEditar } from '@/shared/lib/formato'

export type FormatoDeXCell = 'monto' | 'porcentaje' | 'numero'

// Las cifras significativas que la base conserva al leer un número (el cast de `cotizacion_evaluar`).
const CIFRAS = 15

export function normalizar(n: number): number {
  return Number(n.toPrecision(CIFRAS))
}

// Los estados de una celda salen de lo que el binding trae (`docs/COTIZADOR.md` › «Binding con la XCell»). Se SUMAN: una celda
// puede ser sugerida y estar deshabilitada. «Modificado» gana sobre «sugerido»: con un override ya no hay sugerido en uso (4-1).
export type EntradaDeEstado = {
  suggested: boolean
  overridden: boolean
  disabledReason: string | undefined
}

export function estadosDe({ suggested, overridden, disabledReason }: EntradaDeEstado): string {
  const estados = [
    ...(overridden ? ['modificado'] : suggested ? ['sugerido'] : []),
    ...(disabledReason !== undefined && disabledReason !== '' ? ['deshabilitado'] : []),
  ]
  return estados.length === 0 ? 'normal' : estados.join(' ')
}

export type Tipeado = { ok: true; valor: number | null } | { ok: false }

// Lo que se escribe, como lo entiende el resto de la app (`aNumero`: coma o punto decimal). Los blancos se quitan ANTES: `aNumero('  ')`
// da 0 porque `Number(' ')` es 0. Vacío es `null`; lo que no es un número finito («Infinity», «1e999», «1,2,3») no se lee.
// Un porcentaje se tipea en puntos («14,94») y sale como la fracción que guarda `valores` (0,1494): una unidad, no un cálculo.
export function leerTipeado(texto: string, formato: FormatoDeXCell): Tipeado {
  const limpio = texto.trim()
  if (limpio === '') {
    return { ok: true, valor: null }
  }
  const numero = aNumero(limpio)
  if (numero === null || !Number.isFinite(numero)) {
    return { ok: false }
  }
  return { ok: true, valor: normalizar(formato === 'porcentaje' ? numero / 100 : numero) }
}

// El texto con el que se abre la edición: la precisión completa, no los decimales con que se muestra.
export function textoParaEditar(
  valor: number | null,
  formato: FormatoDeXCell,
  locale: string,
): string {
  if (valor === null) {
    return ''
  }
  return formatearParaEditar(formato === 'porcentaje' ? valor * 100 : valor, { locale })
}

// ¿Hay algo que emitir? El texto cambió Y el número leído (a 15 cifras) es otro que el del binding (a 15 cifras: `value` puede traer más).
// Abrir y salir sin tocar nada, o reescribir lo mismo («1234,5670»), no emite: un sugerido no se vuelve override por pasar por la celda.
export function hayCambio(
  abierto: string,
  escrito: string,
  nuevo: number | null,
  actual: number | null,
): boolean {
  if (escrito === abierto) {
    return false
  }
  return nuevo !== (actual === null ? null : normalizar(actual))
}

// ¿Esta tecla abre la edición con su carácter? Cualquier carácter imprimible menos el espacio (que activa el botón).
export function abreConSuCaracter(tecla: string, ctrl: boolean, meta: boolean, alt: boolean) {
  return tecla.length === 1 && tecla !== ' ' && !ctrl && !meta && !alt
}

export const MENSAJE_NO_ES_NUMERO = 'Escribe un número, por ejemplo 1234,5.'

export type Nota = { texto: string; esError: boolean }

// Lo que dice la línea de abajo de la celda, por prioridad: lo tipeado que no es un número, lo que dijo la base y, al final, el motivo del candado.
export function notaDe(
  invalido: boolean,
  error: string | undefined,
  disabledReason: string | undefined,
): Nota | undefined {
  if (invalido) {
    return { texto: MENSAJE_NO_ES_NUMERO, esError: true }
  }
  if (error !== undefined && error !== '') {
    return { texto: error, esError: true }
  }
  if (disabledReason !== undefined && disabledReason !== '') {
    return { texto: disabledReason, esError: false }
  }
  return undefined
}
