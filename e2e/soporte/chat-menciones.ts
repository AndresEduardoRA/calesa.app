// El terreno de `chat-menciones.spec.ts`: sobre el del chat, un lead de Ana y dos mensajes suyos —en su directa con Luis y en la que tiene con la
// dueña— que lo mencionan con el token `#[lead:<id>]` (7.10-1: se siembran por SQL, lo que se prueba es leerlos bajo la sesión de quien mira). Ana ve
// los leads propios (`leads.ver`: sin él la base no le deja mencionar el suyo, 7.10-2); Luis no tiene `leads.ver`; la dueña lo ve todo.
import { randomUUID } from 'node:crypto'
import { crearLead, borrarLeadsDePrueba, PREFIJO_DE_LEAD_E2E } from './leads'
import { limpiarChat, prepararChat, sembrarMensaje, type TerrenoDelChat } from './chat'

export const NOMBRE_DEL_LEAD = 'Cliente Mencionado'
export const NOMBRE_VISIBLE_DEL_LEAD = `${PREFIJO_DE_LEAD_E2E}${NOMBRE_DEL_LEAD}`

export type TerrenoDeMenciones = TerrenoDelChat & {
  leadId: string
  // Un vehículo que no existe: nadie lo ve, ni siquiera la dueña.
  vehiculoInexistente: string
}

export async function prepararMenciones(proyecto: string): Promise<TerrenoDeMenciones> {
  const t = await prepararChat(proyecto, {
    permisosDeAna: ['chat.participar', { clave: 'leads.ver', alcance: 'propios' }],
  })
  await borrarLeadsDePrueba()
  const leadId = await crearLead({
    nombre: NOMBRE_DEL_LEAD,
    telefono: '70033441',
    deQuien: t.ana.email,
  })
  const vehiculoInexistente = randomUUID()
  for (const conversacion of [t.conLuis, t.conLaDuena]) {
    sembrarMensaje(conversacion, t.ana.id, `Revisa #[lead:${leadId}] hoy`, 5)
  }
  sembrarMensaje(t.conLaDuena, t.ana.id, `Y este #[vehiculo:${vehiculoInexistente}]`, 4)
  return { ...t, leadId, vehiculoInexistente }
}

export async function limpiarMenciones(): Promise<void> {
  await borrarLeadsDePrueba()
  await limpiarChat()
}
