// Lo que los e2e de la cartera de un lead (compartir, transferir, quitar acceso, salir) leen y
// preparan en el Supabase LOCAL sin pasar por la pantalla.
import type { Locator, Page } from '@playwright/test'
import { CONTRASENA } from './alta'
import { PREFIJO_ROL_E2E, admin, correoDePrueba, crearPersona, darRolDePrueba } from './base'
import { aLaVista } from './inventario'
import { exigir } from './leads'
import { sesionDe } from './leads-alta'

export type AccesoEnLaBase = {
  usuario_id: string
  tipo_acceso: 'dueno' | 'compartido'
  revocado_en: string | null
}

// Quién tiene el lead hoy (las filas vigentes), tal cual están en la base.
export async function carteraEnLaBase(leadId: string): Promise<AccesoEnLaBase[]> {
  const { data, error } = await admin()
    .from('leads_asesores')
    .select('usuario_id,tipo_acceso,revocado_en')
    .eq('lead_id', leadId)
    .is('revocado_en', null)
    .returns<AccesoEnLaBase[]>()
  exigir(error, 'leer la cartera del lead')
  return data ?? []
}

// Una persona con `leads.compartir` y `leads.transferir` en «todos» y `leads.ver` en «todos»: la
// supervisión, que mueve lo ajeno sin tenerlo en su cartera.
export async function crearSupervision(
  proyecto: string,
): Promise<{ email: string; nombre: string }> {
  const email = correoDePrueba(`supervision-cartera-${proyecto}`)
  const nombre = 'Supervisión Cartera'
  await crearPersona({ email, contrasena: CONTRASENA, nombre, invitada: true })
  await darRolDePrueba({
    email,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Supervisión cartera ${proyecto}`,
      clave: `e2e_supervision_cartera_${proyecto.replaceAll(/[^a-z0-9]/g, '_')}`,
    },
    permisos: [
      { clave: 'leads.ver', alcance: 'todos' },
      { clave: 'leads.compartir', alcance: 'todos' },
      { clave: 'leads.transferir', alcance: 'todos' },
    ],
  })
  return { email, nombre }
}

// El bloque «Quién lo tiene» de la ficha.
export const bloqueDeCartera = (page: Page): Locator =>
  aLaVista(
    page.locator('details').filter({ has: page.getByText('Quién lo tiene', { exact: true }) }),
  )

export const filaDeCartera = (page: Page, nombre: string): Locator =>
  bloqueDeCartera(page).locator('li').filter({ hasText: nombre })

export const panelDeCartera = (page: Page, titulo: 'Compartir lead' | 'Transferir lead'): Locator =>
  page.getByRole('dialog', { name: titulo })

// Llama la RPC con la sesión de esa persona, como lo haría otra pestaña.
export async function rpcComo(email: string, nombre: string, parametros: Record<string, unknown>) {
  const sesion = await sesionDe(email, CONTRASENA)
  return sesion.rpc(nombre as never, parametros as never)
}
