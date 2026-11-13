// Los catálogos de una fila importada: el tipo y el origen que nombra una celda, entre los **activos** (sin tildes ni mayúsculas), y el motivo
// cuando no existe o está apagado. Uno desconocido nunca se crea al vuelo. Sin I/O.
import type { ContextoDeImportacion } from './contexto'
import { comparable } from './texto'

const TIPOS_QUE_SE_NOMBRAN = 10

// Un tipo que no existe o está desactivado nunca se crea por una errata: la fila se rechaza y el motivo lista los activos, para
// corregir la celda sin ir a otra pantalla. Los nombres salen de la base.
export function motivoDeTipoDesconocido(texto: string, contexto: ContextoDeImportacion): string {
  const activos = contexto.tipos.map((tipo) => tipo.nombre)
  const principio = `El tipo «${texto}» no existe o está desactivado.`
  if (activos.length === 0) {
    return `${principio} No hay tipos activos: no se puede importar.`
  }
  const nombrados = activos.slice(0, TIPOS_QUE_SE_NOMBRAN).join(', ')
  const resto = activos.length - TIPOS_QUE_SE_NOMBRAN
  return `${principio} Los activos: ${nombrados}${resto > 0 ? ` y ${String(resto)} más` : ''}.`
}

// El tipo (su id) que una celda nombra: por nombre o por clave, entre los activos, sin tildes ni mayúsculas.
export function tipoDeLaCelda(contexto: ContextoDeImportacion, texto: string): string | null {
  const buscado = comparable(texto)
  return (
    contexto.tipos.find(
      (tipo) => comparable(tipo.nombre) === buscado || comparable(tipo.clave) === buscado,
    )?.id ?? null
  )
}

const ORIGENES_QUE_SE_NOMBRAN = 10

// Un origen que no existe o está desactivado nunca se crea por una errata: la fila se rechaza y el
// motivo lista los activos, para corregir la celda sin ir a otra pantalla.
export function motivoDeOrigenDesconocido(texto: string, contexto: ContextoDeImportacion): string {
  const activos = contexto.origenes.map((origen) => origen.nombre)
  const principio = `El origen «${texto}» no existe o está desactivado.`
  if (activos.length === 0) {
    return `${principio} No hay orígenes activos: deja la celda vacía.`
  }
  const nombrados = activos.slice(0, ORIGENES_QUE_SE_NOMBRAN).join(', ')
  const resto = activos.length - ORIGENES_QUE_SE_NOMBRAN
  return `${principio} Los activos: ${nombrados}${resto > 0 ? ` y ${String(resto)} más` : ''}.`
}

export function origenDeLaCelda(contexto: ContextoDeImportacion, texto: string): string | null {
  const buscado = comparable(texto)
  return (
    contexto.origenes.find(
      (origen) => comparable(origen.nombre) === buscado || comparable(origen.clave) === buscado,
    )?.id ?? null
  )
}
