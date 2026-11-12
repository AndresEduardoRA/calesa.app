import type { DocumentoDeLaUnidad } from './documento'
import { estaVencido } from './vencimiento'

// Lo que una fase pide de documentos para salir de ella (`fases_requisitos`, tipo documento). Esta entidad repite el predicado de `evaluar_requisitos` (`base.sql`) sólo para mostrar «N de M
// aprobados»: lo que decide si la unidad puede mover es la base.
export type RequisitoDeDocumento = {
  id: string
  tipoId: string
  faseId: string
  faseNombre: string
  min: number | null
  max: number | null
  // Los formatos que admite el REQUISITO (no los del tipo): nulo, cualquiera.
  formatos: readonly string[] | null
  bloqueante: boolean
}

/** ¿Este documento cuenta para el requisito? Aprobado, vivo, sin vencer y de un formato que el requisito admite (un mime nulo cuenta). */
export function cuentaParaElRequisito(
  documento: DocumentoDeLaUnidad,
  requisito: RequisitoDeDocumento,
  hoy: string,
): boolean {
  return (
    documento.tipoId === requisito.tipoId &&
    documento.estado === 'aprobado' &&
    documento.eliminadoEn === null &&
    !estaVencido(documento.venceEl, hoy) &&
    (requisito.formatos === null ||
      documento.mime === null ||
      requisito.formatos.includes(documento.mime))
  )
}

export type ResumenDelRequisito = {
  aprobados: number
  // `min_archivos` nulo vale 1.
  minimo: number
  maximo: number | null
  cumple: boolean
}

export function resumenDelRequisito(
  documentos: readonly DocumentoDeLaUnidad[],
  requisito: RequisitoDeDocumento,
  hoy: string,
): ResumenDelRequisito {
  const aprobados = documentos.filter((d) => cuentaParaElRequisito(d, requisito, hoy)).length
  const minimo = requisito.min ?? 1
  const maximo = requisito.max
  return {
    aprobados,
    minimo,
    maximo,
    cumple: aprobados >= minimo && (maximo === null || aprobados <= maximo),
  }
}
