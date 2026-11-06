// Lo que comparten los e2e de «Vista previa» de la tarjeta (paso 4.18-2): los lugares del modal y sus gestos. Sólo para las pruebas.
import { expect, type Locator, type Page, type TestInfo } from '@playwright/test'
import { entrar } from './alta'
import { tipearEnLaHoja } from './cotizar-guardar'
import { sql } from './sql'

export const zona = () => sql('select zona_horaria from public.ajustes_empresa')
export const hoja = (page: Page) => page.locator('[data-hoja]')
export const resumen = (page: Page) => page.locator('[data-resumen]')
export const dialogo = (page: Page) => page.getByRole('dialog', { name: 'Vista previa' })
export const tarjeta = (page: Page) => dialogo(page).locator('[data-tarjeta-de-cotizacion]')
export const total = (t: Locator) => t.locator('[data-total-usd]')
export const grupos = (t: Locator) =>
  t
    .locator('[data-grupo-de-la-tarjeta]')
    .evaluateAll((es) =>
      es.map((e) => [e.getAttribute('data-grupo-de-la-tarjeta'), e.getAttribute('data-tono')]),
    )
// La etiqueta de cada fila y de cada «aparte» (sin su leyenda), en el orden dibujado.
export const etiquetasDeLasFilas = (t: Locator) =>
  t
    .locator('[data-fila-de-la-tarjeta], [data-aparte-de-la-tarjeta]')
    .evaluateAll((es) =>
      es.map((e) => e.querySelector(':scope > span')?.childNodes[0]?.textContent ?? ''),
    )

export const textoDe = async (l: Locator) => ((await l.textContent()) ?? '').replace(/\s/g, '')

// Otra persona entra en la misma página: la sesión de la anterior se va (con ella puesta, `/ingreso` no muestra el formulario).
export async function abrirLaHoja(page: Page, quien: string, url: string) {
  await page.context().clearCookies()
  await entrar(page, quien, { fresco: true })
  await page.goto(url)
  await expect(hoja(page)).toBeVisible()
}

// Espera a que el resumen tenga el total al día (la hoja recalcula 150 ms después de la última confirmación).
export const alDia = (page: Page) =>
  expect(resumen(page)).toHaveAttribute('aria-busy', 'false', { timeout: 15_000 })

export async function abrirLaVistaPrevia(page: Page): Promise<Locator> {
  await resumen(page).getByRole('button', { name: 'Vista previa' }).click()
  await expect(dialogo(page)).toBeVisible()
  await expect(tarjeta(page)).toBeVisible()
  return tarjeta(page)
}

export async function cerrarLaVistaPrevia(page: Page) {
  await page.keyboard.press('Escape')
  await expect(dialogo(page)).toBeHidden()
}

// La hoja de la subasta de la semilla con un lead y un vehículo de prueba.
export const urlDeLaSubasta = (subasta: string, lead: string, vehiculo: string) =>
  `/cotizaciones/nuevo?origen=${subasta}&lead=${lead}&vehiculo=${vehiculo}`

// Entra, abre la hoja y le pone el remate de 9.500: lo que pide una tarjeta con números.
export async function cotizarEnLaSubasta(page: Page, quien: string, url: string) {
  await abrirLaHoja(page, quien, url)
  await tipearEnLaHoja(page, 'remate', '9500')
  await alDia(page)
}

// Lo medido va al reporte de la corrida (`test.info().annotations`).
export function anotar(info: TestInfo, tipo: string, valor: number): void {
  info.annotations.push({ type: tipo, description: String(valor) })
  console.warn(`[medido] ${tipo}: ${String(valor)}`)
}
