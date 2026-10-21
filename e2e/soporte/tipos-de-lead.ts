// Lo que los e2e de Configuración › Leads › Tipos de lead preparan y miran en la base del Supabase LOCAL.
// Todo tipo que crea un e2e lleva este prefijo en su nombre: es lo único que la limpieza borra. Los dos de fábrica (Prospecto y
// Cliente) se dejan siempre activos.
import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { admin } from './base'
import { exigir } from './leads'
import { filaDeCatalogo, nombresEnLaLista } from './lista-de-catalogo'

export const PREFIJO_DE_TIPO_E2E = 'E2E 9j'

export type ClaseDeTipo = 'prospecto' | 'cliente'

export type TipoEnLaBase = {
  id: string
  clave: string
  nombre: string
  clase: ClaseDeTipo
  activo: boolean
  orden: number
  actualizado_en: string
}

export async function tiposEnLaBase(): Promise<TipoEnLaBase[]> {
  const { data, error } = await admin()
    .from('tipos_lead')
    .select('id, clave, nombre, clase, activo, orden, actualizado_en')
    .order('orden')
    .order('nombre')
    .returns<TipoEnLaBase[]>()
  exigir(error, 'leer los tipos de lead')
  return data ?? []
}

export async function tipoEnLaBase(nombre: string): Promise<TipoEnLaBase | undefined> {
  return (await tiposEnLaBase()).find((tipo) => tipo.nombre === nombre)
}

// El de fábrica de una clase (su clave es la del enum que reemplazó).
export async function tipoDeFabrica(clase: ClaseDeTipo): Promise<TipoEnLaBase> {
  const tipo = (await tiposEnLaBase()).find((t) => t.clave === clase)
  if (!tipo) throw new Error(`Falta el tipo de fábrica «${clase}»`)
  return tipo
}

// Un tipo de prueba por el camino de la base (sin la pantalla): para armar el terreno.
export async function sembrarTipo(
  nombre: string,
  clase: ClaseDeTipo = 'cliente',
  activo = true,
): Promise<TipoEnLaBase> {
  const orden = Math.max(0, ...(await tiposEnLaBase()).map((tipo) => tipo.orden)) + 10
  const clave = `e2e_9j_${nombre.toLowerCase().replaceAll(/[^a-z0-9]+/g, '_')}`.slice(0, 30)
  const { error } = await admin().from('tipos_lead').insert({ clave, nombre, clase, orden, activo })
  exigir(error, `sembrar el tipo ${nombre}`)
  const sembrado = await tipoEnLaBase(nombre)
  if (!sembrado) throw new Error(`No quedó el tipo ${nombre}`)
  return sembrado
}

// Hasta que haya `total` tipos (rellena con los de prueba —apagados, de la clase cliente—, sin repetir los que ya puso).
export async function llenarHasta(total: number): Promise<void> {
  const hoy = await tiposEnLaBase()
  const rellenos = hoy.filter((tipo) => tipo.clave.startsWith('e2e_9j_relleno_')).length
  const filas = Array.from({ length: Math.max(0, total - hoy.length) }, (_, n) => ({
    clave: `e2e_9j_relleno_${String(rellenos + n)}`,
    nombre: `${PREFIJO_DE_TIPO_E2E} relleno ${String(rellenos + n + 1).padStart(3, '0')}`,
    clase: 'cliente' as const,
    activo: false,
    orden: 5000 + (rellenos + n) * 10,
  }))
  if (filas.length === 0) return
  const { error } = await admin().from('tipos_lead').insert(filas)
  exigir(error, 'rellenar los tipos')
}

// Vuelve los dos de fábrica a activos (un caso puede haberlos apagado) y quita lo que creó un e2e (los leads que usen un tipo se
// borran antes, con `borrarLeadsDePrueba`). Se enciende primero: borrar nunca deja una clase sin activos.
export async function borrarTiposDePrueba(): Promise<void> {
  const encender = await admin()
    .from('tipos_lead')
    .update({ activo: true })
    .in('clave', ['prospecto', 'cliente'])
  exigir(encender.error, 'volver a encender los tipos de fábrica')
  const { error } = await admin()
    .from('tipos_lead')
    .delete()
    .like('nombre', `${PREFIJO_DE_TIPO_E2E}%`)
  exigir(error, 'borrar los tipos de prueba')
}

// --- La pantalla --------------------------------------------------------------------------------------

export async function abrirTipos(page: Page): Promise<void> {
  await page.goto('/configuracion/leads?seccion=tipos')
  await expect(page.getByRole('heading', { name: 'Tipos de lead', level: 2 })).toBeVisible()
}

// Lo de la lista (la fila, el «⋯», los nombres) es común a las tres pestañas: `soporte/lista-de-catalogo.ts`. Activar y desactivar ya no son un
// interruptor sino una línea del «⋯» de la fila (`alternarActivo`, `lineaApagada`).
export const filaDeTipo = filaDeCatalogo
export const nombresEnPantalla = (page: Page): Promise<string[]> => nombresEnLaLista(page, 'tipos')

export const modalDeTipo = (page: Page, titulo: 'Nuevo tipo' | 'Editar tipo'): Locator =>
  page.getByRole('dialog', { name: titulo })
