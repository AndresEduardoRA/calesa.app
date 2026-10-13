// El vínculo de un vehículo (el lead dueño o comprador, uno a la vez, con historial) y sus
// interesados (los leads que mostraron interés). Acá sólo se leen: se escriben desde la ficha del
// lead. El nombre de un lead sólo llega si quien mira lo ve; si no, es nulo.
import { z } from 'zod'

export type Vinculo = {
  leadId: string
  // null = un lead que quien mira no ve (no está en su cartera, o ya no existe).
  leadNombre: string | null
  leadNumero: number | null
  desde: string
  // null = el vigente.
  hasta: string | null
  // Quién lo vinculó; null si fue un proceso (una cotización marcada como final).
  porNombre: string | null
}

export type Interesado = {
  leadId: string
  leadNombre: string
  leadNumero: number
  nota: string | null
  creadoEn: string
  porNombre: string | null
}

export type Relaciones = {
  // El vínculo activo; null = el vehículo no es de ningún lead.
  vinculo: Vinculo | null
  // Los anteriores, del más reciente al más viejo.
  historial: Vinculo[]
  interesados: Interesado[]
}

const filasDeVinculo = z.array(
  z.object({
    lead_id: z.guid(),
    lead_nombre: z.string().nullable(),
    lead_numero: z.number().nullable(),
    desde: z.string(),
    hasta: z.string().nullable(),
    por_nombre: z.string().nullable(),
  }),
)

const filasDeInteresado = z.array(
  z.object({
    lead_id: z.guid(),
    lead_nombre: z.string(),
    lead_numero: z.number(),
    nota: z.string().nullable(),
    creado_en: z.string(),
    por_nombre: z.string().nullable(),
  }),
)

// Lo que devuelven `vehiculo_vinculos()` y `vehiculo_interesados()`.
export function relacionesDesde(vinculos: unknown, interesados: unknown): Relaciones {
  const todos = filasDeVinculo.parse(vinculos).map((fila) => ({
    leadId: fila.lead_id,
    leadNombre: fila.lead_nombre,
    leadNumero: fila.lead_numero,
    desde: fila.desde,
    hasta: fila.hasta,
    porNombre: fila.por_nombre,
  }))
  return {
    vinculo: todos.find((uno) => uno.hasta === null) ?? null,
    historial: todos.filter((uno) => uno.hasta !== null),
    interesados: filasDeInteresado.parse(interesados).map((fila) => ({
      leadId: fila.lead_id,
      leadNombre: fila.lead_nombre,
      leadNumero: fila.lead_numero,
      nota: fila.nota,
      creadoEn: fila.creado_en,
      porNombre: fila.por_nombre,
    })),
  }
}

export const LEAD_QUE_NO_VES = 'Un lead que no está en tu cartera'

// Cómo se nombra al lead de un vínculo: por su nombre si quien mira lo ve.
export function nombreDeLead(vinculo: Pick<Vinculo, 'leadNombre'>): string {
  return vinculo.leadNombre ?? LEAD_QUE_NO_VES
}
