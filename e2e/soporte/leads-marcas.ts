// Lo que los e2e de las marcas (favorito, tachado y etiquetas, parte 5b) preparan y miran en la base
// del Supabase LOCAL: las marcas de una persona, sus etiquetas, y las mismas RPC que usa la pantalla
// llamadas con la sesión de esa persona (para preparar el terreno o probar lo que la base rechaza).
import { expect, type Locator, type Page } from '@playwright/test'
import { CONTRASENA } from './alta'
import { admin } from './base'
import { aLaVista } from './inventario'
import { exigir, idDe } from './leads'
import { sesionDe } from './leads-alta'
import { nombre } from './leads-listado'

export type MarcasEnLaBase = { favorito: boolean; tachado: boolean; etiquetas: string[] }

// Las marcas de esa persona sobre el lead, leídas como dueño de la base.
export async function marcasEnLaBase(leadId: string, email: string): Promise<MarcasEnLaBase> {
  const usuario = await idDe(email)
  const [favoritos, tachados, propias] = await Promise.all([
    admin()
      .from('leads_favoritos')
      .select('lead_id')
      .eq('lead_id', leadId)
      .eq('usuario_id', usuario),
    admin()
      .from('leads_tachados')
      .select('lead_id')
      .eq('lead_id', leadId)
      .eq('usuario_id', usuario),
    admin().from('etiquetas').select('id, nombre').eq('usuario_id', usuario),
  ])
  exigir(favoritos.error ?? tachados.error ?? propias.error, 'leer las marcas')
  const ids = (propias.data ?? []).map((una) => una.id as string)
  const { data, error } = await admin()
    .from('leads_etiquetas')
    .select('etiqueta_id')
    .eq('lead_id', leadId)
    .in('etiqueta_id', ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000'])
  exigir(error, 'leer las etiquetas del lead')
  const nombres = new Map(
    (propias.data ?? []).map((una) => [una.id as string, una.nombre as string]),
  )
  return {
    favorito: (favoritos.data ?? []).length > 0,
    tachado: (tachados.data ?? []).length > 0,
    etiquetas: (data ?? []).map((fila) => nombres.get(fila.etiqueta_id as string) ?? '').sort(),
  }
}

export type EtiquetaEnLaBase = { id: string; nombre: string; color: string; actualizado_en: string }

export async function etiquetasDe(email: string): Promise<EtiquetaEnLaBase[]> {
  const { data, error } = await admin()
    .from('etiquetas')
    .select('id, nombre, color, actualizado_en')
    .eq('usuario_id', await idDe(email))
    .order('nombre')
  exigir(error, 'leer las etiquetas')
  return (data ?? []) as EtiquetaEnLaBase[]
}

// Una etiqueta de esa persona, creada por la RPC con su sesión.
export async function crearEtiquetaDe(
  email: string,
  nombreDeLaEtiqueta: string,
  color: string | null = null,
): Promise<string> {
  const sesion = await sesionDe(email, CONTRASENA)
  const id = crypto.randomUUID()
  const { error } = await sesion.rpc('etiqueta_crear', {
    p_id: id,
    p_nombre: nombreDeLaEtiqueta,
    ...(color ? { p_color: color } : {}),
  })
  exigir(error, `crear la etiqueta ${nombreDeLaEtiqueta}`)
  return id
}

export async function ponerEtiquetaDe(email: string, leadId: string, etiquetaId: string) {
  const sesion = await sesionDe(email, CONTRASENA)
  const { error } = await sesion.rpc('lead_etiquetas_poner', {
    p_lead: leadId,
    p_etiquetas: [etiquetaId],
    p_valor: true,
  })
  exigir(error, 'poner la etiqueta')
}

export async function ponerMarcaDe(
  email: string,
  leadId: string,
  marca: 'favorito' | 'tachado',
  valor = true,
) {
  const sesion = await sesionDe(email, CONTRASENA)
  const { error } = await sesion.rpc(
    marca === 'favorito' ? 'lead_favorito_poner' : 'lead_tachado_poner',
    { p_lead: leadId, p_valor: valor },
  )
  exigir(error, `poner ${marca}`)
}

// El «⋯» de la cabecera de la ficha (9i): Favorito, Tachado, Etiquetas… y lo demás, en la lista de siempre. Es el único de la página.
export const menuDeLaFicha = (page: Page): Locator =>
  aLaVista(page.getByRole('button', { name: /^Más acciones de / }))

// Abre el menú de la ficha y lo espera (la página hidrata antes de que el clic valga); si ya está abierto, lo deja.
export async function abrirMenuDeLaFicha(page: Page): Promise<Locator> {
  const menu = page.getByRole('menu')
  await expect(async () => {
    if (!(await menu.isVisible())) {
      await menuDeLaFicha(page).click()
    }
    await expect(menu).toBeVisible({ timeout: 1000 })
  }).toPass()
  return menu
}

type Marca = 'Favorito' | 'Tachado'

// Pone o quita una marca desde el menú de la ficha, y lo deja cerrado. `doble`: dos clics seguidos (el segundo llega mientras viaja el primero).
export async function marcarEnLaFicha(
  page: Page,
  cual: Marca,
  { doble = false }: { doble?: boolean } = {},
): Promise<void> {
  const menu = await abrirMenuDeLaFicha(page)
  const item = menu.getByRole('menuitemcheckbox', { name: cual, exact: true })
  await (doble ? item.dblclick() : item.click())
  if (await menu.isVisible()) {
    await page.keyboard.press('Escape')
  }
  await expect(menu).toBeHidden()
}

// Espera que la marca esté (o no) en el menú de la ficha, y lo deja cerrado.
export async function esperarMarcaEnLaFicha(
  page: Page,
  cual: Marca,
  puesta: boolean,
): Promise<void> {
  await expect(async () => {
    const menu = await abrirMenuDeLaFicha(page)
    await expect(menu.getByRole('menuitemcheckbox', { name: cual, exact: true })).toHaveAttribute(
      'aria-checked',
      String(puesta),
      { timeout: 1000 },
    )
    await page.keyboard.press('Escape')
    await expect(menu).toBeHidden()
  }).toPass()
}

// El «⋯» de una fila del listado (tabla o tarjeta), por el nombre completo del lead.
export const menuDelLead = (page: Page, nombreDelLead: string): Locator =>
  aLaVista(page.getByRole('button', { name: `Más acciones de ${nombreDelLead}`, exact: true }))
export const menuDeFila = (page: Page, corto: string): Locator => menuDelLead(page, nombre(corto))

// Abre el «⋯» y espera el menú (la página hidrata antes de que el clic valga).
export async function abrirMenuDelLead(page: Page, nombreDelLead: string): Promise<Locator> {
  const menu = page.getByRole('menu')
  await expect(async () => {
    await menuDelLead(page, nombreDelLead).click()
    await expect(menu).toBeVisible({ timeout: 1000 })
  }).toPass()
  return menu
}
export const abrirMenuDeFila = (page: Page, corto: string): Promise<Locator> =>
  abrirMenuDelLead(page, nombre(corto))

// El selector de etiquetas abierto (un popover con el campo «Buscar o crear»).
export const selectorDeEtiquetas = (page: Page): Locator =>
  page.getByRole('dialog').filter({ has: page.getByLabel('Buscar o crear una etiqueta') })

export async function abrirSelectorEnLaFicha(page: Page): Promise<Locator> {
  const selector = selectorDeEtiquetas(page)
  await expect(async () => {
    const menu = await abrirMenuDeLaFicha(page)
    await menu.getByRole('menuitem', { name: 'Etiquetas…' }).click()
    await expect(selector).toBeVisible({ timeout: 1000 })
  }).toPass()
  return selector
}

// Una insignia de etiqueta o de marca dentro de un lugar.
export const insignia = (lugar: Locator, texto: string): Locator =>
  lugar.getByText(texto, { exact: true })

export const dialogoDeEtiquetas = (page: Page): Locator =>
  page.getByRole('dialog', { name: 'Tus etiquetas' })

// Deja a esa persona sin etiquetas (un test que llega al tope no deja el terreno lleno para el siguiente).
export async function borrarEtiquetasDe(email: string): Promise<void> {
  const { error } = await admin()
    .from('etiquetas')
    .delete()
    .eq('usuario_id', await idDe(email))
  exigir(error, 'borrar las etiquetas')
}

// Le pasa el lead a otra persona como lo haría `lead_transferir` (el saliente queda compartido):
// las personas de prueba no tienen `leads.transferir`.
export async function transferirA(leadId: string, deId: string, aId: string): Promise<void> {
  const saliente = await admin()
    .from('leads_asesores')
    .update({ tipo_acceso: 'compartido' })
    .eq('lead_id', leadId)
    .eq('usuario_id', deId)
  exigir(saliente.error, 'dejar al saliente como compartido')
  const entrante = await admin()
    .from('leads_asesores')
    .upsert({ lead_id: leadId, usuario_id: aId, tipo_acceso: 'dueno', revocado_en: null })
  exigir(entrante.error, 'dejar al entrante como dueño')
}
