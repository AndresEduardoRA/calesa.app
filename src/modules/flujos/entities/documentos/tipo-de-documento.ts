// Un tipo de documento (Título, BL, Declaración de importación… y los que la empresa o un flujo agreguen): lo que se le pide a quien sube un
// documento y cuándo vence. Se configura en Configuración › Flujos › Documentos. Estas reglas son espejo de `_tipo_documento_validar()` y
// `_tipo_documento_de_jsonb()` (`…20261111195259_tipos_documento_crear.sql`): la base las vuelve a decir, con estos mismos textos y estos mismos
// campos en el `hint`, si algo llega de otro lado. Aquí sirven para mostrar el error junto al campo sin ir a la base.
//
// Dos grupos: los de toda la empresa (`flujoId` nulo; los cambia quien gestiona los catálogos de logística) y los de un flujo (los cambia quien lo
// configura). Cada grupo tiene su orden y su tope. El `proposito` (la clave interna de la semilla) no se edita nunca.
import { conteoAcotado, conteoEnFrase, type ConteoAcotado } from '@/shared/lib/conteo'

// Cuántos caben en un grupo: lo pone la base (`_tipos_documento_tope()`); la lectura pide uno más para saber si hay más.
export const TOPE_DE_TIPOS_POR_GRUPO = 100
// Los conteos de uso llegan de la base con tope 50 + 1: se muestran acotados (D3).
export const TOPE_DEL_USO_DE_TIPO = 50
export const LARGO_MAXIMO_DEL_NOMBRE = 80
export const LARGO_MAXIMO_DE_LA_DESCRIPCION = 500
export const DIAS_MAXIMOS = 3650

export const PANEL_NUEVO_TIPO = 'nuevo-tipo'
export const PANEL_EDITAR_TIPO = 'editar-tipo'
// La confirmación de eliminar uno (`?panel=eliminar-tipo&tipo=<id>`).
export const PANEL_ELIMINAR_TIPO = 'eliminar-tipo'
// El id del tipo que se edita o elimina, en la URL.
export const CLAVE_DEL_TIPO = 'tipo'
// El grupo donde se crea uno (`?panel=nuevo-tipo&de=empresa|flujo`).
export const CLAVE_DEL_GRUPO = 'de'
export type ClaveDeGrupo = 'empresa' | 'flujo'

// Los formatos que se aceptan, en el orden en que se guardan: la misma lista de `_tipos_documento_formatos()` (lo prueba un test contra el SQL).
export const FORMATOS_DE_DOCUMENTO = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const
export type FormatoDeDocumento = (typeof FORMATOS_DE_DOCUMENTO)[number]

export const ETIQUETA_DE_FORMATO: Record<FormatoDeDocumento, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
}

// Cómo vence un documento de este tipo (D1 del 5.03). Lo hace cumplir la Fase 6 al subir.
export const MODOS_DE_VENCIMIENTO = ['ninguno', 'solicitar', 'renovar'] as const
export type ModoDeVencimiento = (typeof MODOS_DE_VENCIMIENTO)[number]

export const TEXTO_DE_MODO: Record<ModoDeVencimiento, string> = {
  ninguno: 'No vence',
  solicitar: 'Quien lo sube escribe la fecha',
  renovar: 'Vence tantos días después de subido',
}

export type TipoDeDocumento = {
  id: string
  // Nulo = de toda la empresa.
  flujoId: string | null
  nombre: string
  descripcion: string | null
  formatos: FormatoDeDocumento[]
  modo: ModoDeVencimiento
  // Sólo con «renovar».
  vigenciaDias: number | null
  // Cuántos días antes de que venza se avisa; nulo = no avisa.
  avisoDias: number | null
  visiblePortal: boolean
  activo: boolean
  orden: number
  // La versión: editar, ordenar y eliminar la mandan. Texto ISO tal cual, nunca un `Date` (se quedaría en milisegundos y daría PT409).
  actualizadoEn: string
}

// Un grupo leído con `tope + 1` filas y cortado en el tope.
export type GrupoDeTipos = {
  flujoId: string | null
  tope: number
  tipos: TipoDeDocumento[]
  hayMas: boolean
}

// Cuántos documentos y requisitos usan un tipo, cada conteo acotado.
export type UsoDeTipo = { documentos: ConteoAcotado; requisitos: ConteoAcotado }

export function usoDeTipoDesde(documentos: number, requisitos: number): UsoDeTipo {
  return {
    documentos: conteoAcotado(documentos, TOPE_DEL_USO_DE_TIPO),
    requisitos: conteoAcotado(requisitos, TOPE_DEL_USO_DE_TIPO),
  }
}

export function tipoEnUso(uso: UsoDeTipo | null | undefined): boolean {
  return uso !== null && uso !== undefined && (uso.documentos.n > 0 || uso.requisitos.n > 0)
}

function cantidad(conteo: ConteoAcotado, singular: string, plural: string): string {
  return !conteo.hayMas && conteo.n === 1 ? `1 ${singular}` : `${conteoEnFrase(conteo)} ${plural}`
}

// «Sin uso», «Lo usan 3 documentos y 2 requisitos», «Lo usa 1 requisito», «Lo usan más de 50 documentos».
export function textoDelUso(uso: UsoDeTipo): string {
  const partes: string[] = []
  if (uso.documentos.n > 0) {
    partes.push(cantidad(uso.documentos, 'documento', 'documentos'))
  }
  if (uso.requisitos.n > 0) {
    partes.push(cantidad(uso.requisitos, 'requisito', 'requisitos'))
  }
  if (partes.length === 0) {
    return 'Sin uso'
  }
  const uno = partes.length === 1 && partes[0]?.startsWith('1 ')
  return `${uno ? 'Lo usa' : 'Lo usan'} ${partes.join(' y ')}`
}

// Lo que responde eliminar: borrado, o desactivado porque algo lo usa (con lo que lo usa, ya acotado).
export type RespuestaDeEliminar = { accion: 'eliminado' | 'desactivado'; uso: UsoDeTipo }

// ─── Orden ──────────────────────────────────────────────────────────────────────────────────────

export type Direccion = 'subir' | 'bajar'

// A dónde va un tipo al subirlo o bajarlo un lugar, dicho como la base lo recibe: «después de X» (nulo = primero). Nulo si ya está en el
// extremo o no está. La lista es el grupo, en el orden en que se ve.
export function destinoDeTipo(
  tipos: readonly TipoDeDocumento[],
  id: string,
  direccion: Direccion,
): { despuesDe: string | null } | null {
  const lugar = tipos.findIndex((tipo) => tipo.id === id)
  if (lugar < 0) {
    return null
  }
  if (direccion === 'subir') {
    return lugar === 0 ? null : { despuesDe: tipos[lugar - 2]?.id ?? null }
  }
  const siguiente = tipos[lugar + 1]
  return siguiente ? { despuesDe: siguiente.id } : null
}
