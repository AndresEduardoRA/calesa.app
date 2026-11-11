// Lo que el e2e de Configuración › Flujos › Requisitos para entrar prepara y mira en la base del Supabase LOCAL. Todo requisito que crea un e2e lleva este
// prefijo en sus notas: es lo único que la limpieza borra.
import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { literal, sql } from './sql'
import { flujoDeLaSubasta, origenDeLaSubasta } from './tipos-de-documento'

export const PREFIJO_DE_REQUISITO_E2E = 'E2E 5.08'

export type FaseDePrueba = { id: string; nombre: string }

// Una fase del flujo de la subasta sin requisitos (la primera por su orden); si todas tienen, la primera.
export function faseSinRequisitos(): FaseDePrueba {
  const fila = sql(
    `select f.id || '|' || f.nombre from public.fases f
      where f.flujo_id = '${flujoDeLaSubasta()}'
      order by exists (select 1 from public.fases_requisitos r where r.fase_id = f.id), f.orden
      limit 1`,
  )
  const [id = '', ...nombre] = fila.split('|')
  if (id === '') throw new Error('El flujo de la subasta no tiene fases')
  return { id, nombre: nombre.join('|') }
}

// Los requisitos de una fase en su orden, como «clave:bloqueante:pct» (la clave del dato; el tipo si no es de dato).
export function requisitosEnLaBase(faseId: string): string[] {
  const salida = sql(
    `select coalesce(string_agg(coalesce(clave_dato, tipo::text) || ':' || bloqueante || ':' || coalesce(config->>'pct', ''), ',' order by orden), '')
       from public.fases_requisitos where fase_id = '${faseId}'`,
  )
  return salida === '' ? [] : salida.split(',')
}

export function borrarRequisitosDePrueba(): void {
  sql(
    `delete from public.fases_requisitos where notas like ${literal(`${PREFIJO_DE_REQUISITO_E2E}%`)}`,
  )
}

export async function abrirInspector(page: Page, faseId: string): Promise<Locator> {
  await page.goto(`/configuracion/flujos?origen=${origenDeLaSubasta()}&fase=${faseId}`)
  const inspector = page.getByRole('dialog').filter({ hasText: 'Requisitos para entrar' })
  await expect(inspector).toBeVisible()
  return inspector
}

// Las descripciones de los requisitos de la fase, en el orden en que se ven.
export async function descripcionesDeLaLista(inspector: Locator): Promise<string[]> {
  const textos = await inspector
    .getByRole('list', { name: 'Requisitos de la fase' })
    .locator('li > div > p:first-child')
    .allInnerTexts()
  return textos.map((t) => t.trim())
}
