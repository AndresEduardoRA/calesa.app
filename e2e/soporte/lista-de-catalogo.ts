// Lo que los e2e de las tres pestañas de Configuración › Leads que dibujan una `<ListaDeCatalogo>` (orígenes del lead, tipos de lead y tipos de
// seguimiento) miran de la lista: una fila (la `<tr>` de la tabla o el `<li>` de la tarjeta del celular, según el ancho) es la que tiene el botón
// con su nombre, y lo demás —activar, el «por defecto», editar, eliminar— se elige del «⋯» de esa fila.
import type { Locator, Page } from '@playwright/test'
import { expect } from '@playwright/test'

// Cada pestaña nombra su sección (`aria-labelledby`): sin eso, «Abrir el menú» de la barra del celular entra en la cuenta de los nombres.
export type Pestana = 'origenes' | 'tipos' | 'seguimientos'
const TITULO_DE: Record<Pestana, string> = {
  origenes: 'titulo-de-origenes',
  tipos: 'titulo-de-tipos',
  seguimientos: 'titulo-de-tipos-de-seguimiento',
}

const seccion = (page: Page, pestana: Pestana): Locator =>
  page.locator(`section[aria-labelledby="${TITULO_DE[pestana]}"]`)

// El botón con el nombre de la fila: abre su edición con un clic (o Enter).
export const nombreDeLaFila = (page: Page, nombre: string): Locator =>
  page.getByRole('button', { name: `Abrir ${nombre}`, exact: true })

export const filaDeCatalogo = (page: Page, nombre: string): Locator =>
  page.locator('tr, li').filter({ has: nombreDeLaFila(page, nombre) })

export const masAccionesDe = (page: Page, nombre: string): Locator =>
  page.getByRole('button', { name: `Más acciones de ${nombre}`, exact: true })

// El menú abierto del «⋯» de esa fila (mientras uno se cierra, el de otra fila puede estar abriéndose: se pide el suyo por su nombre).
export const menuDe = (page: Page, nombre: string): Locator =>
  page.getByRole('menu', { name: `Más acciones de ${nombre}`, exact: true })

// Abre el «⋯» de la fila y devuelve la línea pedida (el menú queda abierto: quien la mira lo cierra con `cerrarMenu`).
export async function lineaDelMenu(page: Page, nombre: string, linea: string): Promise<Locator> {
  await masAccionesDe(page, nombre).click()
  const item = menuDe(page, nombre).getByRole('menuitem', { name: linea, exact: true })
  await expect(item).toBeVisible()
  return item
}

// Cierra el menú con Esc y espera a que se haya ido (si no, el siguiente se encuentra con dos).
export async function cerrarMenu(page: Page, nombre: string): Promise<void> {
  await page.keyboard.press('Escape')
  await expect(menuDe(page, nombre)).toBeHidden()
}

// Elige una línea del «⋯» de la fila.
export async function elegirDelMenu(page: Page, nombre: string, linea: string): Promise<void> {
  await (await lineaDelMenu(page, nombre, linea)).click()
}

// Activa o desactiva con el «⋯»: la línea dice lo contrario del estado de hoy.
export async function alternarActivo(page: Page, nombre: string): Promise<void> {
  await masAccionesDe(page, nombre).click()
  await menuDe(page, nombre)
    .getByRole('menuitem', { name: /^(Activar|Desactivar)$/ })
    .click()
}

// ¿Esa línea del «⋯» está apagada? Abre el menú, mira y lo cierra.
export async function lineaApagada(page: Page, nombre: string, linea: string): Promise<boolean> {
  const item = await lineaDelMenu(page, nombre, linea)
  const apagada = (await item.getAttribute('aria-disabled')) === 'true' || (await item.isDisabled())
  await cerrarMenu(page, nombre)
  return apagada
}

export const nombresDeLaLista = (page: Page, pestana: Pestana): Locator =>
  seccion(page, pestana).getByRole('button', { name: /^Abrir / })

// Los nombres de las filas, en el orden en que se ven.
export async function nombresEnLaLista(page: Page, pestana: Pestana): Promise<string[]> {
  const botones = await nombresDeLaLista(page, pestana).all()
  const nombres: string[] = []
  for (const boton of botones) {
    nombres.push(((await boton.getAttribute('aria-label')) ?? '').replace(/^Abrir /, ''))
  }
  return nombres
}

// El icono que dibuja una fila (`data-icono` de su `<svg>`), o nada si no lleva.
export async function iconoDeLaFila(fila: Locator): Promise<string | null> {
  const icono = fila.locator('svg[data-icono]').first()
  return (await icono.count()) === 0 ? null : await icono.getAttribute('data-icono')
}

// Elige un icono del selector por su nombre («Estrella», «Sin icono»): se hace clic en su baldosa, que es lo que toca una persona (el radio de
// adentro es de lectura de pantalla y está fuera de la vista).
export async function elegirIcono(modal: Locator, nombre: string): Promise<void> {
  const baldosa =
    nombre === 'Sin icono'
      ? modal.locator('label', { hasText: /^Sin icono$/ })
      : modal.locator(`label[title="${nombre}"]`)
  await baldosa.scrollIntoViewIfNeeded()
  await baldosa.click()
}
