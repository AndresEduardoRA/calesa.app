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

// Los pedidos RSC del router de Next en vuelo (`?_rsc=`: la respuesta a un «atrás» tras recargar y los prefetch que dispara). Un segundo «atrás»
// con alguno en vuelo deja la URL en la entrada nueva y el router en la vieja, para siempre (4-63: 5 de 40 con 5–6 en vuelo, 0 de 60 esperándolos;
// `.piloto/salidas/ci-fix/sonda2-*.txt`). Quien prueba el foco tras dos «atrás» espera, antes del segundo, a que no quede ninguno.
export function vigilarPedidosDelRouter(page: Page): { sinPedidos: () => Promise<void> } {
  let enVuelo = 0
  const esDelRouter = (url: string) => new URL(url).searchParams.has('_rsc')
  page.on('request', (pedido) => {
    if (esDelRouter(pedido.url())) enVuelo += 1
  })
  const termino = (pedido: { url(): string }) => {
    if (esDelRouter(pedido.url())) enVuelo -= 1
  }
  page.on('requestfinished', termino)
  page.on('requestfailed', termino)
  return { sinPedidos: () => expect.poll(() => enVuelo).toBe(0) }
}
