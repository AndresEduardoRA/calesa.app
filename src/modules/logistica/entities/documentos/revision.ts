import type { DocumentoDeLaUnidad, TipoDeDocumento } from './documento'

// Revisar un documento (6.06-3): qué puede hacer cada persona sobre una fila y qué manda al editar. Puro: sin I/O. La base vuelve a decidir (RPC `documento_revisar`, `documento_editar` y
// `documento_eliminar`); esto sólo dice qué botón se ofrece, cuál se apaga y por qué. Nada se esconde sin decir el motivo, salvo lo que no corresponde al estado (aprobar un aprobado).

export const MOTIVO_MAXIMO = 500

export const SIN_PERMISO_PARA_APROBAR = 'Necesitas permiso para aprobar documentos.'
export const SIN_PERMISO_PARA_EDITAR = 'Necesitas permiso para editar este documento.'
export const SIN_PERMISO_PARA_ELIMINAR = 'Necesitas permiso para eliminar este documento.'
export const TIPO_SIN_PORTAL = 'Este tipo de documento no se muestra en el portal.'
export const YA_NO_SE_VE_EN_EL_PORTAL = 'No se ve en el portal: el tipo ya no lo permite.'
export const FALTA_EL_MOTIVO = 'Escribe el motivo del rechazo.'

/** Lo que una persona puede hacer con una acción: no corresponde (no se dibuja), se puede, o está apagada (con su motivo, o sin él mientras no se leen sus permisos). */
export type Accion =
  { tipo: 'oculta' } | { tipo: 'habilitada' } | { tipo: 'apagada'; motivo: string | null }

// `null` = los permisos todavía no se leyeron: nada se puede hacer y no hay motivo que decir.
export type ClavesDeDocumentos = { aprobar: boolean | null; subir: boolean | null }

export type QuePuedeHacer = {
  aprobar: Accion
  rechazar: Accion
  editar: Accion
  eliminar: Accion
  portal: Accion
}

const habilitada: Accion = { tipo: 'habilitada' }
const apagada = (motivo: string | null): Accion => ({ tipo: 'apagada', motivo })

/** El motivo de rechazo recortado y de 1 a 500 caracteres; nulo si no vale. */
export function motivoDeRechazoValido(texto: string): string | null {
  const recortado = texto.trim()
  return recortado.length >= 1 && recortado.length <= MOTIVO_MAXIMO ? recortado : null
}

function sePuedeAprobar(claves: ClavesDeDocumentos): Accion {
  if (claves.aprobar === null) return apagada(null)
  return claves.aprobar ? habilitada : apagada(SIN_PERMISO_PARA_APROBAR)
}

// Editar y eliminar piden, como mínimo, aprobar o subir (D20): no se conoce a quien subió el archivo en el navegador; la base decide el resto.
function sePuedeModificar(claves: ClavesDeDocumentos, sinPermiso: string): Accion {
  if (claves.aprobar === true || claves.subir === true) return habilitada
  if (claves.aprobar === null || claves.subir === null) return apagada(null)
  return apagada(sinPermiso)
}

function sePuedeElPortal(
  claves: ClavesDeDocumentos,
  documento: Pick<DocumentoDeLaUnidad, 'visiblePortal'>,
  tipo: Pick<TipoDeDocumento, 'visiblePortalPermitido'> | null,
): Accion {
  const aprobar = sePuedeAprobar(claves)
  if (aprobar.tipo !== 'habilitada') return aprobar
  // Apagar siempre se puede; encender, sólo si el tipo lo admite (D23).
  if (!documento.visiblePortal && !(tipo?.visiblePortalPermitido ?? false)) {
    return apagada(TIPO_SIN_PORTAL)
  }
  return habilitada
}

/** Qué se ofrece sobre un documento a quien tiene estas claves (D20, D21, D23). */
export function quePuedeHacer(
  documento: Pick<DocumentoDeLaUnidad, 'estado' | 'visiblePortal'>,
  tipo: Pick<TipoDeDocumento, 'visiblePortalPermitido'> | null,
  claves: ClavesDeDocumentos,
): QuePuedeHacer {
  const revisable = documento.estado === 'subido' || documento.estado === 'rechazado'
  const aprobar = sePuedeAprobar(claves)
  return {
    aprobar: revisable ? aprobar : { tipo: 'oculta' },
    rechazar: documento.estado === 'subido' ? aprobar : { tipo: 'oculta' },
    editar: sePuedeModificar(claves, SIN_PERMISO_PARA_EDITAR),
    eliminar: sePuedeModificar(claves, SIN_PERMISO_PARA_ELIMINAR),
    portal: sePuedeElPortal(claves, documento, tipo),
  }
}

/** Un documento visible en el portal cuyo tipo ya no lo permite: queda encendido y se dice (D13 de 6.05). */
export function yaNoSeVeEnElPortal(
  documento: Pick<DocumentoDeLaUnidad, 'visiblePortal'>,
  tipo: Pick<TipoDeDocumento, 'visiblePortalPermitido'> | null,
): boolean {
  return documento.visiblePortal && !(tipo?.visiblePortalPermitido ?? false)
}

export type ValoresDeLaEdicion = {
  emitidoEl: string | null
  venceEl: string | null
  nota: string | null
}

export type CambiosDeLaEdicion = {
  emitido_el?: string | null
  vence_el?: string | null
  nota?: string | null
}

const vacioANulo = (texto: string | null): string | null => {
  const recortado = texto?.trim() ?? ''
  return recortado === '' ? null : recortado
}

/** Sólo lo que cambió (clave de la base); la nota o la fecha vacías son nulo; `null` si nada cambió (la base valida las fechas sólo si cambian). */
export function cambiosDeLaEdicion(
  original: ValoresDeLaEdicion,
  nuevo: ValoresDeLaEdicion,
): CambiosDeLaEdicion | null {
  const cambios: CambiosDeLaEdicion = {}
  const emitido = vacioANulo(nuevo.emitidoEl)
  const vence = vacioANulo(nuevo.venceEl)
  const nota = vacioANulo(nuevo.nota)
  if (emitido !== vacioANulo(original.emitidoEl)) cambios.emitido_el = emitido
  if (vence !== vacioANulo(original.venceEl)) cambios.vence_el = vence
  if (nota !== vacioANulo(original.nota)) cambios.nota = nota
  return Object.keys(cambios).length > 0 ? cambios : null
}
