// El terreno de la sección «Vehículos» de la ficha del lead, en el Supabase LOCAL: el del inventario
// (Corea y Taiwán) más cuatro personas con leads y vehículos, y lo que se lee de la base para
// comprobar el vínculo y el interés sin pasar por la pantalla.
import type { Locator, Page } from '@playwright/test'
import { expect } from './prueba'
import {
  PREFIJO_ROL_E2E,
  admin,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
  type PermisoDePrueba,
} from './base'
import { CLAVE, aLaVista, limpiarInventario, prepararInventario, type Terreno } from './inventario'
import { borrarLeadsDePrueba, crearLead, exigir, idDe, PREFIJO_DE_LEAD_E2E } from './leads'

export type TerrenoDeVehiculos = {
  inventario: Terreno
  // Asesoras con alcance «propios» en leads y en los vehículos de Corea.
  ada: string
  cora: string
  // Ve y edita todo (leads y los vehículos de Corea), sin tener los leads en su cartera.
  sol: string
  // Tiene sus leads, pero ningún permiso sobre vehículos: no ve la sección.
  lia: string
}

const ASESORA = (coreaId: string): PermisoDePrueba[] => [
  { clave: 'leads.ver', alcance: 'propios' },
  { clave: 'leads.editar', alcance: 'propios' },
  { clave: 'leads.compartir', alcance: 'propios' },
  { clave: 'leads.transferir', alcance: 'propios' },
  { clave: 'leads.eliminar', alcance: 'propios' },
  { clave: 'vehiculos.ver', origenId: coreaId, alcance: 'propios' },
  { clave: 'vehiculos.editar', origenId: coreaId, alcance: 'propios' },
]

async function persona(
  proyecto: string,
  corto: string,
  nombre: string,
  permisos: PermisoDePrueba[],
) {
  const email = correoDePrueba(`${corto}-vehiculos-lead-${proyecto}`)
  await crearPersona({ email, contrasena: CLAVE, nombre, invitada: true })
  await darRolDePrueba({
    email,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}${nombre} ${proyecto}`,
      clave: `e2e_${corto}_vehiculos_lead_${proyecto.replaceAll(/[^a-z0-9]/g, '_')}`,
    },
    permisos,
  })
  return email
}

export async function prepararVehiculosDelLead(proyecto: string): Promise<TerrenoDeVehiculos> {
  await borrarLeadsDePrueba()
  const inventario = await prepararInventario(proyecto)
  const corea = inventario.corea.id
  return {
    inventario,
    ada: await persona(proyecto, 'ada', 'Ada Vínculo', ASESORA(corea)),
    cora: await persona(proyecto, 'cora', 'Cora Vínculo', ASESORA(corea)),
    sol: await persona(proyecto, 'sol', 'Sol Supervisión', [
      { clave: 'leads.ver', alcance: 'todos' },
      { clave: 'leads.editar', alcance: 'todos' },
      { clave: 'vehiculos.ver', origenId: corea, alcance: 'todos' },
      { clave: 'vehiculos.editar', origenId: corea, alcance: 'todos' },
    ]),
    lia: await persona(proyecto, 'lia', 'Lia Sin Vehículos', [
      { clave: 'leads.ver', alcance: 'propios' },
      { clave: 'leads.editar', alcance: 'propios' },
    ]),
  }
}

export async function limpiarVehiculosDelLead(): Promise<void> {
  await borrarLeadsDePrueba()
  await limpiarInventario()
}

let telefono = Number(String(Date.now()).slice(-7))

// Un lead en la cartera de esa persona (dueña). Devuelve su id y el nombre como se ve.
export async function leadDe(
  email: string,
  nombre: string,
): Promise<{ id: string; nombre: string }> {
  telefono += 1
  const id = await crearLead({
    nombre,
    telefono: `5917${String(telefono).slice(-7)}`,
    deQuien: email,
  })
  return { id, nombre: `${PREFIJO_DE_LEAD_E2E}${nombre}` }
}

// Un vehículo de Corea creado por esa persona (con alcance «propios», es suyo).
export async function vehiculoDe(origenId: string, titulo: string, email: string): Promise<string> {
  const { data, error } = await admin()
    .from('vehiculos')
    .insert({ origen_id: origenId, titulo, creado_por: await idDe(email) })
    .select('id')
    .single<{ id: string }>()
  exigir(error, `cargar ${titulo}`)
  return data?.id ?? ''
}

export async function compartirCon(leadId: string, email: string, quien: string): Promise<void> {
  const { error } = await admin()
    .from('leads_asesores')
    .insert({
      lead_id: leadId,
      usuario_id: await idDe(email),
      tipo_acceso: 'compartido',
      compartido_por: await idDe(quien),
    })
  exigir(error, 'compartir el lead')
}

export async function numeroDe(vehiculoId: string): Promise<number> {
  const { data, error } = await admin()
    .from('vehiculos')
    .select('numero')
    .eq('id', vehiculoId)
    .single<{ numero: number }>()
  exigir(error, 'leer el número del vehículo')
  return data?.numero ?? 0
}

export async function leadDelVehiculo(vehiculoId: string): Promise<string | null> {
  const { data, error } = await admin()
    .from('vehiculos')
    .select('lead_id')
    .eq('id', vehiculoId)
    .single<{ lead_id: string | null }>()
  exigir(error, 'leer el vínculo')
  return data?.lead_id ?? null
}

// La nota del interés, o `undefined` si no hay interés.
export async function notaDelInteres(
  vehiculoId: string,
  leadId: string,
): Promise<string | null | undefined> {
  const { data, error } = await admin()
    .from('vehiculos_interesados')
    .select('nota')
    .eq('vehiculo_id', vehiculoId)
    .eq('lead_id', leadId)
    .maybeSingle<{ nota: string | null }>()
  exigir(error, 'leer el interés')
  return data === null ? undefined : data.nota
}

export async function irAVehiculos(page: Page, leadId: string, consulta = ''): Promise<void> {
  await page.goto(`/leads/${leadId}?seccion=vehiculos${consulta}`)
  await expect(seccionVehiculos(page)).toBeVisible()
}

export const seccionVehiculos = (page: Page): Locator =>
  aLaVista(page.getByRole('region', { name: 'Vehículos', exact: true }))
export const vinculados = (page: Page): Locator =>
  aLaVista(page.getByRole('list', { name: 'Vehículos vinculados' }))
export const interesados = (page: Page): Locator =>
  aLaVista(page.getByRole('list', { name: 'Vehículos de interés' }))
export const panelAgregar = (page: Page): Locator =>
  page.getByRole('dialog', { name: 'Agregar vehículo' })

// Abre «Agregar vehículo», busca y elige uno.
export async function elegirVehiculo(page: Page, titulo: string): Promise<Locator> {
  await aLaVista(page.getByRole('button', { name: 'Agregar vehículo' }))
    .first()
    .click()
  const panel = panelAgregar(page)
  await expect(panel).toBeVisible()
  await panel.getByLabel('Buscar por título, VIN, lote o número').fill(titulo)
  await panel.getByRole('radio', { name: new RegExp(titulo) }).check()
  return panel
}
