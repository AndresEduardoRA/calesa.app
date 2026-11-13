// De una fila preparada por `leads` (la misma regla del alta y de la importación de `/leads`: `prepararFilas`, D31) a una fila del archivo
// normalizado. La 4b llama `prepararFilas` sobre las celdas de la persona y esto sobre cada una. Sin I/O.
import { objetivosDeImportacion, type CampoDeLead } from '@/modules/leads/client'
import type { FilaPreparada, ObjetivoDeImportacion } from '@/modules/leads/client'
import type { FilaNormalizada, ValorDeCelda } from '../../entities/plantillas'
import { rechazoDeMotivos } from './rechazo'

export function objetivosDeLeads(campos: readonly CampoDeLead[]): ObjetivoDeImportacion[] {
  return objetivosDeImportacion(campos)
}

// La etiqueta que la persona ve para un id de objetivo; los fijos se llaman como su columna en la plantilla (`nombre`, `tipo_lead_id`…).
export function etiquetaDeLeads(
  objetivos: readonly ObjetivoDeImportacion[],
): (id: string) => string | undefined {
  const porId = new Map(objetivos.map((objetivo) => [objetivo.id, objetivo.etiqueta]))
  return (id) => porId.get(id)
}

export function filaNormalizadaDeLead(
  preparada: FilaPreparada,
  objetivos: readonly ObjetivoDeImportacion[],
): FilaNormalizada {
  const { pedido } = preparada
  if (pedido === null) {
    const motivos =
      preparada.motivos.length > 0
        ? preparada.motivos
        : [{ campo: null, motivo: 'La fila no se pudo convertir.' }]
    return rechazoDeMotivos(motivos, etiquetaDeLeads(objetivos))
  }
  const { lead } = pedido
  const datos: Record<string, ValorDeCelda> = {
    nombre: lead.nombre,
    telefono_principal: lead.telefono_principal,
    tipo_lead_id: lead.tipo_lead_id,
  }
  if (lead.origen_lead_id !== null) {
    datos['origen_lead_id'] = lead.origen_lead_id
  }
  if (Object.keys(lead.atributos).length > 0) {
    datos['atributos'] = lead.atributos
  }
  return { datos }
}
