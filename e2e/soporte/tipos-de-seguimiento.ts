// Lo que los e2e de Configuración › Leads › Tipos de seguimiento preparan y miran en la base del Supabase LOCAL. Todo tipo que crea un e2e
// lleva este prefijo en su nombre: es lo único que la limpieza borra (los seguimientos que lo usen se borran antes, con
// `borrarLeadsDePrueba`).
import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { admin } from './base'
import { exigir } from './leads'

export const PREFIJO_DE_TIPO_DE_SEGUIMIENTO_E2E = 'E2E 9k'

export type TipoDeSeguimientoEnLaBase = {
  id: string
  clave: string
  nombre: string
  icono: string | null
  activo: boolean
  orden: number
  actualizado_en: string
}

export async function tiposDeSeguimientoEnLaBase(): Promise<TipoDeSeguimientoEnLaBase[]> {
  const { data, error } = await admin()
    .from('tipos_seguimiento')
    .select('id, clave, nombre, icono, activo, orden, actualizado_en')
    .order('orden')
    .order('nombre')
    .returns<TipoDeSeguimientoEnLaBase[]>()
  exigir(error, 'leer los tipos de seguimiento')
  return data ?? []
}

export async function tipoDeSeguimientoEnLaBase(
  nombre: string,
): Promise<TipoDeSeguimientoEnLaBase | undefined> {
  return (await tiposDeSeguimientoEnLaBase()).find((tipo) => tipo.nombre === nombre)
}

// Un tipo de prueba por el camino de la base (sin la pantalla): para armar el terreno.
export async function sembrarTipoDeSeguimiento(
  nombre: string,
  { icono = null, activo = true }: { icono?: string | null; activo?: boolean } = {},
): Promise<TipoDeSeguimientoEnLaBase> {
  const orden = Math.max(0, ...(await tiposDeSeguimientoEnLaBase()).map((tipo) => tipo.orden)) + 10
  const clave = `e2e_9k_${nombre.toLowerCase().replaceAll(/[^a-z0-9]+/g, '_')}`.slice(0, 30)
  const { error } = await admin()
    .from('tipos_seguimiento')
    .insert({ clave, nombre, icono, orden, activo })
  exigir(error, `sembrar el tipo de seguimiento ${nombre}`)
  const sembrado = await tipoDeSeguimientoEnLaBase(nombre)
  if (!sembrado) throw new Error(`No quedó el tipo de seguimiento ${nombre}`)
  return sembrado
}

// Hasta que haya `total` tipos (rellena con los de prueba, apagados, sin repetir los que ya puso).
export async function llenarTiposDeSeguimientoHasta(total: number): Promise<void> {
  const hoy = await tiposDeSeguimientoEnLaBase()
  const rellenos = hoy.filter((tipo) => tipo.clave.startsWith('e2e_9k_relleno_')).length
  const filas = Array.from({ length: Math.max(0, total - hoy.length) }, (_, n) => ({
    clave: `e2e_9k_relleno_${String(rellenos + n)}`,
    nombre: `${PREFIJO_DE_TIPO_DE_SEGUIMIENTO_E2E} relleno ${String(rellenos + n + 1).padStart(3, '0')}`,
    activo: false,
    orden: 5000 + (rellenos + n) * 10,
  }))
  if (filas.length === 0) return
  const { error } = await admin().from('tipos_seguimiento').insert(filas)
  exigir(error, 'rellenar los tipos de seguimiento')
}

// Quita lo que creó un e2e (con los seguimientos de prueba que usen esos tipos: la FK es `restrict`) y vuelve a encender los de fábrica
// que un caso pudo apagar.
export async function borrarTiposDeSeguimientoDePrueba(): Promise<void> {
  const { data, error: errorDeLectura } = await admin()
    .from('tipos_seguimiento')
    .select('id')
    .like('nombre', `${PREFIJO_DE_TIPO_DE_SEGUIMIENTO_E2E}%`)
  exigir(errorDeLectura, 'leer los tipos de seguimiento de prueba')
  const ids = (data ?? []).map((fila) => fila.id)
  if (ids.length > 0) {
    const usos = await admin().from('seguimientos').delete().in('tipo_id', ids)
    exigir(usos.error, 'borrar los seguimientos de los tipos de prueba')
  }
  const { error } = await admin()
    .from('tipos_seguimiento')
    .delete()
    .like('nombre', `${PREFIJO_DE_TIPO_DE_SEGUIMIENTO_E2E}%`)
  exigir(error, 'borrar los tipos de seguimiento de prueba')
  const fabrica = await admin()
    .from('tipos_seguimiento')
    .update({ activo: true })
    .not('clave', 'like', 'e2e_%')
  exigir(fabrica.error, 'volver a encender los tipos de seguimiento de fábrica')
}

// --- La pantalla --------------------------------------------------------------------------------------

export async function abrirTiposDeSeguimiento(page: Page): Promise<void> {
  await page.goto('/configuracion/leads?seccion=seguimientos')
  await expect(page.getByRole('heading', { name: 'Tipos de seguimiento', level: 2 })).toBeVisible()
}

// La fila de un tipo (en la tabla o en la tarjeta del celular): la que tiene el botón con su nombre.
export const filaDeTipoDeSeguimiento = (page: Page, nombre: string): Locator =>
  page
    .locator('tr, li')
    .filter({ has: page.getByRole('button', { name: `Abrir ${nombre}`, exact: true }) })

export const masAccionesDe = (page: Page, nombre: string): Locator =>
  page.getByRole('button', { name: `Más acciones de ${nombre}`, exact: true })

// Elige una línea del «⋯» de la fila.
export async function elegirDelMenu(page: Page, nombre: string, linea: string): Promise<void> {
  await masAccionesDe(page, nombre).click()
  await page.getByRole('menuitem', { name: linea, exact: true }).click()
}

// Los nombres de las filas, en el orden en que se ven.
export const nombresDeLaLista = (page: Page): Locator =>
  page
    .locator('section[aria-labelledby="titulo-de-tipos-de-seguimiento"]')
    .getByRole('button', { name: /^Abrir / })

export async function nombresDeSeguimientoEnPantalla(page: Page): Promise<string[]> {
  const botones = await nombresDeLaLista(page).all()
  const nombres: string[] = []
  for (const boton of botones) {
    nombres.push(((await boton.getAttribute('aria-label')) ?? '').replace(/^Abrir /, ''))
  }
  return nombres
}

export const modalDeTipoDeSeguimiento = (
  page: Page,
  titulo: 'Nuevo tipo de seguimiento' | 'Editar tipo de seguimiento',
): Locator => page.getByRole('dialog', { name: titulo })

// El icono que dibuja una fila (`data-icono` de su `<svg>`), o nada si no lleva.
export async function iconoDeLaFila(fila: Locator): Promise<string | null> {
  const icono = fila.locator('svg[data-icono]').first()
  return (await icono.count()) === 0 ? null : await icono.getAttribute('data-icono')
}

// Elige un icono del selector por su nombre («Estrella», «Sin icono»): se hace clic en su baldosa, que es lo que toca una persona (el radio
// de adentro es de lectura de pantalla y está fuera de la vista).
export async function elegirIcono(modal: Locator, nombre: string): Promise<void> {
  const baldosa =
    nombre === 'Sin icono'
      ? modal.locator('label', { hasText: /^Sin icono$/ })
      : modal.locator(`label[title="${nombre}"]`)
  await baldosa.scrollIntoViewIfNeeded()
  await baldosa.click()
}
