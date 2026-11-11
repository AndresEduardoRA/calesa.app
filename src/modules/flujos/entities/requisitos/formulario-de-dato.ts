// El formulario de «Agregar requisito» de forma «Dato»: lo escrito, su validación y lo que se manda. Espejo de `_requisito_forma()` y `_requisito_validar()`
// (`…20261111222241_requisitos_crear.sql`): la base vuelve a decir cada motivo, con el campo en el `hint`, si algo llega de otro lado. Sin I/O.
import { leerNumeroTipeado } from '@/shared/lib/numero-tipeado'
import type { AmbitoDeFlujo } from '../flujo'
import { CLAVE_CON_PORCENTAJE, CLAVES_POR_AMBITO } from './claves'

export const LARGO_MAXIMO_DE_LAS_NOTAS = 500

export type BorradorDeDato = {
  clave: string
  // Texto tipeado; sólo cuenta con `pagos.umbral_pct`.
  porcentaje: string
  notas: string
}

export const BORRADOR_DE_DATO_NUEVO: BorradorDeDato = { clave: '', porcentaje: '', notas: '' }

// Los campos del formulario donde cae un error (los del `hint` de la base).
export type CampoDeDato = 'clave_dato' | 'config' | 'notas'
export const CAMPOS_DE_DATO: readonly CampoDeDato[] = ['clave_dato', 'config', 'notas']

export function esCampoDeDato(campo: string | undefined): campo is CampoDeDato {
  return CAMPOS_DE_DATO.some((c) => c === campo)
}

export const MENSAJES_DE_DATO = {
  sinClave: 'Elige qué dato pide.',
  claveFuera: 'Ese dato no se puede pedir en este flujo.',
  sinPorcentaje: 'Escribe el porcentaje, de 1 a 100.',
  porcentajeFuera: 'El porcentaje es un número de 1 a 100.',
  notasLargas: `Las notas tienen hasta ${String(LARGO_MAXIMO_DE_LAS_NOTAS)} caracteres.`,
} as const

// Lo que se manda a `requisito_crear` como `p_datos`.
export type DatosDeDato = {
  clave_dato: string
  notas?: string
  config?: { pct: number }
}

type Validacion =
  { ok: true; datos: DatosDeDato } | { ok: false; errores: Partial<Record<CampoDeDato, string>> }

export function validarDato(
  borrador: BorradorDeDato,
  ambito: AmbitoDeFlujo,
  locale: string,
): Validacion {
  const errores: Partial<Record<CampoDeDato, string>> = {}
  if (borrador.clave === '') {
    errores.clave_dato = MENSAJES_DE_DATO.sinClave
  } else if (!CLAVES_POR_AMBITO[ambito].includes(borrador.clave)) {
    errores.clave_dato = MENSAJES_DE_DATO.claveFuera
  }

  let pct: number | null = null
  if (borrador.clave === CLAVE_CON_PORCENTAJE) {
    const leido = leerNumeroTipeado(borrador.porcentaje, locale)
    if (!leido.ok) {
      errores.config = MENSAJES_DE_DATO.porcentajeFuera
    } else if (leido.valor === null) {
      errores.config = MENSAJES_DE_DATO.sinPorcentaje
    } else if (leido.valor < 1 || leido.valor > 100) {
      errores.config = MENSAJES_DE_DATO.porcentajeFuera
    } else {
      pct = leido.valor
    }
  }

  const notas = borrador.notas.trim()
  // La base cuenta caracteres, no unidades UTF-16.
  if (Array.from(notas).length > LARGO_MAXIMO_DE_LAS_NOTAS) {
    errores.notas = MENSAJES_DE_DATO.notasLargas
  }

  if (Object.keys(errores).length > 0) {
    return { ok: false, errores }
  }
  return {
    ok: true,
    datos: {
      clave_dato: borrador.clave,
      ...(notas === '' ? {} : { notas }),
      ...(pct === null ? {} : { config: { pct } }),
    },
  }
}
