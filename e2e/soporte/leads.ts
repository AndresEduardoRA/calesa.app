// Leads para los e2e que los necesitan antes de que exista su pantalla: se cargan directo, con el
// cliente de servicio. Todos se llaman «E2E …» y se borran por ese prefijo.
import { admin } from './base'

export const PREFIJO_DE_LEAD_E2E = 'E2E '
const PREFIJO = PREFIJO_DE_LEAD_E2E

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

export type CampoDeLeadEnLaBase = {
  id: string
  clave: string
  etiqueta: string
  tipo: string
  orden: number
  grupo: string | null
  requerido: boolean
  en_tabla: boolean
  filtrable: boolean
  solo_cartera: boolean
  es_sistema: boolean
  activo: boolean
  opciones: { clave: string; etiqueta: string }[]
  valor_defecto: unknown
  valor_defecto_empresa: string | null
}

// El layout de los leads, en su orden.
export async function camposDeLead(): Promise<CampoDeLeadEnLaBase[]> {
  const { data, error } = await admin()
    .from('leads_campos')
    .select(
      'id, clave, etiqueta, tipo, orden, grupo, requerido, en_tabla, filtrable, solo_cartera, es_sistema, activo, opciones, valor_defecto, valor_defecto_empresa',
    )
    .order('orden')
    .returns<CampoDeLeadEnLaBase[]>()
  exigir(error, 'leer el layout de los leads')
  return data ?? []
}

export async function campoDeLead(clave: string): Promise<CampoDeLeadEnLaBase> {
  const campo = (await camposDeLead()).find((otro) => otro.clave === clave)
  if (!campo) {
    throw new Error(`Los leads no tienen el campo «${clave}».`)
  }
  return campo
}

// Un valor que sirve para ese tipo: lo que hace falta para cargar un lead que no se carga a mano.
function valorDePrueba(campo: CampoDeLeadEnLaBase): unknown {
  const primera = campo.opciones[0]?.clave ?? ''
  const valores: Record<string, unknown> = {
    texto: 'E2E',
    texto_largo: 'E2E',
    numero: 1,
    moneda: 1,
    booleano: true,
    fecha: '2026-01-01',
    fecha_hora: '2026-01-01T12:00:00Z',
    url: 'https://e2e.importadora.test',
    correo: 'e2e@e2e.importadora.test',
    documento: 'E2E1',
    opcion: primera,
    multi_opcion: [primera],
  }
  return valores[campo.tipo] ?? 'E2E'
}

// Un lead en la cartera de esa persona (quien lo crea queda de dueña, por trigger). Se carga con el
// cliente de servicio, que pasa por la misma validación: si alguien hizo requerido un campo del
// layout, se le pone un valor de prueba para que el lead entre igual.
export async function crearLead(datos: {
  nombre: string
  telefono: string
  deQuien: string
  atributos?: Record<string, unknown>
}): Promise<string> {
  const requeridos = (await camposDeLead()).filter((campo) => campo.activo && campo.requerido)
  const atributos: Record<string, unknown> = {}
  for (const campo of requeridos) {
    atributos[campo.clave] = valorDePrueba(campo)
  }
  const { data, error } = await admin()
    .from('leads')
    .insert({
      nombre: `${PREFIJO}${datos.nombre}`,
      telefono_principal: datos.telefono,
      creado_por: await idDe(datos.deQuien),
      atributos: { ...atributos, ...datos.atributos } as never,
    })
    .select('id')
    .single<{ id: string }>()
  exigir(error, `crear el lead ${datos.nombre}`)
  return data?.id ?? ''
}

// Los campos que creó un e2e (su clave empieza con `e2e_`): los de fábrica no se tocan.
export const PREFIJO_DE_CAMPO = 'e2e_'

export async function borrarCamposDeLeadDePrueba(): Promise<void> {
  // Antes, lo que cargaron los leads de prueba: un campo con datos no se elimina.
  const { error: errorLeads } = await admin().from('leads').delete().like('nombre', `${PREFIJO}%`)
  exigir(errorLeads, 'borrar los leads de prueba')
  const { error } = await admin()
    .from('leads_campos')
    .delete()
    .like('clave', `${PREFIJO_DE_CAMPO}%`)
    .eq('es_sistema', false)
  exigir(error, 'borrar los campos de prueba')
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
