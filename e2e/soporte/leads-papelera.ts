// Lo que los e2e de la papelera de leads preparan y leen en el Supabase LOCAL sin pasar por la
// pantalla: una persona que puede vaciarla, el estado de un lead y sus lotes.
import { type Locator, type Page } from '@playwright/test'
import { CONTRASENA } from './alta'
import { PREFIJO_ROL_E2E, admin, correoDePrueba, crearPersona, darRolDePrueba } from './base'
import { aLaVista } from './inventario'
import { exigir } from './leads'

// Una persona que ve todos los leads, los envía a la papelera y la vacía (`leads.papelera.purgar`).
export async function crearPurgadora(proyecto: string): Promise<{ email: string; nombre: string }> {
  const email = correoDePrueba(`purgadora-leads-${proyecto}`)
  const nombre = 'Purgadora Leads'
  await crearPersona({ email, contrasena: CONTRASENA, nombre, invitada: true })
  await darRolDePrueba({
    email,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Purgadora leads ${proyecto}`,
      clave: `e2e_purgadora_leads_${proyecto.replaceAll(/[^a-z0-9]/g, '_')}`,
    },
    permisos: [
      { clave: 'leads.ver', alcance: 'todos' },
      { clave: 'leads.eliminar', alcance: 'todos' },
      'leads.papelera.purgar',
    ],
  })
  return { email, nombre }
}

export type EstadoDeLead = { eliminado_en: string | null; lote_papelera_id: string | null }

// Lo que dice la tabla de un lead (null = ya no existe: se purgó).
export async function estadoDeLead(leadId: string): Promise<EstadoDeLead | null> {
  const { data, error } = await admin()
    .from('leads')
    .select('eliminado_en,lote_papelera_id')
    .eq('id', leadId)
    .maybeSingle<EstadoDeLead>()
  exigir(error, 'leer el estado del lead')
  return data
}

// Los lotes de la papelera de leads, de más nuevo a más viejo, con los leads que tienen.
export async function lotesDeLeads(): Promise<{ id: string; tipo: string }[]> {
  const { data, error } = await admin()
    .from('lotes_papelera')
    .select('id,tipo')
    .eq('tipo', 'leads')
    .returns<{ id: string; tipo: string }[]>()
  exigir(error, 'leer los lotes de leads')
  return data ?? []
}

// El lote de la papelera donde está un lead (por su nombre), en la pantalla.
export const loteDe = (page: Page, nombre: string): Locator =>
  aLaVista(page.locator('section').filter({ hasText: nombre }))

export const menuDeFicha = (page: Page, nombre: string): Locator =>
  aLaVista(page.getByRole('button', { name: `Más acciones de ${nombre}` }))
