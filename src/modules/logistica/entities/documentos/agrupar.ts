import type { DocumentoDeLaUnidad, TipoDeDocumento } from './documento'
import {
  resumenDelRequisito,
  type RequisitoDeDocumento,
  type ResumenDelRequisito,
} from './requisito'

export const NOMBRE_DEL_TIPO_QUE_YA_NO_ESTA = 'Otro tipo'

export type GrupoDeTipo = {
  // `null` sólo en «Otro tipo»: documentos de un tipo desactivado, que la base conserva.
  tipo: TipoDeDocumento | null
  nombre: string
  // Las fases que piden este tipo al salir (puede ser más de una).
  pedidoPor: RequisitoDeDocumento[]
  documentos: DocumentoDeLaUnidad[]
  // El resumen del primer requisito que lo pide (el más exigente se ve en «Qué falta»); nulo si nadie lo pide.
  resumen: ResumenDelRequisito | null
}

function ordenDeTipo(a: TipoDeDocumento, b: TipoDeDocumento): number {
  return a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es')
}

/**
 * La lista del hueco por tipo (D11): primero los que pide una fase y luego los demás que tienen documentos, cada bloque por `orden` de la base. Un tipo pedido sin documentos
 * se muestra igual («Aún no hay ninguno»); un documento de un tipo que ya no está entre los activos va a «Otro tipo». La pantalla no calcula nada: dibuja esto.
 */
export function agruparPorTipo(
  documentos: readonly DocumentoDeLaUnidad[],
  tipos: readonly TipoDeDocumento[],
  requisitos: readonly RequisitoDeDocumento[],
  hoy: string,
): GrupoDeTipo[] {
  const porTipo = new Map<string, DocumentoDeLaUnidad[]>()
  const sinTipo: DocumentoDeLaUnidad[] = []
  const conocidos = new Set(tipos.map((t) => t.id))
  for (const d of documentos) {
    if (!conocidos.has(d.tipoId)) {
      sinTipo.push(d)
      continue
    }
    porTipo.set(d.tipoId, [...(porTipo.get(d.tipoId) ?? []), d])
  }
  const grupoDe = (tipo: TipoDeDocumento): GrupoDeTipo => {
    const pedidoPor = requisitos.filter((r) => r.tipoId === tipo.id)
    const docs = porTipo.get(tipo.id) ?? []
    const primero = pedidoPor[0]
    return {
      tipo,
      nombre: tipo.nombre,
      pedidoPor,
      documentos: docs,
      resumen: primero ? resumenDelRequisito(docs, primero, hoy) : null,
    }
  }
  const ordenados = [...tipos].sort(ordenDeTipo)
  const pedidos = ordenados.filter((t) => requisitos.some((r) => r.tipoId === t.id))
  const conDocumentos = ordenados.filter(
    (t) => !requisitos.some((r) => r.tipoId === t.id) && (porTipo.get(t.id)?.length ?? 0) > 0,
  )
  const grupos = [...pedidos, ...conDocumentos].map(grupoDe)
  if (sinTipo.length > 0) {
    grupos.push({
      tipo: null,
      nombre: NOMBRE_DEL_TIPO_QUE_YA_NO_ESTA,
      pedidoPor: [],
      documentos: sinTipo,
      resumen: null,
    })
  }
  return grupos
}
