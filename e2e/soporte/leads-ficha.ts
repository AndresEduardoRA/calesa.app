// Lo que los e2e de la ficha del lead preparan y miran en la base del Supabase LOCAL sin pasar por
// la pantalla: un lead propio de cada test, sus teléfonos extra, un seguimiento que entra «de afuera»
// y la versión con la que está guardado.
import { expect, type Locator, type Page } from '@playwright/test'
import { admin } from './base'
import { aLaVista } from './inventario'
import { crearLead, exigir } from './leads'
import { nombre } from './leads-listado'

export type LeadDePrueba = { id: string; numero: number; telefono: string; nombre: string }

// Un lead de esa persona con un teléfono que no se repite. El nombre lleva el prefijo «E2E » (lo
// borra la limpieza) y se usa tal cual en las pantallas.
export async function nuevoLead(datos: {
  corto: string
  telefono: string
  deQuien: string
  atributos?: Record<string, unknown>
}): Promise<LeadDePrueba> {
  const id = await crearLead({
    nombre: datos.corto,
    telefono: datos.telefono,
    deQuien: datos.deQuien,
    ...(datos.atributos ? { atributos: datos.atributos } : {}),
  })
  const { data, error } = await admin()
    .from('leads')
    .select('numero, nombre')
    .eq('id', id)
    .single<{ numero: number; nombre: string }>()
  exigir(error, `leer el lead ${datos.corto}`)
  return { id, numero: data?.numero ?? 0, telefono: datos.telefono, nombre: data?.nombre ?? '' }
}

// La versión con la que está guardado (lo que la pantalla manda de vuelta al guardar).
export async function versionDe(leadId: string): Promise<string> {
  const { data, error } = await admin()
    .from('leads')
    .select('actualizado_en')
    .eq('id', leadId)
    .single<{ actualizado_en: string }>()
  exigir(error, 'leer la versión del lead')
  return data?.actualizado_en ?? ''
}

export type FilaDeLeadEnLaBase = {
  nombre: string
  tipo: string
  origen_lead_id: string | null
  atributos: Record<string, unknown>
  actualizado_en: string
}

export async function leadEnLaBase(leadId: string): Promise<FilaDeLeadEnLaBase> {
  const { data, error } = await admin()
    .from('leads')
    .select('nombre, tipo, origen_lead_id, atributos, actualizado_en')
    .eq('id', leadId)
    .single<FilaDeLeadEnLaBase>()
  exigir(error, 'leer el lead')
  if (!data) {
    throw new Error('El lead no existe.')
  }
  return data
}

// Los teléfonos extra, escritos como los escribirá la parte 4b (la app todavía no los escribe).
export async function ponerExtras(
  leadId: string,
  extras: { telefono: string; etiqueta: string | null }[],
): Promise<void> {
  const { error } = await admin()
    .from('leads_telefonos')
    .insert(extras.map((extra) => ({ lead_id: leadId, ...extra })))
  exigir(error, 'cargar los teléfonos extra')
}

// Un seguimiento que entra mientras alguien edita: el trigger mueve `ultimo_seguimiento_en`.
export async function meterSeguimiento(leadId: string, quienId: string): Promise<void> {
  const { data: tipo, error: errorTipo } = await admin()
    .from('tipos_seguimiento')
    .select('id')
    .eq('activo', true)
    .limit(1)
    .single<{ id: string }>()
  exigir(errorTipo, 'leer un tipo de seguimiento')
  const { error } = await admin()
    .from('seguimientos')
    .insert({
      lead_id: leadId,
      usuario_id: quienId,
      tipo_id: tipo?.id ?? '',
      titulo: 'E2E llegó un seguimiento',
    })
  exigir(error, 'insertar el seguimiento')
}

// Cuántas veces quedó constancia de una edición de la ficha de este lead.
export async function edicionesRegistradas(leadId: string): Promise<number> {
  const { count, error } = await admin()
    .from('actividad')
    .select('id', { count: 'exact', head: true })
    .eq('tabla', 'leads')
    .eq('registro_id', leadId)
    .eq('accion', 'leads.update')
  exigir(error, 'contar las ediciones')
  return count ?? 0
}

// Le saca el lead a quien lo tenía, como lo haría compartir/revocar (parte 6).
export async function revocarCartera(leadId: string, personaId: string): Promise<void> {
  const { error } = await admin()
    .from('leads_asesores')
    .update({ revocado_en: new Date().toISOString() })
    .eq('lead_id', leadId)
    .eq('usuario_id', personaId)
  exigir(error, 'revocar el acceso')
}

export async function irAFicha(page: Page, leadId: string, consulta = ''): Promise<void> {
  await page.goto(`/leads/${leadId}${consulta}`)
}

export const tituloDeLaFicha = (page: Page, nombre: string): Locator =>
  page.getByRole('heading', { name: nombre, level: 1 })

export const panelDeEdicion = (page: Page): Locator =>
  page.getByRole('dialog', { name: /^Editar / })

export const botonEditar = (page: Page): Locator =>
  aLaVista(page.getByRole('button', { name: 'Editar', exact: true }))

// Abre el panel con el botón y espera a que esté (la página hidrata antes de que el clic valga).
export async function abrirEdicion(page: Page): Promise<Locator> {
  const panel = panelDeEdicion(page)
  await expect(async () => {
    await botonEditar(page).click()
    await expect(panel).toBeVisible({ timeout: 1000 })
  }).toPass()
  return panel
}

// El texto de lo que no se ve, igual para todos los casos.
export const NO_DISPONIBLE = 'No encontramos este lead o no tienes acceso.'

// Un guardado de la ficha viaja como Server Action: este es su cuerpo, para mirar qué se mandó.
export function alGuardarFicha(page: Page) {
  return page.waitForRequest(
    (peticion) =>
      peticion.method() === 'POST' &&
      peticion.headers()['next-action'] !== undefined &&
      (peticion.postData() ?? '').includes('actualizadoEnEsperado'),
  )
}

export function cuerpoDeAccion(postData: string | null): {
  id: string
  actualizadoEnEsperado: string
  cambios: Record<string, unknown>
} {
  const arreglo = JSON.parse(postData ?? '[]') as unknown[]
  return arreglo[0] as {
    id: string
    actualizadoEnEsperado: string
    cambios: Record<string, unknown>
  }
}

// El id de un lead del terreno por su nombre corto (el prefijo «E2E » lo pone `nombre()`).
export async function idDeLead(corto: string): Promise<string> {
  const { data, error } = await admin()
    .from('leads')
    .select('id')
    .eq('nombre', nombre(corto))
    .single<{ id: string }>()
  exigir(error, `buscar el lead ${corto}`)
  return data?.id ?? ''
}

// El teléfono principal normalizado de un lead (con el código de país).
export async function telefonoDeLead(leadId: string): Promise<string> {
  const { data, error } = await admin()
    .from('leads')
    .select('telefono_principal')
    .eq('id', leadId)
    .single<{ telefono_principal: string }>()
  exigir(error, 'leer el teléfono del lead')
  return data?.telefono_principal ?? ''
}
