import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { esMovil } from './soporte/inventario'
import { irAFicha, tituloDeLaFicha } from './soporte/leads-ficha'
import {
  dentroDeLaPantalla,
  limpiarRecorrido,
  prepararRecorrido,
  sinScrollHorizontal,
  type TerrenoDelRecorrido,
} from './soporte/recorrido'

// La barra de secciones de la ficha en el celular (cierre 2): con las cinco secciones de la asesora de la semilla no entran en
// 412 px y «Portal» quedaba afuera sin pista de que había más. Ahora la barra dice por qué lado sigue, la sección activa se ve
// al llegar y la página no se mueve de costado.
test.describe.configure({ mode: 'serial' })

let r: TerrenoDelRecorrido

test.beforeAll(async ({}, info) => {
  r = await prepararRecorrido(info.project.name, 'BarraSecciones')
})

test.afterAll(async () => {
  await limpiarRecorrido(r)
})

const pista = (page: Page, lado: 'izquierda' | 'derecha') =>
  page.locator(`nav[aria-label="Secciones del lead"] [data-desborde="${lado}"]`)

test('en el celular la barra dice que sigue hacia la derecha, y al llegar al final, hacia la izquierda', async ({
  page,
}) => {
  test.skip(!esMovil(page), 'La barra se desborda sólo en el celular.')
  await entrar(page, r.ana.email)
  await irAFicha(page, r.uno.id)
  await expect(tituloDeLaFicha(page, r.uno.nombre)).toBeVisible()
  const barra = page.getByRole('navigation', { name: 'Secciones del lead' })
  await expect(barra.getByRole('link')).toHaveCount(5)
  // «Portal» queda afuera: la pista de la derecha está y la de la izquierda no.
  await expect(pista(page, 'derecha')).toHaveAttribute('data-visible', 'true')
  await expect(pista(page, 'izquierda')).toHaveAttribute('data-visible', 'false')
  // Al desplazar hasta el final se invierten, y «Portal» entra entero en la pantalla.
  await barra.locator('ul').evaluate((el) => {
    el.scrollLeft = el.scrollWidth
  })
  await expect(pista(page, 'derecha')).toHaveAttribute('data-visible', 'false')
  await expect(pista(page, 'izquierda')).toHaveAttribute('data-visible', 'true')
  await dentroDeLaPantalla(page, barra.getByRole('link', { name: 'Portal' }))
  await sinScrollHorizontal(page)
})

test('abrir la ficha en «Portal» deja esa sección a la vista', async ({ page }) => {
  test.skip(!esMovil(page), 'La barra se desborda sólo en el celular.')
  await entrar(page, r.ana.email)
  await irAFicha(page, r.uno.id, '?seccion=portal')
  const portal = page
    .getByRole('navigation', { name: 'Secciones del lead' })
    .getByRole('link', { name: 'Portal' })
  await expect(portal).toHaveAttribute('aria-current', 'page')
  await dentroDeLaPantalla(page, portal)
  await expect(pista(page, 'izquierda')).toHaveAttribute('data-visible', 'true')
})

test('con el texto al 200 % la barra sigue diciendo que hay más', async ({ page }) => {
  test.skip(!esMovil(page), 'La barra se desborda sólo en el celular.')
  await entrar(page, r.ana.email)
  await irAFicha(page, r.uno.id)
  await expect(tituloDeLaFicha(page, r.uno.nombre)).toBeVisible()
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await expect(pista(page, 'derecha')).toHaveAttribute('data-visible', 'true')
})
