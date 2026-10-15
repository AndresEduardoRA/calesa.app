// Lo que los e2e de embudos y oportunidades preparan y miran en la base del Supabase LOCAL sin pasar
// por la pantalla: el embudo por defecto y las oportunidades de una persona (por sus RPC, con su
// sesión, como en la app) y dónde quedó cada una.
import { expect, type Locator, type Page } from '@playwright/test'
import { admin } from './base'
import { aLaVista, esMovil } from './inventario'
import { exigir } from './leads'
import { rpcComo } from './leads-cartera'

export type EmbudoDePrueba = { id: string; etapas: { id: string; nombre: string }[] }

export async function embudoPorDefecto(email: string): Promise<EmbudoDePrueba> {
  const { data, error } = await rpcComo(email, 'embudo_por_defecto', {})
  exigir(error, `preparar el embudo de ${email}`)
  const embudo = (data as { embudo: EmbudoDePrueba }).embudo
  return { id: embudo.id, etapas: embudo.etapas.map((e) => ({ id: e.id, nombre: e.nombre })) }
}

export const etapa = (embudo: EmbudoDePrueba, nombre: string): string => {
  const encontrada = embudo.etapas.find((e) => e.nombre === nombre)
  if (!encontrada) {
    throw new Error(`El embudo no tiene la etapa «${nombre}».`)
  }
  return encontrada.id
}

export async function oportunidad(
  email: string,
  leadId: string,
  datos: Record<string, unknown>,
): Promise<{ id: string; etapa_id: string; actualizado_en: string }> {
  const { data, error } = await rpcComo(email, 'oportunidad_crear', {
    p_id: crypto.randomUUID(),
    p_lead: leadId,
    p_datos: datos,
  })
  exigir(error, 'crear una oportunidad')
  return (data as { oportunidad: { id: string; etapa_id: string; actualizado_en: string } })
    .oportunidad
}

// Muchas a la vez (para «Ver más»): directo, con el cliente de servicio, en la inicial del embudo.
export async function muchasOportunidades(datos: {
  usuarioId: string
  leadId: string
  embudo: EmbudoDePrueba
  etapaId: string
  cantidad: number
}): Promise<void> {
  const { usuarioId, leadId, embudo, etapaId, cantidad } = datos
  const filas = Array.from({ length: cantidad }, (_, i) => ({
    lead_id: leadId,
    usuario_id: usuarioId,
    embudo_id: embudo.id,
    etapa_id: etapaId,
    titulo: `E2E Muchas ${String(i + 1)}`,
    moneda: 'USD',
  }))
  const { error } = await admin().from('oportunidades').insert(filas)
  exigir(error, 'cargar muchas oportunidades')
}

export async function enLaBase(id: string) {
  const { data, error } = await admin()
    .from('oportunidades')
    .select('etapa_id, estado, motivo_perdida, titulo, monto_estimado, eliminado_en, vehiculo_id')
    .eq('id', id)
    .single<{
      etapa_id: string
      estado: string
      motivo_perdida: string | null
      titulo: string
      monto_estimado: number | null
      eliminado_en: string | null
      vehiculo_id: string | null
    }>()
  exigir(error, 'leer la oportunidad')
  return data
}

export async function etapasEnLaBase(embudoId: string): Promise<string[]> {
  const { data, error } = await admin()
    .from('embudos_etapas')
    .select('nombre, orden')
    .eq('embudo_id', embudoId)
    .order('orden')
    .returns<{ nombre: string }[]>()
  exigir(error, 'leer las etapas')
  return (data ?? []).map((e) => e.nombre)
}

export async function irAlEmbudo(page: Page, consulta = ''): Promise<void> {
  await page.goto(`/leads?vista=embudo${consulta}`)
  await expect(page.getByRole('heading', { name: 'Embudo', level: 1 })).toBeAttached()
}

// Una tarjeta del kanban por su título (sólo la que se ve: en el celular hay una columna por vez).
export const tarjeta = (page: Page, titulo: string): Locator =>
  aLaVista(page.getByRole('article', { name: titulo }))

// La columna de una etapa en escritorio, o su pestaña en el celular (se elige antes de mirar).
export async function verEtapa(page: Page, nombre: string): Promise<Locator> {
  if (esMovil(page)) {
    await page.getByRole('tab', { name: new RegExp(`^${nombre}`) }).click()
    return aLaVista(page.getByRole('tabpanel'))
  }
  return aLaVista(page.getByRole('region', { name: new RegExp(`^${nombre}:`) }))
}

export async function moverA(page: Page, titulo: string, destino: string): Promise<void> {
  await tarjeta(page, titulo)
    .getByRole('button', { name: `Mover «${titulo}» a otra etapa` })
    .click()
  await page.getByRole('menuitem', { name: destino, exact: true }).click()
}
