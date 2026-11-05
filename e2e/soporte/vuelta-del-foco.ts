import { expect, type Locator, type Page } from './prueba'

// La vuelta del foco (4-49, `src/shared/ui/vuelta-del-foco.ts`): abrir un panel por URL, recargar con él abierto y «atrás» lo cierra y devuelve el foco
// a quien lo abrió. `clave` es la de la URL que lo abre (`panel`, `editar`, `vehiculo`); `abrir`, si no es un clic en `boton` (un ítem de menú, Enter).
export type PanelConVuelta = {
  boton: Locator
  dialogo: Locator
  clave?: string
  abrir?: () => Promise<void>
}

export async function abrirConElBoton({ boton, dialogo, abrir }: PanelConVuelta): Promise<void> {
  await (abrir ? abrir() : boton.click())
  await expect(dialogo).toBeVisible()
}

export async function recargar(page: Page, { dialogo }: PanelConVuelta): Promise<void> {
  await page.reload()
  await expect(dialogo).toBeVisible()
}

export async function volver(
  page: Page,
  { dialogo, clave = 'panel' }: PanelConVuelta,
): Promise<void> {
  await page.goBack()
  await expect(dialogo).toBeHidden()
  expect(new URL(page.url()).searchParams.get(clave)).toBeNull()
}

// Abrir, recargar y «atrás»: el panel cerrado y el foco en quien lo abrió.
export async function abrirRecargarYVolver(page: Page, panel: PanelConVuelta): Promise<void> {
  await abrirConElBoton(panel)
  await recargar(page, panel)
  await volver(page, panel)
  await expect(panel.boton).toBeFocused()
}
