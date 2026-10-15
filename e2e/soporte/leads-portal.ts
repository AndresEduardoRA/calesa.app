// Lo que los e2e del acceso del cliente (la sección «Portal» de la ficha) preparan y miran en la base
// del Supabase LOCAL sin pasar por la pantalla: personas con `leads.portal.gestionar`, el acceso como
// quedó, el login del cliente (como lo hará el portal de la Fase 8, con service_role) y la dirección de
// la web.
import type { Locator, Page } from '@playwright/test'
import { CONTRASENA } from './alta'
import { PREFIJO_ROL_E2E, admin, correoDePrueba, crearPersona, darRolDePrueba } from './base'
import { aLaVista } from './inventario'
import { exigir } from './leads'
import { rpcComo } from './leads-cartera'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './leads-listado'

const ASESORA_CON_PORTAL = [
  'leads.crear',
  { clave: 'leads.ver', alcance: 'propios' as const },
  { clave: 'leads.editar', alcance: 'propios' as const },
  { clave: 'leads.compartir', alcance: 'propios' as const },
  { clave: 'leads.transferir', alcance: 'propios' as const },
  { clave: 'leads.portal.gestionar', alcance: 'propios' as const },
]

export type PersonaDelPortal = { email: string; nombre: string }

export type TerrenoDelPortal = TerrenoDelListado & {
  // Asesoras con el permiso: Pía tiene los leads; Paco, a veces, compartidos.
  pia: PersonaDelPortal
  paco: PersonaDelPortal
  // `leads.ver` y `leads.portal.gestionar` en «todos», sin cartera.
  supervision: PersonaDelPortal
  direccionAntes: string | null
}

async function persona(proyecto: string, clave: string, nombre: string, permisos: unknown[]) {
  const email = correoDePrueba(`${clave}-portal-${proyecto}`)
  await crearPersona({ email, contrasena: CONTRASENA, nombre, invitada: true })
  await darRolDePrueba({
    email,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Portal ${clave} ${proyecto}`,
      clave: `e2e_portal_${clave}_${proyecto.replaceAll(/[^a-z0-9]/g, '_')}`,
    },
    permisos: permisos as Parameters<typeof darRolDePrueba>[0]['permisos'],
  })
  return { email, nombre }
}

export async function prepararPortal(proyecto: string): Promise<TerrenoDelPortal> {
  const t = await prepararListado(proyecto)
  const pia = await persona(proyecto, 'pia', 'Pía Portal', ASESORA_CON_PORTAL)
  const paco = await persona(proyecto, 'paco', 'Paco Portal', ASESORA_CON_PORTAL)
  const supervision = await persona(proyecto, 'supervision', 'Supervisión Portal', [
    { clave: 'leads.ver', alcance: 'todos' },
    { clave: 'leads.portal.gestionar', alcance: 'todos' },
  ])
  return { ...t, pia, paco, supervision, direccionAntes: await direccionDeLaWeb() }
}

export async function limpiarPortal(t: TerrenoDelPortal): Promise<void> {
  await fijarDireccionDeLaWeb(t.direccionAntes)
  await limpiarListado(t)
}

async function direccionDeLaWeb(): Promise<string | null> {
  const { data, error } = await admin()
    .from('ajustes_web')
    .select('direccion_publica')
    .eq('id', 1)
    .single<{ direccion_publica: string | null }>()
  exigir(error, 'leer la dirección de la web')
  return data?.direccion_publica ?? null
}

// La dirección pública de la web (todavía no tiene pantalla: Fase 8).
export async function fijarDireccionDeLaWeb(direccion: string | null): Promise<void> {
  const { error } = await admin()
    .from('ajustes_web')
    .update({ direccion_publica: direccion })
    .eq('id', 1)
  exigir(error, 'fijar la dirección de la web')
}

export async function nombreDeLaEmpresa(): Promise<string> {
  const { data, error } = await admin()
    .from('ajustes_empresa')
    .select('nombre')
    .eq('id', 1)
    .single<{ nombre: string }>()
  exigir(error, 'leer el nombre de la empresa')
  return data?.nombre ?? ''
}

export type AccesoEnLaBase = {
  codigo: string
  clave_hash: string
  habilitado: boolean
  intentos_fallidos: number
  bloqueado_hasta: string | null
  otorgado_en: string
}

export async function accesoEnLaBase(leadId: string): Promise<AccesoEnLaBase | null> {
  const { data, error } = await admin()
    .from('accesos_portal')
    .select('codigo, clave_hash, habilitado, intentos_fallidos, bloqueado_hasta, otorgado_en')
    .eq('lead_id', leadId)
    .maybeSingle<AccesoEnLaBase>()
  exigir(error, 'leer el acceso al portal')
  return data
}

// Otorga como esa persona, «desde otra pestaña», con la versión que haya.
export async function otorgarComo(
  email: string,
  leadId: string,
  clave: string | null,
): Promise<{ codigo: string; otorgado_en: string; clave?: string }> {
  const antes = await accesoEnLaBase(leadId)
  const { data, error } = await rpcComo(email, 'otorgar_portal', {
    p_lead: leadId,
    p_clave: clave,
    p_otorgado_en_esperado: antes?.otorgado_en ?? null,
  })
  exigir(error, 'otorgar el acceso al portal')
  return data as { codigo: string; otorgado_en: string; clave?: string }
}

// El login del cliente, como lo hará el portal (service_role): la fila, o null.
export async function loginDelCliente(
  codigo: string,
  clave: string,
): Promise<{ lead_id: string; otorgado_en: string } | null> {
  const { data, error } = await admin()
    .schema('web')
    .rpc('portal_login', { p_codigo: codigo, p_clave: clave })
  exigir(error, 'el login del cliente')
  return (data as { lead_id: string; otorgado_en: string }[] | null)?.[0] ?? null
}

export async function snapshotDelCliente(leadId: string, otorgadoEn: string): Promise<unknown> {
  const { data, error } = await admin()
    .schema('web')
    .rpc('portal_snapshot', { p_lead: leadId, p_otorgado_en: otorgadoEn })
  exigir(error, 'el snapshot del cliente')
  return data
}

// Lo que quedó en `actividad` del acceso de ese lead, como texto (para buscar una clave).
export async function actividadDelPortal(leadId: string): Promise<string> {
  const { data, error } = await admin()
    .from('actividad')
    .select('accion, antes, despues, detalle')
    .eq('registro_id', leadId)
    .like('accion', 'portal.%')
  exigir(error, 'leer la actividad del portal')
  return JSON.stringify(data ?? [])
}

export const seccionPortal = (page: Page): Locator =>
  page.getByRole('region', { name: 'Acceso al portal' })

export const pestanaPortal = (page: Page): Locator =>
  aLaVista(page.getByRole('link', { name: 'Portal', exact: true }))

export const dialogoDeOtorgar = (page: Page): Locator => page.getByRole('dialog')
