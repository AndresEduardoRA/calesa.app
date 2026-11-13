// El archivo de la importación total (9.06-4), del lado de la pantalla: lo que la conversión en el navegador escribe y sube al bucket
// `importaciones` (D22). Cada fila pasa por los mismos validadores de forma que la función edge (`plantillas.ts`) antes de escribirse
// (D34): la vista previa y lo que procesa la función no se separan. Una fila normalizada por cada fila de datos de la persona, también la
// rechazada (D32): la fila `n` del archivo normalizado es la `n + 1` del archivo de la persona. Sin I/O.
import type { LimitesDeLectura } from '@/shared/lib/csv/leer'
import { LARGO_DE_TEXTO_LARGO } from '@/shared/lib/campos'
import {
  escribirArchivo,
  LIMITES_DEL_ARCHIVO,
  PLANTILLAS,
  validarCelda,
  type EntidadImportable,
  type FilaNormalizada,
  type Rechazo,
  type ValorDeCelda,
} from './plantillas'

// El archivo de la persona, antes de convertirlo (D35): 10 MB, las 20.000 filas de la duda 2, las 200 columnas que admite el mapeo de
// `importacion_crear` y la celda de un texto largo.
export const LIMITES_DE_LECTURA_TOTAL: LimitesDeLectura = {
  bytes: 10 * 1024 * 1024,
  filas: LIMITES_DEL_ARCHIVO.filas,
  columnas: 200,
  celda: LARGO_DE_TEXTO_LARGO,
}

export const FILAS_DE_VISTA_PREVIA = 500

// Los topes con que `filaDelLote` lee un rechazo: lo que pase de ahí se corta acá, para que lea lo mismo que se escribió.
const MAX_MOTIVO = 500
const MAX_CAMPO = 120
const MAX_CLAVE_DE_MAPEO = 120

const MOTIVO_SIN_TEXTO = 'La fila no se pudo convertir.'

// Da la etiqueta que la persona ve para una clave de la plantilla (`precio` → «Precio»); sin ella, la clave.
export type EtiquetaDe = (clave: string) => string | undefined

function rechazoNormalizado({ motivo, campo }: Rechazo): FilaNormalizada {
  const texto = motivo.trim().slice(0, MAX_MOTIVO).trim()
  const rechazo: Rechazo = { motivo: texto === '' ? MOTIVO_SIN_TEXTO : texto }
  const nombre = (campo ?? '').trim().slice(0, MAX_CAMPO).trim()
  if (nombre !== '') {
    rechazo.campo = nombre
  }
  return { rechazo }
}

// La celda que escribiría `escribirArchivo` para ese valor.
function celdaDe(valor: ValorDeCelda): string {
  return typeof valor === 'object' ? JSON.stringify(valor) : String(valor)
}

function vacio(valor: ValorDeCelda | undefined): boolean {
  if (valor === undefined || valor === '') {
    return true
  }
  return typeof valor === 'object' && Object.keys(valor).length === 0
}

// La fila como la va a leer la función: cada valor por el validador de su columna, con el valor que ese validador devuelve. La primera
// celda que no pasa rechaza la fila (D34).
export function normalizarFila(
  entidad: EntidadImportable,
  fila: FilaNormalizada,
  etiquetaDe: EtiquetaDe = () => undefined,
): FilaNormalizada {
  if ('rechazo' in fila) {
    return rechazoNormalizado(fila.rechazo)
  }
  const columnas = new Map(PLANTILLAS[entidad].map((c) => [c.clave, c.validador]))
  const datos: Record<string, ValorDeCelda> = {}
  for (const [clave, valor] of Object.entries(fila.datos)) {
    const validador = columnas.get(clave)
    if (!validador) {
      return rechazoNormalizado({ motivo: 'Dato desconocido para la importación.', campo: clave })
    }
    if (vacio(valor)) {
      continue
    }
    const resultado = validarCelda(validador, celdaDe(valor))
    if (!resultado.ok) {
      return rechazoNormalizado({
        motivo: resultado.motivo,
        campo: etiquetaDe(clave) ?? clave,
      })
    }
    datos[clave] = resultado.valor
  }
  if (Object.keys(datos).length === 0) {
    return rechazoNormalizado({ motivo: 'La fila no tiene datos.' })
  }
  return { datos }
}

export type ArchivoArmado =
  | { ok: true; texto: string; bytes: number; filas: number; validas: number }
  | { ok: false; motivo: string }

export function armarArchivo(
  entidad: EntidadImportable,
  filas: readonly FilaNormalizada[],
  etiquetaDe?: EtiquetaDe,
): ArchivoArmado {
  if (filas.length === 0) {
    return { ok: false, motivo: 'El archivo no tiene filas para importar.' }
  }
  if (filas.length > LIMITES_DEL_ARCHIVO.filas) {
    return {
      ok: false,
      motivo: `El archivo tiene más de ${String(LIMITES_DEL_ARCHIVO.filas)} filas: pártelo en dos.`,
    }
  }
  const normalizadas = filas.map((fila) => normalizarFila(entidad, fila, etiquetaDe))
  const texto = escribirArchivo(entidad, normalizadas)
  const bytes = new TextEncoder().encode(texto).length
  if (bytes > LIMITES_DEL_ARCHIVO.bytes) {
    return { ok: false, motivo: 'El archivo convertido pasa de 10 MB: pártelo en dos.' }
  }
  const validas = normalizadas.filter((fila) => 'datos' in fila).length
  return { ok: true, texto, bytes, filas: normalizadas.length, validas }
}

// Constancia de cómo se emparejó (D38): cada encabezado de la persona → el id del dato o `null`. Un encabezado vacío o `__proto__` (Zod 4
// descarta esa clave en `z.record`) pasa a «Columna N»; uno repetido lleva « (2)», « (3)». Nunca más de 120 caracteres por clave.
export function mapeoDeColumnas(
  encabezados: readonly string[],
  destinos: readonly (string | null)[],
): Record<string, string | null> {
  if (encabezados.length !== destinos.length) {
    throw new Error('mapeoDeColumnas: encabezados y destinos tienen largos distintos')
  }
  const usados = new Set<string>()
  const pares = encabezados.map((encabezado, i): [string, string | null] => {
    const limpio = encabezado.trim()
    const base = limpio === '' || limpio === '__proto__' ? `Columna ${String(i + 1)}` : limpio
    let clave = base.slice(0, MAX_CLAVE_DE_MAPEO)
    for (let n = 2; usados.has(clave); n += 1) {
      const sufijo = ` (${String(n)})`
      clave = base.slice(0, MAX_CLAVE_DE_MAPEO - sufijo.length) + sufijo
    }
    usados.add(clave)
    return [clave, destinos[i] ?? null]
  })
  return Object.fromEntries(pares)
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

// La carpeta de quien importa y el id de la importación (D36), en minúsculas (como los escribe la base: `z.guid()` admite mayúsculas). La acción
// la vuelve a armar con su `usuarioId`; la base la vuelve a mirar. Algo que no es un uuid es un error de programación: Zod ya lo filtró.
export function rutaDelArchivo(usuarioId: string, importacionId: string): string {
  const usuario = usuarioId.toLowerCase()
  const importacion = importacionId.toLowerCase()
  if (!UUID.test(usuario) || !UUID.test(importacion)) {
    throw new Error('rutaDelArchivo: se esperaban dos uuid')
  }
  return `${usuario}/${importacion}.csv`
}
