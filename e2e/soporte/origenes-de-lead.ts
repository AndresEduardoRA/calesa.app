// Lo que los e2e de Configuración › Leads › Orígenes preparan y miran en la base del Supabase LOCAL.
// Todo origen que crea un e2e lleva este prefijo en su nombre: es lo único que la limpieza borra.
import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { admin } from './base'
import { esMovil } from './inventario'
import { exigir } from './leads'
import { filaDeCatalogo, nombresEnLaLista } from './lista-de-catalogo'

export const PREFIJO_DE_ORIGEN_E2E = 'E2E 9f'

export type OrigenEnLaBase = {
  id: string
  clave: string
  nombre: string
  activo: boolean
  orden: number
  actualizado_en: string
}

export async function origenesEnLaBase(): Promise<OrigenEnLaBase[]> {
  const { data, error } = await admin()
    .from('origenes_lead')
    .select('id, clave, nombre, activo, orden, actualizado_en')
    .order('orden')
    .order('nombre')
    .returns<OrigenEnLaBase[]>()
  exigir(error, 'leer los orígenes del lead')
  return data ?? []
}

// Un grupo del panel de filtros del listado, en el contenedor que esa pantalla usa: el panel del costado en escritorio
// y la hoja en el celular. En escritorio la hoja también existe un cuadro (~7 ms, con opacidad 0: nunca se pinta, ver
// `docs/BITACORA.md`, 9g) y un localizador por rol que no distinga el contenedor contaría dos grupos «visibles».
export function grupoDelFiltro(page: Page, nombre: string): Locator {
  const panel = esMovil(page)
    ? page.getByRole('dialog', { name: 'Filtros' })
    : page.getByRole('complementary', { name: 'Filtros' })
  return panel.getByRole('group', { name: nombre })
}

export async function origenEnLaBase(nombre: string): Promise<OrigenEnLaBase | undefined> {
  return (await origenesEnLaBase()).find((origen) => origen.nombre === nombre)
}

// Un origen de prueba por el camino de la base (sin la pantalla): para armar el terreno.
export async function sembrarOrigen(nombre: string, activo = true): Promise<OrigenEnLaBase> {
  const orden = Math.max(0, ...(await origenesEnLaBase()).map((origen) => origen.orden)) + 10
  const clave = `e2e_9f_${nombre.toLowerCase().replaceAll(/[^a-z0-9]+/g, '_')}`.slice(0, 30)
  const { error } = await admin().from('origenes_lead').insert({ clave, nombre, orden, activo })
  exigir(error, `sembrar el origen ${nombre}`)
  const sembrado = await origenEnLaBase(nombre)
  if (!sembrado) throw new Error(`No quedó el origen ${nombre}`)
  return sembrado
}

// Hasta que haya `total` orígenes (rellena con los de prueba, sin repetir los que ya puso).
export async function llenarHasta(total: number): Promise<void> {
  const hoy = await origenesEnLaBase()
  const rellenos = hoy.filter((origen) => origen.clave.startsWith('e2e_9f_relleno_')).length
  const filas = Array.from({ length: Math.max(0, total - hoy.length) }, (_, n) => ({
    clave: `e2e_9f_relleno_${String(rellenos + n)}`,
    nombre: `${PREFIJO_DE_ORIGEN_E2E} relleno ${String(rellenos + n + 1).padStart(3, '0')}`,
    orden: 5000 + (rellenos + n) * 10,
  }))
  if (filas.length === 0) return
  const { error } = await admin().from('origenes_lead').insert(filas)
  exigir(error, 'rellenar los orígenes')
}

// Quita lo que creó un e2e (los leads que lo usen se borran antes, con `borrarLeadsDePrueba`).
export async function borrarOrigenesDePrueba(): Promise<void> {
  const { error } = await admin()
    .from('origenes_lead')
    .delete()
    .like('nombre', `${PREFIJO_DE_ORIGEN_E2E}%`)
  exigir(error, 'borrar los orígenes de prueba')
}

// --- La pantalla --------------------------------------------------------------------------------------

export async function abrirOrigenes(page: Page): Promise<void> {
  await page.goto('/configuracion/leads?seccion=origenes')
  await expect(page.getByRole('heading', { name: 'Orígenes del lead', level: 2 })).toBeVisible()
}

// Lo de la lista (la fila, el «⋯», los nombres) es común a las tres pestañas: `soporte/lista-de-catalogo.ts`.
export const filaDeOrigen = filaDeCatalogo
export const nombresEnPantalla = (page: Page): Promise<string[]> =>
  nombresEnLaLista(page, 'origenes')

export const modalDeOrigen = (page: Page, titulo: 'Nuevo origen' | 'Editar origen'): Locator =>
  page.getByRole('dialog', { name: titulo })
