// El formulario de «Editar» un requisito: qué se puede cambiar según su tipo (`requisito_guardar`) y qué se manda:
// sólo lo que cambió, y `null` para lo que se vació. El formulario no escribe «Bloqueante» (lo cambia el interruptor de la fila, con el aviso de impacto). Sin I/O.
import type { RequisitoParaConfigurar } from '../flujo'
import { CLAVE_CON_PORCENTAJE } from './claves'
import { porcentajeDe } from './descripcion'
import { validarArchivos } from './formulario-de-documento'
import { validarPorcentaje } from './formulario-de-dato'
import { MENSAJE_DE_NOTAS_LARGAS, validarNotas } from './notas'
import type { TipoParaRequisito } from './opciones'

export type BorradorDeEdicion = {
  porcentaje: string
  minimo: string
  maximo: string
  formatos: string[]
  notas: string
}

export type CampoDeEdicion = 'config' | 'min_archivos' | 'max_archivos' | 'formatos' | 'notas'
export const CAMPOS_DE_EDICION: readonly CampoDeEdicion[] = [
  'config',
  'min_archivos',
  'max_archivos',
  'formatos',
  'notas',
]

export function esCampoDeEdicion(campo: string | undefined): campo is CampoDeEdicion {
  return CAMPOS_DE_EDICION.some((c) => c === campo)
}

export const MENSAJE_SIN_CAMBIOS = 'No hay nada que guardar.'

// Lo que se manda a `requisito_guardar` como `p_cambios`: sólo las claves que cambiaron.
export type CambiosDeRequisito = {
  // Sólo lo manda el interruptor de la fila, nunca el formulario.
  bloqueante?: boolean
  config?: { pct: number } | null
  min_archivos?: number | null
  max_archivos?: number | null
  formatos?: string[] | null
  notas?: string | null
}

export type ErroresDeEdicion = Partial<Record<CampoDeEdicion, string>>

export type ResultadoDeEdicion =
  | { tipo: 'cambios'; cambios: CambiosDeRequisito }
  | { tipo: 'sin_cambios' }
  | { tipo: 'errores'; errores: ErroresDeEdicion }

// Lo que el requisito tiene hoy, como texto de formulario.
export function borradorDeEdicion(r: RequisitoParaConfigurar): BorradorDeEdicion {
  const pct = porcentajeDe(r.config)
  return {
    porcentaje: pct === null ? '' : String(pct),
    minimo: r.minArchivos === null ? '' : String(r.minArchivos),
    maximo: r.maxArchivos === null ? '' : String(r.maxArchivos),
    formatos: r.formatos ?? [],
    notas: r.notas ?? '',
  }
}

const mismosFormatos = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((f) => b.includes(f))

// Qué campos edita cada tipo: el dato con porcentaje (sólo `pagos.umbral_pct`), el documento sus archivos y formatos, la espera nada más que las notas.
export function camposEditables(r: RequisitoParaConfigurar): {
  porcentaje: boolean
  archivos: boolean
} {
  return {
    porcentaje: r.tipo === 'dato' && r.claveDato === CLAVE_CON_PORCENTAJE,
    archivos: r.tipo === 'documento',
  }
}

type Parcial = { errores: ErroresDeEdicion; cambios: CambiosDeRequisito }

function cambiosDelPorcentaje(
  r: RequisitoParaConfigurar,
  borrador: BorradorDeEdicion,
  locale: string,
): Parcial {
  const pct = validarPorcentaje(borrador.porcentaje, locale)
  if (!pct.ok) {
    return { errores: { config: pct.error }, cambios: {} }
  }
  return {
    errores: {},
    cambios: pct.valor === porcentajeDe(r.config) ? {} : { config: { pct: pct.valor } },
  }
}

function cambiosDeLosArchivos(
  r: RequisitoParaConfigurar,
  borrador: BorradorDeEdicion,
  tipo: TipoParaRequisito | null,
  locale: string,
): Parcial {
  const archivos = validarArchivos(borrador, tipo === null ? null : tipo.formatos, locale)
  if (!archivos.ok) {
    return { errores: archivos.errores, cambios: {} }
  }
  const cambios: CambiosDeRequisito = {}
  if (archivos.minimo !== r.minArchivos) {
    cambios.min_archivos = archivos.minimo
  }
  if (archivos.maximo !== r.maxArchivos) {
    cambios.max_archivos = archivos.maximo
  }
  if (tipo !== null && !mismosFormatos(borrador.formatos, r.formatos ?? [])) {
    cambios.formatos = borrador.formatos.length === 0 ? null : borrador.formatos
  }
  return { errores: {}, cambios }
}

function cambiosDeLasNotas(r: RequisitoParaConfigurar, borrador: BorradorDeEdicion): Parcial {
  const notas = validarNotas(borrador.notas)
  if (!notas.ok) {
    return { errores: { notas: MENSAJE_DE_NOTAS_LARGAS }, cambios: {} }
  }
  const antes = r.notas === null || r.notas.trim() === '' ? null : r.notas.trim()
  return { errores: {}, cambios: notas.valor === antes ? {} : { notas: notas.valor } }
}

// `tipo` es el tipo de documento del requisito si se pudo leer: sin él, los formatos no se editan (no se sabe cuáles ofrece) y no se mandan.
export function validarEdicion(
  r: RequisitoParaConfigurar,
  borrador: BorradorDeEdicion,
  tipo: TipoParaRequisito | null,
  locale: string,
): ResultadoDeEdicion {
  const editables = camposEditables(r)
  const partes = [
    editables.porcentaje ? cambiosDelPorcentaje(r, borrador, locale) : null,
    editables.archivos ? cambiosDeLosArchivos(r, borrador, tipo, locale) : null,
    cambiosDeLasNotas(r, borrador),
  ].filter((parte) => parte !== null)
  const errores = Object.assign({}, ...partes.map((p) => p.errores)) as ErroresDeEdicion
  if (Object.keys(errores).length > 0) {
    return { tipo: 'errores', errores }
  }
  const cambios = Object.assign({}, ...partes.map((p) => p.cambios)) as CambiosDeRequisito
  return Object.keys(cambios).length === 0 ? { tipo: 'sin_cambios' } : { tipo: 'cambios', cambios }
}
