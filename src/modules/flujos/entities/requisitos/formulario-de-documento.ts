// El formulario de «Agregar requisito» de forma «Documento»: lo escrito, su validación y lo que se manda. Espejo de `_requisito_forma()` y
// `_requisito_validar()`: la base vuelve a decir cada motivo, con el campo en el `hint`. Sin I/O.
import { leerNumeroTipeado } from '@/shared/lib/numero-tipeado'
import { MENSAJE_DE_NOTAS_LARGAS, validarNotas } from './notas'
import type { TipoParaRequisito } from './opciones'

export type BorradorDeDocumento = {
  tipoId: string
  // Texto tipeado; vacío = sin tope.
  minimo: string
  maximo: string
  // Los formatos marcados; ninguno = «los del tipo» (no se manda).
  formatos: string[]
  notas: string
}

export const BORRADOR_DE_DOCUMENTO_NUEVO: BorradorDeDocumento = {
  tipoId: '',
  minimo: '',
  maximo: '',
  formatos: [],
  notas: '',
}

// Los campos del formulario donde cae un error (los del `hint` de la base).
export type CampoDeDocumento =
  'tipo_documento_id' | 'min_archivos' | 'max_archivos' | 'formatos' | 'notas'
export const CAMPOS_DE_DOCUMENTO: readonly CampoDeDocumento[] = [
  'tipo_documento_id',
  'min_archivos',
  'max_archivos',
  'formatos',
  'notas',
]

export function esCampoDeDocumento(campo: string | undefined): campo is CampoDeDocumento {
  return CAMPOS_DE_DOCUMENTO.some((c) => c === campo)
}

export const MENSAJES_DE_DOCUMENTO = {
  sinTipo: 'Elige un tipo de documento.',
  tipoFuera: 'Ese tipo de documento no está disponible.',
  entero: 'Escribe un número entero.',
  minimo: 'Pide al menos 1 archivo.',
  maximoMenor: 'El máximo de archivos no puede ser menor que el mínimo.',
  formatos: 'Los formatos deben estar entre los del tipo.',
  notasLargas: MENSAJE_DE_NOTAS_LARGAS,
} as const

// Lo que se manda a `requisito_crear` como `p_datos`.
export type DatosDeDocumento = {
  tipo_documento_id: string
  min_archivos?: number
  max_archivos?: number
  formatos?: string[]
  notas?: string
}

type Cantidad = { ok: true; valor: number | null } | { ok: false; error: string }

// Un mínimo o un máximo de archivos tipeado: vacío es «sin tope»; si no, un entero de 1 en adelante.
export function leerCantidadDeArchivos(texto: string, locale: string): Cantidad {
  const leido = leerNumeroTipeado(texto, locale)
  if (!leido.ok || (leido.valor !== null && !Number.isInteger(leido.valor))) {
    return { ok: false, error: MENSAJES_DE_DOCUMENTO.entero }
  }
  if (leido.valor !== null && leido.valor < 1) {
    return { ok: false, error: MENSAJES_DE_DOCUMENTO.minimo }
  }
  return { ok: true, valor: leido.valor }
}

export type ErroresDeArchivos = Partial<
  Record<'min_archivos' | 'max_archivos' | 'formatos', string>
>

// El mínimo, el máximo y los formatos de un documento, comprobados juntos (el máximo no baja del mínimo; los formatos son de los del tipo).
// `formatosDelTipo` nulo = el tipo no se conoce y los formatos no se miden.
export function validarArchivos(
  borrador: Pick<BorradorDeDocumento, 'minimo' | 'maximo' | 'formatos'>,
  formatosDelTipo: readonly string[] | null,
  locale: string,
):
  | { ok: true; minimo: number | null; maximo: number | null }
  | { ok: false; errores: ErroresDeArchivos } {
  const errores: ErroresDeArchivos = {}
  const minimo = leerCantidadDeArchivos(borrador.minimo, locale)
  const maximo = leerCantidadDeArchivos(borrador.maximo, locale)
  if (!minimo.ok) {
    errores.min_archivos = minimo.error
  }
  if (!maximo.ok) {
    errores.max_archivos = maximo.error
  } else if (
    minimo.ok &&
    minimo.valor !== null &&
    maximo.valor !== null &&
    maximo.valor < minimo.valor
  ) {
    errores.max_archivos = MENSAJES_DE_DOCUMENTO.maximoMenor
  }
  if (
    formatosDelTipo !== null &&
    borrador.formatos.some((formato) => !formatosDelTipo.includes(formato))
  ) {
    errores.formatos = MENSAJES_DE_DOCUMENTO.formatos
  }
  if (!minimo.ok || !maximo.ok || Object.keys(errores).length > 0) {
    return { ok: false, errores }
  }
  return { ok: true, minimo: minimo.valor, maximo: maximo.valor }
}

type Validacion =
  | { ok: true; datos: DatosDeDocumento }
  | { ok: false; errores: Partial<Record<CampoDeDocumento, string>> }

function errorDelTipo(tipoId: string, tipo: TipoParaRequisito | undefined): string | undefined {
  if (tipoId === '') {
    return MENSAJES_DE_DOCUMENTO.sinTipo
  }
  return tipo ? undefined : MENSAJES_DE_DOCUMENTO.tipoFuera
}

function datosDeDocumento(
  borrador: BorradorDeDocumento,
  minimo: number | null,
  maximo: number | null,
  notas: string | null,
): DatosDeDocumento {
  return {
    tipo_documento_id: borrador.tipoId,
    ...(minimo === null ? {} : { min_archivos: minimo }),
    ...(maximo === null ? {} : { max_archivos: maximo }),
    ...(borrador.formatos.length === 0 ? {} : { formatos: borrador.formatos }),
    ...(notas === null ? {} : { notas }),
  }
}

export function validarDocumento(
  borrador: BorradorDeDocumento,
  tipos: readonly TipoParaRequisito[],
  locale: string,
): Validacion {
  const tipo = tipos.find((t) => t.id === borrador.tipoId && t.activo)
  const archivos = validarArchivos(borrador, tipo?.formatos ?? null, locale)
  const notas = validarNotas(borrador.notas)
  const errores: Partial<Record<CampoDeDocumento, string>> = {
    ...(archivos.ok ? {} : archivos.errores),
    ...(notas.ok ? {} : { notas: MENSAJES_DE_DOCUMENTO.notasLargas }),
  }
  const delTipo = errorDelTipo(borrador.tipoId, tipo)
  if (delTipo !== undefined) {
    errores.tipo_documento_id = delTipo
  }
  if (!archivos.ok || !notas.ok || Object.keys(errores).length > 0) {
    return { ok: false, errores }
  }
  return {
    ok: true,
    datos: datosDeDocumento(borrador, archivos.minimo, archivos.maximo, notas.valor),
  }
}
