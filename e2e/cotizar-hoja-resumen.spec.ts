import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { vigilarRecalculos } from './soporte/cotizar'
import {
  cotizacionGuardada,
  guardarConElAtajo,
  limpiarGuardado,
  prepararGuardado,
  tarjetaGuardada,
  tipearEnLaHoja,
  totalDeLaHoja,
  vigilarGuardados,
} from './soporte/cotizar-guardar'
import { sql } from './soporte/sql'

// Lo que la cabecera y el resumen de la hoja le suman a la hoja de cotizar (paso 4.13-4b3): los modos de tipo de cambio con el primero marcado, «Ver total Bs» y el resumen fijo. La fórmula de prueba tiene dos modos (`m1`, `m2`); la planilla, ninguno.

test.describe.configure({ mode: 'serial' })

let duena = ''
let lead = ''
let origen = { id: '', nombre: '' }
let planilla = ''

test.beforeAll(async ({}, info) => {
  ;({ origen, duena, lead } = await prepararGuardado(info.project.name, 'resumen', true))
  planilla = sql("select id from public.origenes where clave = 'planilla_usa'")
})

test.afterAll(async () => {
  await limpiarGuardado()
})

const ir = async (page: Page, origen: string) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${origen}&lead=${lead}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
}
const cabecera = (page: Page) => page.locator('[data-cabecera]')
const modo = (page: Page, nombre: string) => cabecera(page).getByRole('radio', { name: nombre })
const verTotalBs = (page: Page) => page.getByRole('switch', { name: 'Ver total en moneda local' })
const lineaEnBs = (page: Page) => page.locator('[data-total-bs]')
const elegirModo = (page: Page, nombre: string) =>
  cabecera(page).getByText(nombre, { exact: true }).click()

test('la hoja abre con «Modo uno» marcado, elegir «Modo dos» sale en el recálculo y vuelve tras recargar', async ({
  page,
}) => {
  const recalculos = await vigilarRecalculos(page)
  await ir(page, origen.id)
  await expect(modo(page, 'Modo uno')).toBeChecked()
  await expect(modo(page, 'Modo dos')).not.toBeChecked()
  await page.waitForLoadState('networkidle')
  expect(recalculos.pedidos).toHaveLength(0)
  await elegirModo(page, 'Modo dos')
  await expect(modo(page, 'Modo dos')).toBeChecked()
  await expect.poll(() => recalculos.pedidos.at(-1)?.p_modo_tc).toBe('m2')
  await page.reload()
  await expect(page.getByText('Recuperamos lo que habías escrito y no guardaste.')).toBeVisible()
  await expect(modo(page, 'Modo dos')).toBeChecked()
})

test('guardar manda el primer modo sin tocar nada y el elegido tras elegir, y la base lo guarda', async ({
  page,
}) => {
  const guardados = await vigilarGuardados(page)
  await ir(page, origen.id)
  await tipearEnLaHoja(page, 'pub', '1200')
  await expect(totalDeLaHoja(page)).toContainText('1.205,00')
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  expect(guardados.pedidos[0]?.modoTc).toBe('m1')
  expect(cotizacionGuardada(guardados.pedidos[0]?.intento ?? '').modoTc).toBe('m1')
  await page.getByRole('button', { name: 'Cotizar otra' }).click()
  await tipearEnLaHoja(page, 'pub', '1200')
  await elegirModo(page, 'Modo dos')
  await expect(totalDeLaHoja(page)).toContainText('1.205,00')
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  expect(guardados.pedidos[1]?.modoTc).toBe('m2')
  expect(cotizacionGuardada(guardados.pedidos[1]?.intento ?? '').modoTc).toBe('m2')
})

test('«Ver total en moneda local» nace apagado, encendido suma la línea en el resumen y vuelve con el borrador', async ({
  page,
}) => {
  await ir(page, origen.id)
  await expect(verTotalBs(page)).not.toBeChecked()
  await expect(lineaEnBs(page)).toHaveCount(0)
  await tipearEnLaHoja(page, 'pub', '1200')
  await expect(totalDeLaHoja(page)).toContainText('1.205,00')
  await verTotalBs(page).click()
  await expect(lineaEnBs(page)).toContainText('Total en moneda local')
  await expect(lineaEnBs(page)).toContainText(/\d/)
  await page.reload()
  await expect(page.getByText('Recuperamos lo que habías escrito y no guardaste.')).toBeVisible()
  await expect(verTotalBs(page)).toBeChecked()
  await expect(lineaEnBs(page)).toContainText(/\d/)
})

test('guardar con «Ver total Bs» encendido lo deja en la cotización, y apagado también', async ({
  page,
}) => {
  const guardados = await vigilarGuardados(page)
  await ir(page, origen.id)
  await tipearEnLaHoja(page, 'pub', '1200')
  await expect(totalDeLaHoja(page)).toContainText('1.205,00')
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  expect(guardados.pedidos[0]?.verTotalBs).toBe(false)
  expect(cotizacionGuardada(guardados.pedidos[0]?.intento ?? '').verTotalBs).toBe(false)
  await page.getByRole('button', { name: 'Cotizar otra' }).click()
  await tipearEnLaHoja(page, 'pub', '1200')
  await verTotalBs(page).click()
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  expect(guardados.pedidos[1]?.verTotalBs).toBe(true)
  expect(cotizacionGuardada(guardados.pedidos[1]?.intento ?? '').verTotalBs).toBe(true)
})

test('una fórmula sin modos (la planilla) no dibuja la cabecera', async ({ page }) => {
  await ir(page, planilla)
  await expect(page.locator('[data-nodo]').first()).toBeVisible()
  await expect(cabecera(page)).toHaveCount(0)
})
