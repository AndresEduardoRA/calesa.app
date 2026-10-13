// Leads para los e2e que los necesitan antes de que exista su pantalla: se cargan directo, con el
// cliente de servicio. Todos se llaman «E2E …» y se borran por ese prefijo.
import { admin } from './base'

const PREFIJO = 'E2E '

function exigir(error: { message: string } | null, que: string): void {
  if (error) {
    throw new Error(`No se pudo ${que}: ${error.message}`)
  }
}

async function idDe(email: string): Promise<string> {
  const { data, error } = await admin()
    .from('perfiles')
    .select('id')
    .eq('email', email)
    .single<{ id: string }>()
  exigir(error, `leer el perfil de ${email}`)
  return data?.id ?? ''
}

// Un lead en la cartera de esa persona (quien lo crea queda de dueña, por trigger).
export async function crearLead(datos: {
  nombre: string
  telefono: string
  deQuien: string
}): Promise<string> {
  const { data, error } = await admin()
    .from('leads')
    .insert({
      nombre: `${PREFIJO}${datos.nombre}`,
      telefono_principal: datos.telefono,
      creado_por: await idDe(datos.deQuien),
    })
    .select('id')
    .single<{ id: string }>()
  exigir(error, `crear el lead ${datos.nombre}`)
  return data?.id ?? ''
}

// El vínculo activo de un vehículo, puesto como lo pondría un proceso (sin persona).
export async function vincular(vehiculoId: string, leadId: string | null): Promise<void> {
  const { error } = await admin().from('vehiculos').update({ lead_id: leadId }).eq('id', vehiculoId)
  exigir(error, 'vincular el vehículo')
}

export async function marcarInteres(datos: {
  vehiculoId: string
  leadId: string
  quien: string
  nota?: string
}): Promise<void> {
  const { error } = await admin()
    .from('vehiculos_interesados')
    .insert({
      vehiculo_id: datos.vehiculoId,
      lead_id: datos.leadId,
      usuario_id: await idDe(datos.quien),
      nota: datos.nota ?? null,
    })
  exigir(error, 'marcar el interés')
}

// Antes de borrar a las personas de prueba: un lead recuerda quién lo creó.
export async function borrarLeadsDePrueba(): Promise<void> {
  const { error } = await admin().from('leads').delete().like('nombre', `${PREFIJO}%`)
  exigir(error, 'borrar los leads de prueba')
}
