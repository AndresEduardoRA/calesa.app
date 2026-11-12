// Lo que el e2e de Configuración › Flujos › Documentos prepara y mira en la base del Supabase LOCAL. Todo tipo que crea un e2e lleva este prefijo en su
// nombre: es lo único que la limpieza borra (con los requisitos que lo usen, antes: la FK es `restrict`).
import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { literal, sql } from './sql'

export const PREFIJO_DE_TIPO_DE_DOCUMENTO_E2E = 'E2E 5.09'

export type TipoDeDocumentoEnLaBase = {
  id: string
  activo: boolean
  orden: number
  modo: string
  vigencia: string
  aviso: string
}

export function origenDeLaSubasta(): string {
  return sql("select id from public.origenes where clave = 'subasta_usa'")
}

export function flujoDeLaSubasta(): string {
  return sql(
    `select id from public.flujos where origen_id = '${origenDeLaSubasta()}' and ambito = 'vehiculos'`,
  )
}

export function tipoEnLaBase(nombre: string): TipoDeDocumentoEnLaBase | null {
  const fila = sql(
    `select id || '|' || activo || '|' || orden || '|' || modo_vencimiento || '|' || coalesce(vigencia_dias::text, '') || '|' || coalesce(aviso_dias::text, '')
       from public.tipos_documento where nombre = ${literal(nombre)}`,
  )
  if (fila === '') return null
  const [id = '', activo = '', orden = '', modo = '', vigencia = '', aviso = ''] = fila.split('|')
  return { id, activo: activo === 'true', orden: Number(orden), modo, vigencia, aviso }
}

// Un tipo del flujo de la subasta, al final de su grupo, por el camino de la base (sin la pantalla): para armar el terreno.
export function sembrarTipoDelFlujo(nombre: string): TipoDeDocumentoEnLaBase {
  sql(
    `insert into public.tipos_documento (flujo_id, nombre, orden)
       select '${flujoDeLaSubasta()}', ${literal(nombre)}, coalesce(max(orden), 0) + 10
         from public.tipos_documento where flujo_id = '${flujoDeLaSubasta()}'`,
  )
  const sembrado = tipoEnLaBase(nombre)
  if (!sembrado) throw new Error(`No quedó el tipo de documento ${nombre}`)
  return sembrado
}

// Un requisito de documento de una fase del flujo de la subasta que pide este tipo: lo vuelve «en uso».
export function usarEnUnRequisito(nombre: string): void {
  sql(
    `insert into public.fases_requisitos (fase_id, tipo, bloqueante, tipo_documento_id, min_archivos, orden)
       select f.id, 'documento', false, t.id, 1, 90
         from public.fases f, public.tipos_documento t
        where f.flujo_id = '${flujoDeLaSubasta()}' and t.nombre = ${literal(nombre)}
        order by f.orden limit 1`,
  )
}

export function borrarTiposDeDocumentoDePrueba(): void {
  const como = `like '${PREFIJO_DE_TIPO_DE_DOCUMENTO_E2E}%'`
  sql(
    `delete from public.fases_requisitos where tipo_documento_id in (select id from public.tipos_documento where nombre ${como});
     delete from public.tipos_documento where nombre ${como};`,
  )
}

// --- La pantalla --------------------------------------------------------------------------------------

export type Grupo = 'empresa' | 'flujo'

export const seccionDelGrupo = (page: Page, grupo: Grupo): Locator =>
  page.locator(`section[aria-labelledby="titulo-de-tipos-${grupo}"]`)

export async function abrirDocumentos(page: Page, origenId = origenDeLaSubasta()): Promise<void> {
  await page.goto(`/configuracion/flujos?seccion=documentos&origen=${origenId}`)
  await expect(page.getByRole('heading', { name: 'De toda la empresa', level: 2 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Sólo de este flujo', level: 2 })).toBeVisible()
}

// Los nombres de las filas de un grupo, en el orden en que se ven.
export async function nombresDelGrupo(page: Page, grupo: Grupo): Promise<string[]> {
  const botones = await seccionDelGrupo(page, grupo)
    .getByRole('button', { name: /^Abrir / })
    .all()
  const nombres: string[] = []
  for (const boton of botones) {
    nombres.push(((await boton.getAttribute('aria-label')) ?? '').replace(/^Abrir /, ''))
  }
  return nombres
}

export const modalDeTipo = (
  page: Page,
  titulo:
    | 'Nuevo tipo de documento de este flujo'
    | 'Nuevo tipo de documento de toda la empresa'
    | 'Editar tipo de documento',
): Locator => page.getByRole('dialog', { name: titulo })
