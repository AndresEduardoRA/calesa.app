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

// Lo que el requisito de ese tipo en la fase tiene guardado, como «mínimo|máximo|formatos|bloqueante|ámbito de la espera|notas».
export function filaDeRequisito(faseId: string, tipo: 'documento' | 'espera'): string {
  return sql(
    `select coalesce(min_archivos::text, '') || '|' || coalesce(max_archivos::text, '') || '|' || coalesce(array_to_string(formatos, ';'), '')
            || '|' || bloqueante || '|' || coalesce(espera_ambito::text, '') || '|' || coalesce(notas, '')
       from public.fases_requisitos where fase_id = '${faseId}' and tipo::text = '${tipo}' order by orden limit 1`,
  )
}

// Un tipo de documento activo del flujo de la subasta (PDF y JPG), por el camino de la base: devuelve su id.
export function sembrarTipoActivo(nombre: string): string {
  return sql(
    `insert into public.tipos_documento (flujo_id, nombre, orden, formatos)
       select '${flujoDeLaSubasta()}', ${literal(nombre)}, coalesce(max(orden), 0) + 10, array['application/pdf', 'image/jpeg']
         from public.tipos_documento where flujo_id = '${flujoDeLaSubasta()}'
     returning id`,
  )
}

// El nombre de una fase activa del flujo de repuestos (la primera por su orden): lo que una espera del flujo de vehículos puede esperar.
export function faseDeRepuestos(): string {
  return sql(
    `select f.nombre from public.fases f join public.flujos fl on fl.id = f.flujo_id
      where fl.ambito = 'repuestos' and f.activa order by fl.nombre, f.orden limit 1`,
  )
}

// La regla «Esperas» del flujo de la subasta: sí, no, o `null` (sin fila = apagada, y es lo que había que restaurar).
export function estadoDeLaRegla(regla: string): boolean | null {
  const activa = sql(
    `select activa::text from public.flujos_reglas where flujo_id = '${flujoDeLaSubasta()}' and regla = ${literal(regla)}`,
  )
  return activa === '' ? null : activa === 'true'
}

export function fijarRegla(regla: string, activa: boolean | null): void {
  const flujo = flujoDeLaSubasta()
  if (activa === null) {
    sql(
      `delete from public.flujos_reglas where flujo_id = '${flujo}' and regla = ${literal(regla)}`,
    )
    return
  }
  sql(
    `insert into public.flujos_reglas (flujo_id, regla, activa) values ('${flujo}', ${literal(regla)}, ${String(activa)})
       on conflict (flujo_id, regla) do update set activa = excluded.activa`,
  )
}

// Los tipos sembrados, con los requisitos que los piden antes (la FK es `restrict`; editar vacía las notas, así que no los borra la limpieza por notas).
export function borrarTiposDeRequisitoDePrueba(): void {
  const como = `like ${literal(`${PREFIJO_DE_REQUISITO_E2E}%`)}`
  sql(
    `delete from public.fases_requisitos where tipo_documento_id in (select id from public.tipos_documento where nombre ${como});
     delete from public.tipos_documento where nombre ${como};`,
  )
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

// «Agregar requisito» y la forma que se elige en el selector («Dato», «Documento» o «Espera»).
export async function abrirForma(
  inspector: Locator,
  forma: 'Dato' | 'Documento' | 'Espera',
): Promise<void> {
  await inspector.getByRole('button', { name: 'Agregar requisito' }).click()
  await inspector
    .getByRole('group', { name: 'Qué requisito agregar' })
    .getByRole('button', { name: forma, exact: true })
    .click()
}
