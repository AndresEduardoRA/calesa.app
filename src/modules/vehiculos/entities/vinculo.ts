// El vínculo de un vehículo (el lead dueño o comprador, uno a la vez, con historial) y sus
// interesados (los leads que mostraron interés). Acá sólo se leen: se escriben desde la ficha del
// lead. El nombre de un lead sólo llega si quien mira lo ve; si no, es nulo.
import { z } from 'zod'
import { cortarAlTope } from '@/shared/lib/conteo'
import { numerosDesde, type NumerosDeLead } from '@/shared/lib/numeros-de-lead'

// Lo que se lee de un vehículo (cierre 1): las RPC traen uno de más para saber si hay otros y decirlo.
export const TOPE_DE_VINCULOS = 50
export const TOPE_DE_INTERESADOS = 100

export type Vinculo = {
  leadId: string
  // null = un lead que quien mira no ve (no está en su cartera, o ya no existe).
  leadNombre: string | null
  // Los números del lead que quien mira ve (el global sólo con el permiso; el propio, el suyo).
  leadNumeros: NumerosDeLead
  desde: string
  // null = el vigente.
  hasta: string | null
  // Quién lo vinculó; null si fue un proceso (una cotización marcada como final).
  porNombre: string | null
}

export type Interesado = {
  leadId: string
  leadNombre: string
  leadNumeros: NumerosDeLead
  nota: string | null
  creadoEn: string
  porNombre: string | null
}

export type Relaciones = {
  // El vínculo activo; null = el vehículo no es de ningún lead.
  vinculo: Vinculo | null
  // Los anteriores, del más reciente al más viejo; `historialHayMas`: había más que el tope (`TOPE_DE_VINCULOS`, el vigente
  // incluido) y no se ven.
  historial: Vinculo[]
  historialHayMas: boolean
  interesados: Interesado[]
  interesadosHayMas: boolean
}

const filasDeVinculo = z.array(
  z.object({
    lead_id: z.guid(),
    lead_nombre: z.string().nullable(),
    lead_numero: z.number().nullable(),
    lead_numero_propio: z.number().nullable(),
    desde: z.string(),
    hasta: z.string().nullable(),
    por_nombre: z.string().nullable(),
  }),
)

const filasDeInteresado = z.array(
  z.object({
    lead_id: z.guid(),
    lead_nombre: z.string(),
    lead_numero: z.number().nullable(),
    lead_numero_propio: z.number().nullable(),
    nota: z.string().nullable(),
    creado_en: z.string(),
    por_nombre: z.string().nullable(),
  }),
)

// Lo que devuelven `vehiculo_vinculos()` y `vehiculo_interesados()`.
export function relacionesDesde(vinculos: unknown, interesados: unknown): Relaciones {
  const leidos = cortarAlTope(filasDeVinculo.parse(vinculos), TOPE_DE_VINCULOS)
  const deInteres = cortarAlTope(filasDeInteresado.parse(interesados), TOPE_DE_INTERESADOS)
  const todos = leidos.filas.map((fila) => ({
    leadId: fila.lead_id,
    leadNombre: fila.lead_nombre,
    leadNumeros: numerosDesde({ numero: fila.lead_numero, numero_propio: fila.lead_numero_propio }),
    desde: fila.desde,
    hasta: fila.hasta,
    porNombre: fila.por_nombre,
  }))
  return {
    vinculo: todos.find((uno) => uno.hasta === null) ?? null,
    historial: todos.filter((uno) => uno.hasta !== null),
    historialHayMas: leidos.hayMas,
    interesadosHayMas: deInteres.hayMas,
    interesados: deInteres.filas.map((fila) => ({
      leadId: fila.lead_id,
      leadNombre: fila.lead_nombre,
      leadNumeros: numerosDesde({
        numero: fila.lead_numero,
        numero_propio: fila.lead_numero_propio,
      }),
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
