// El estado puro del editor de una tabla de referencia (4.23-3, C5–C8): las páginas que se dibujan de lo que está en memoria, el texto crudo de una celda que no se leyó,
// el primer error (lo que apaga «Publicar») y si hay cambios. La tabla está entera en memoria (hasta 2.000 filas): las páginas sólo dibujan, nunca recortan lo que se
// publica.
import { formatearNumero, LOCALE_POR_DEFECTO } from '@/shared/lib/formato'
import { TAMANOS_DE_PAGINA } from '@/shared/lib/paginacion'
import type { ColumnaDeTabla } from '../tabla-de-ayuda'
import { textoParaEditar, valorTipeado } from './celda-tipeada'
import { editarCelda, filasParaPublicar, type FilaEditable, type ValoresDeFila } from './edicion'
import { TOPE_DE_FILAS, validarFilas } from './validacion'

// El más grande de los tamaños de página de la app.
export const FILAS_POR_PAGINA_DEL_EDITOR = TAMANOS_DE_PAGINA[TAMANOS_DE_PAGINA.length - 1] ?? 100

// Lo tipeado en una celda que no se leyó, con su motivo: la fila conserva el valor de antes.
export type CrudoDeCelda = { texto: string; mensaje: string }
// Por id de fila y clave de columna.
export type Crudos = Readonly<Record<string, Readonly<Record<string, CrudoDeCelda>>>>
export type EstadoDelEditor = { filas: readonly FilaEditable[]; crudos: Crudos }

export const paginaDe = (indice: number) => Math.floor(indice / FILAS_POR_PAGINA_DEL_EDITOR)

// Una opción por página, sin decir el total: «Desde la fila 1», «Desde la fila 101»… Sin filas, una página.
export function paginas(
  n: number,
  locale: string = LOCALE_POR_DEFECTO,
): { indice: number; etiqueta: string }[] {
  const cuantas = Math.max(1, Math.ceil(n / FILAS_POR_PAGINA_DEL_EDITOR))
  return Array.from({ length: cuantas }, (_, indice) => ({
    indice,
    etiqueta: `Desde la fila ${formatearNumero(indice * FILAS_POR_PAGINA_DEL_EDITOR + 1, { locale, decimales: 0 })}`,
  }))
}

function conCrudo(
  crudos: Crudos,
  filaId: string,
  clave: string,
  crudo: CrudoDeCelda | null,
): Crudos {
  const { [clave]: _quitado, ...resto } = crudos[filaId] ?? {}
  const fila = crudo ? { ...resto, [clave]: crudo } : resto
  const { [filaId]: _antes, ...otras } = crudos
  return Object.keys(fila).length > 0 ? { ...otras, [filaId]: fila } : otras
}

// Al salir de una celda (C5): lo que muestra el campo sin tocar no cambia nada (salir con Tab no redondea un valor de más de 15 cifras); lo que se lee va a la fila y
// borra el crudo; lo que no, queda como crudo con su mensaje.
export function aplicarTexto(
  estado: EstadoDelEditor,
  { columna, filaId }: { columna: ColumnaDeTabla; filaId: string },
  texto: string,
  locale: string,
): EstadoDelEditor {
  const fila = estado.filas.find((f) => f.id === filaId)
  if (!fila) return estado
  const sinCrudo = conCrudo(estado.crudos, filaId, columna.clave, null)
  if (texto === textoParaEditar(columna, fila.valores[columna.clave], locale)) {
    return { filas: estado.filas, crudos: sinCrudo }
  }
  const leido = valorTipeado(columna, texto, locale)
  if (!leido.ok) {
    return {
      filas: estado.filas,
      crudos: conCrudo(estado.crudos, filaId, columna.clave, { texto, mensaje: leido.mensaje }),
    }
  }
  return { filas: editarCelda(estado.filas, filaId, columna.clave, leido.valor), crudos: sinCrudo }
}

export type FilaQuitada = { fila: FilaEditable; indice: number; crudos: Crudos[string] | undefined }

// Quitar una fila se lleva también sus crudos (si no, el primer error apuntaría a una fila que no está); «Deshacer» la devuelve con ellos.
export function quitarConCrudos(
  estado: EstadoDelEditor,
  filaId: string,
): { estado: EstadoDelEditor; quitada: FilaQuitada | null } {
  const indice = estado.filas.findIndex((f) => f.id === filaId)
  const fila = estado.filas[indice]
  if (!fila) return { estado, quitada: null }
  const { [filaId]: crudos, ...otros } = estado.crudos
  return {
    estado: { filas: estado.filas.filter((f) => f.id !== filaId), crudos: otros },
    quitada: { fila, indice, crudos },
  }
}

export function devolverFila(estado: EstadoDelEditor, quitada: FilaQuitada): EstadoDelEditor {
  if (estado.filas.length >= TOPE_DE_FILAS || estado.filas.some((f) => f.id === quitada.fila.id)) {
    return estado
  }
  const lugar = Math.min(quitada.indice, estado.filas.length)
  return {
    filas: [...estado.filas.slice(0, lugar), quitada.fila, ...estado.filas.slice(lugar)],
    crudos: quitada.crudos
      ? { ...estado.crudos, [quitada.fila.id]: quitada.crudos }
      : estado.crudos,
  }
}

export type PrimerError = {
  mensaje: string
  filaId: string | null
  clave: string | null
  pagina: number
  // La celda es de una columna declarada: hay un campo donde poner el foco.
  conCelda: boolean
}

function primerCrudo(columnas: readonly ColumnaDeTabla[], estado: EstadoDelEditor) {
  for (const [indice, fila] of estado.filas.entries()) {
    const deLaFila = estado.crudos[fila.id]
    if (!deLaFila) continue
    const clave = columnas.find((c) => deLaFila[c.clave])?.clave ?? Object.keys(deLaFila)[0]
    const crudo = clave === undefined ? undefined : deLaFila[clave]
    if (clave !== undefined && crudo) return { indice, fila, clave, crudo }
  }
  return null
}

const CAMINO = /^filas\.(\d+)(?:\.(.+))?$/

const declarada = (columnas: readonly ColumnaDeTabla[], clave: string | null) =>
  clave !== null && columnas.some((c) => c.clave === clave)

// La celda que nombra un camino de la base (`filas.<i>.<clave>`, el `hint` de un 22023 o el del espejo) con su mensaje; `filas` solo (el tope) no tiene fila. «Ir a la
// celda» de un rechazo al publicar lo usa.
export function destinoDeCamino(
  columnas: readonly ColumnaDeTabla[],
  estado: EstadoDelEditor,
  { camino, mensaje }: { camino: string; mensaje: string },
): PrimerError & { indice: number } {
  const partes = CAMINO.exec(camino)
  const indice = partes ? Number(partes[1]) : -1
  const fila = estado.filas[indice]
  const clave = partes?.[2] ?? null
  return {
    indice,
    mensaje,
    filaId: fila?.id ?? null,
    clave,
    pagina: fila ? paginaDe(indice) : 0,
    conCelda: fila !== undefined && declarada(columnas, clave),
  }
}

function errorValidado(columnas: readonly ColumnaDeTabla[], estado: EstadoDelEditor) {
  const validado = validarFilas(columnas, filasParaPublicar(estado.filas))
  if (!validado) return null
  const { indice, ...error } = destinoDeCamino(columnas, estado, validado)
  return { indice, error }
}

// El error de la fila más temprana entre los crudos y el espejo de la base (`validarFilas`); con empate, el crudo. Nulo si todo vale.
export function primerError(
  columnas: readonly ColumnaDeTabla[],
  estado: EstadoDelEditor,
): PrimerError | null {
  const crudo = primerCrudo(columnas, estado)
  const validado = errorValidado(columnas, estado)
  if (crudo && (!validado || crudo.indice <= validado.indice)) {
    return {
      mensaje: `La fila ${String(crudo.indice + 1)}: ${crudo.crudo.mensaje}`,
      filaId: crudo.fila.id,
      clave: crudo.clave,
      pagina: paginaDe(crudo.indice),
      conCelda: declarada(columnas, crudo.clave),
    }
  }
  return validado?.error ?? null
}

const canonica = (valores: ValoresDeFila) =>
  JSON.stringify(
    Object.entries(valores)
      .filter(([, v]) => v !== null && v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  )

// Hay cambios si queda un crudo o si lo que se publicaría difiere de lo leído (el orden de las filas cuenta; el de las claves de una fila, no).
export function hayCambios(leidas: readonly FilaEditable[], estado: EstadoDelEditor): boolean {
  if (Object.keys(estado.crudos).length > 0) return true
  if (leidas.length !== estado.filas.length) return true
  return estado.filas.some((f, i) => {
    const leida = leidas[i]
    return !leida || canonica(leida.valores) !== canonica(f.valores)
  })
}
