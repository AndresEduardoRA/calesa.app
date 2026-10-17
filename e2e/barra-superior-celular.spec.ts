import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { esMovil } from './soporte/inventario'
import { irALeads } from './soporte/leads-listado'
import {
  capturar,
  dentroDeLaPantalla,
  limpiarRecorrido,
  prepararRecorrido,
  sinScrollHorizontal,
  type TerrenoDelRecorrido,
} from './soporte/recorrido'

// La barra superior del celular (cierre 2): con el texto al 200 % todo lo que está en rem se duplica y el último ícono (el de la
// persona) quedaba cortado, con la página corrida de costado. Cada control de la barra tiene que verse entero y quien mira tiene que
// poder pulsarlo, con el texto normal y al 200 %, en claro y en oscuro.
test.describe.configure({ mode: 'serial' })

let r: TerrenoDelRecorrido

test.beforeAll(async ({}, info) => {
  r = await prepararRecorrido(info.project.name, 'BarraSuperior')
})

test.afterAll(async () => {
  await limpiarRecorrido(r)
})

async function controlesDeLaBarra(page: Page) {
  return page.locator('header').first().locator('button, a').all()
}

for (const [escala, texto] of [
  ['100 %', '100%'],
  ['200 %', '200%'],
] as const) {
  for (const esquema of ['light', 'dark'] as const) {
    test(`cada control de la barra se ve entero con el texto al ${escala} (${esquema})`, async ({
      page,
    }, info) => {
      test.skip(!esMovil(page), 'La barra se aprieta sólo en el celular.')
      await page.emulateMedia({ colorScheme: esquema })
      await entrar(page, r.ana.email)
      await irALeads(page)
      await page.evaluate((t) => {
        document.documentElement.style.fontSize = t
      }, texto)
      const controles = await controlesDeLaBarra(page)
      expect(controles.length).toBeGreaterThan(2)
      for (const control of controles) {
        if (await control.isVisible()) {
          await dentroDeLaPantalla(page, control)
        }
      }
      // La barra no se desborda sobre sí misma ni ensancha la página (lo que sobresale del contenido es de otra pantalla).
      const barra = await page
        .locator('header')
        .first()
        .evaluate((el) => ({
          contenido: el.scrollWidth,
          visible: el.clientWidth,
          pagina: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        }))
      expect(barra.contenido, 'la barra se desborda').toBeLessThanOrEqual(barra.visible)
      if (texto === '100%') {
        await sinScrollHorizontal(page)
      }
      await capturar(page, info, `barra-${texto.replace('%', '')}-${esquema}`)
    })
  }
}

test('con el texto al 200 % el tipo de cambio sigue a mano en el menú', async ({ page }) => {
  test.skip(!esMovil(page), 'La barra se aprieta sólo en el celular.')
  await entrar(page, r.ana.email)
  await irALeads(page)
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  // En la barra ya no entra; el menú lo trae con su título.
  await expect(page.locator('header [data-hueco="tipo-cambio"]')).toBeHidden()
  await page.getByRole('button', { name: 'Abrir el menú' }).click()
  const menu = page.getByRole('dialog')
  await expect(menu.getByText('Tipo de cambio del día')).toBeVisible()
  await expect(menu.getByRole('button', { name: 'Tipos de cambio' })).toContainText('6,96')
})
