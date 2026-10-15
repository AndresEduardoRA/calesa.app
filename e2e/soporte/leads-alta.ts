// Lo que los e2e del alta rápida («Nuevo lead») preparan y miran en la base del Supabase LOCAL: los
// teléfonos, lo que quedó escrito, los catálogos que el drawer ofrece y las sesiones de otras personas.
import { createClient } from '@supabase/supabase-js'
import { admin, entorno } from './base'
import { exigir, idDe } from './leads'

// Un teléfono nacional de 8 dígitos que no se repite entre corridas (los 7 últimos salen del reloj
// y de un contador): con el código de la empresa queda de 11. Se escribe tal cual en el drawer.
let contador = 0
export function telefonoAlAzar(): string {
  contador = (contador + 1) % 100
  const cola = `${String(Date.now()).slice(-5)}${String(contador).padStart(2, '0')}`
  return `7${cola}`
}

// Cómo guarda la base el número nacional escrito arriba, con el código de la empresa.
export async function codigoDePaisDeLaEmpresa(): Promise<string> {
  const { data, error } = await admin()
    .from('ajustes_empresa')
    .select('telefono_cc')
    .eq('id', 1)
    .single<{ telefono_cc: string | null }>()
  exigir(error, 'leer el código de país de la empresa')
  return (data?.telefono_cc ?? '').replace(/\D/g, '')
}

export type LeadEnLaBase = {
  id: string
  numero: number
  nombre: string
  telefono_principal: string
  telefono_cc: string | null
  tipo: string
  origen_lead_id: string | null
  atributos: Record<string, unknown>
  creado_por: string | null
}

// Los leads con ese teléfono (normalizado), como están en la tabla.
export async function leadsConTelefono(numero: string): Promise<LeadEnLaBase[]> {
  const { data, error } = await admin()
    .from('leads')
    .select('*')
    .eq('telefono_principal', numero)
    .is('eliminado_en', null)
    .returns<LeadEnLaBase[]>()
  exigir(error, `leer los leads de ${numero}`)
  return data ?? []
}

export async function seguimientosDe(leadId: string) {
  const { data, error } = await admin()
    .from('seguimientos')
    .select('titulo, detalle_texto, detalle_html, visibilidad, usuario_id, tipo_id')
    .eq('lead_id', leadId)
    .returns<
      {
        titulo: string
        detalle_texto: string | null
        detalle_html: string | null
        visibilidad: string
        usuario_id: string
        tipo_id: string
      }[]
    >()
  exigir(error, 'leer los seguimientos')
  return data ?? []
}

export async function recordatoriosDe(leadId: string) {
  const { data, error } = await admin()
    .from('recordatorios')
    .select('titulo, recordar_en, usuario_id')
    .eq('lead_id', leadId)
    .returns<{ titulo: string; recordar_en: string; usuario_id: string }[]>()
  exigir(error, 'leer los recordatorios')
  return data ?? []
}

export async function carteraDe(leadId: string) {
  const { data, error } = await admin()
    .from('leads_asesores')
    .select('usuario_id, tipo_acceso, revocado_en')
    .eq('lead_id', leadId)
    .returns<{ usuario_id: string; tipo_acceso: string; revocado_en: string | null }[]>()
  exigir(error, 'leer la cartera')
  return data ?? []
}

export async function constanciasDeAdopcion(leadId: string) {
  const { data, error } = await admin()
    .from('actividad')
    .select('accion, actor_id, detalle')
    .eq('registro_id', leadId)
    .eq('accion', 'lead.adoptado_del_limbo')
    .returns<{ accion: string; actor_id: string; detalle: Record<string, unknown> | null }[]>()
  exigir(error, 'leer la actividad')
  return data ?? []
}

export async function idDePersona(email: string): Promise<string> {
  return idDe(email)
}

// Lo manda al limbo como lo hace la baja de quien lo tenía: sin nadie vigente en la cartera.
export async function mandarAlLimbo(leadId: string): Promise<void> {
  const { error } = await admin()
    .from('leads_asesores')
    .update({ revocado_en: new Date().toISOString() })
    .eq('lead_id', leadId)
    .is('revocado_en', null)
  exigir(error, 'mandar el lead al limbo')
}

// Los orígenes de lead y los tipos de seguimiento que usa el alta: se dejan activos los de siempre y,
// al terminar, como estaban (la base local es de quien la usa).
type FilaDeCatalogo = { id: string; clave: string; activo: boolean }

export async function fijarCatalogosDeLead(): Promise<() => Promise<void>> {
  const cliente = admin()
  const origenes = await cliente
    .from('origenes_lead')
    .select('id, clave, activo')
    .returns<FilaDeCatalogo[]>()
  const tipos = await cliente
    .from('tipos_seguimiento')
    .select('id, clave, activo')
    .returns<FilaDeCatalogo[]>()
  exigir(origenes.error, 'leer los orígenes de lead')
  exigir(tipos.error, 'leer los tipos de seguimiento')
  const antesOrigenes = origenes.data ?? []
  const antesTipos = tipos.data ?? []
  const encender = async (tabla: 'origenes_lead' | 'tipos_seguimiento', claves: string[]) => {
    const { error } = await cliente.from(tabla).update({ activo: true }).in('clave', claves)
    exigir(error, `encender ${tabla}`)
  }
  await encender('origenes_lead', ['facebook', 'web'])
  await encender('tipos_seguimiento', ['whatsapp', 'llamada'])
  return async () => {
    for (const fila of antesOrigenes) {
      await cliente.from('origenes_lead').update({ activo: fila.activo }).eq('id', fila.id)
    }
    for (const fila of antesTipos) {
      await cliente.from('tipos_seguimiento').update({ activo: fila.activo }).eq('id', fila.id)
    }
  }
}

// Apaga todos los orígenes de lead, o deja activos sólo los de estas claves.
export async function dejarActivosLosOrigenes(claves: string[]): Promise<void> {
  const cliente = admin()
  const { data, error } = await cliente
    .from('origenes_lead')
    .select('id, clave')
    .returns<{ id: string; clave: string }[]>()
  exigir(error, 'leer los orígenes de lead')
  for (const fila of data ?? []) {
    await cliente
      .from('origenes_lead')
      .update({ activo: claves.includes(fila.clave) })
      .eq('id', fila.id)
  }
}

export async function origenDeLead(clave: string): Promise<{ id: string; nombre: string }> {
  const { data, error } = await admin()
    .from('origenes_lead')
    .select('id, nombre')
    .eq('clave', clave)
    .single<{ id: string; nombre: string }>()
  exigir(error, `leer el origen ${clave}`)
  return data ?? { id: '', nombre: '' }
}

// Un campo propio para el alta (su clave empieza con `e2e_`: lo borra la limpieza de campos).
export async function crearCampoDePrueba(datos: {
  clave: string
  etiqueta: string
  tipo?: 'texto' | 'documento' | 'correo' | 'opcion'
  requerido?: boolean
  soloCartera?: boolean
  // En la tabla del listado y en su panel de filtros.
  enTabla?: boolean
  filtrable?: boolean
  opciones?: { clave: string; etiqueta: string }[]
}): Promise<void> {
  const { error } = await admin()
    .from('leads_campos')
    .insert({
      clave: datos.clave,
      etiqueta: datos.etiqueta,
      tipo: datos.tipo ?? 'texto',
      requerido: datos.requerido ?? false,
      solo_cartera: datos.soloCartera ?? false,
      en_tabla: datos.enTabla ?? false,
      filtrable: datos.filtrable ?? false,
      opciones: datos.opciones ?? [],
      orden: 900,
    })
  exigir(error, `crear el campo ${datos.clave}`)
}

export async function borrarCampoDePrueba(clave: string): Promise<void> {
  const { error } = await admin().from('leads_campos').delete().eq('clave', clave)
  exigir(error, `borrar el campo ${clave}`)
}

// Una sesión de verdad (la de esa persona, con su RLS): para mirar lo que la base le entrega o le
// niega, sin pasar por la pantalla.
export async function sesionDe(email: string, contrasena: string) {
  const cliente = createClient(
    entorno('NEXT_PUBLIC_SUPABASE_URL'),
    entorno('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const { error } = await cliente.auth.signInWithPassword({ email, password: contrasena })
  exigir(error, `ingresar como ${email}`)
  return cliente
}
