// El recordatorio de un lead, como lo lee el panel de `/agenda?recordatorio=<id>` (7.07-3). Puro: la forma, el mapeo de la fila de `recordatorios_vista` (que ya
// pasó por la RLS de quien mira: sólo los propios y vivos) y su estado con texto. El recordatorio es de `leads`: aquí se ve y se completa, no se edita.
import type { Resultado } from '@/shared/lib/errores'

export type DetalleDeRecordatorio = {
  id: string
  titulo: string
  recordarEn: string
  completadoEn: string | null
  // La versión que pide «Completar» (`recordatorio_completar`).
  actualizadoEn: string
  // El lead sólo viaja si quien mira todavía lo ve (la vista lo deja nulo si no).
  leadId: string | null
  leadNombre: string | null
}

// `null`: no existe, está eliminado o es de otra persona (el panel dice lo mismo en los tres casos).
export type LectorDeRecordatorio = (id: string) => Promise<Resultado<DetalleDeRecordatorio | null>>

// La fila de `recordatorios_vista`: la vista declara todo nulable, y lo esencial se comprueba al mapear.
export type FilaDeRecordatorio = {
  id: string | null
  titulo: string | null
  recordar_en: string | null
  completado_en: string | null
  actualizado_en: string | null
  lead_id: string | null
  lead_nombre: string | null
}

export function detalleDeRecordatorioDesde(fila: FilaDeRecordatorio): DetalleDeRecordatorio | null {
  if (!fila.id || !fila.titulo || !fila.recordar_en || !fila.actualizado_en) {
    return null
  }
  return {
    id: fila.id,
    titulo: fila.titulo,
    recordarEn: fila.recordar_en,
    completadoEn: fila.completado_en,
    actualizadoEn: fila.actualizado_en,
    leadId: fila.lead_id,
    leadNombre: fila.lead_nombre,
  }
}

export type EstadoDeRecordatorio = 'pendiente' | 'completado' | 'vencido'

// Completado gana sobre vencido; «vencido» es pendiente cuya hora ya pasó.
export function estadoDeRecordatorio(
  detalle: Pick<DetalleDeRecordatorio, 'recordarEn' | 'completadoEn'>,
  ahoraIso: string,
): EstadoDeRecordatorio {
  if (detalle.completadoEn) {
    return 'completado'
  }
  return Date.parse(detalle.recordarEn) < Date.parse(ahoraIso) ? 'vencido' : 'pendiente'
}

export const TEXTO_DE_ESTADO_DE_RECORDATORIO: Readonly<Record<EstadoDeRecordatorio, string>> = {
  pendiente: 'Pendiente',
  completado: 'Completado',
  vencido: 'Vencido',
}
