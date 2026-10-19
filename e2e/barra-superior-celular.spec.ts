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
  sinTextoCortado,
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

// El buscador de la barra (5b-1). Hasta la Fase 7 es `<BuscadorPendiente>`, un botón que guarda su lugar: con la barra de ~300 px del
// 200 % en el celular su «Buscar» llevaba `truncate` y sólo se veía «B…», y su alto estaba en rem (72 px al 200 %). Por debajo de 24 rem
// de barra queda el icono, en un blanco de 44 px con su nombre; desde 24 rem, el icono y «Buscar» entero. Corre en los dos proyectos con
// el mismo viewport de celular, así que lo que cuenta es el ancho de la barra, no el aparato.
const CELULAR = { width: 412, height: 915 }

function buscadorDeLaBarra(page: Page) {
  return page.locator('header').first().getByRole('button', { name: 'Buscar', exact: true })
}

async function conTextoAl(page: Page, texto: '100%' | '200%') {
  await page.evaluate((t) => {
    document.documentElement.style.fontSize = t
  }, texto)
}

test('al 200 % el buscador queda en un icono de 44 px que se llama «Buscar» y ningún texto de la barra se corta', async ({
  page,
}, info) => {
  await page.setViewportSize(CELULAR)
  await entrar(page, r.ana.email)
  await irALeads(page)
  await conTextoAl(page, '200%')
  await capturar(page, info, 'buscador-200')
  const buscador = buscadorDeLaBarra(page)
  await expect(buscador).toBeVisible()
  const caja = await buscador.boundingBox()
  expect(Math.round(caja?.height ?? 0), 'alto del buscador').toBe(44)
  expect(Math.round(caja?.width ?? 0), 'ancho del buscador').toBe(44)
  await sinTextoCortado(page.locator('header').first())
  await sinScrollHorizontal(page)
})

test('con la barra justo en 24 rem el buscador dice «Buscar» entero; un píxel menos, queda el icono', async ({
  page,
}, info) => {
  await entrar(page, r.ana.email)
  await irALeads(page)
  await conTextoAl(page, '100%')
  await page.setViewportSize(CELULAR)
  // El `@container` mide el interior de la barra (sin su relleno): 24 rem a 16 px son 384 px de interior.
  const relleno = await page
    .locator('header')
    .first()
    .evaluate((el) => {
      const estilo = getComputedStyle(el)
      return parseFloat(estilo.paddingLeft) + parseFloat(estilo.paddingRight)
    })
  await page.setViewportSize({ width: 384 + relleno, height: 915 })
  await capturar(page, info, 'buscador-24rem')
  const buscador = buscadorDeLaBarra(page)
  await expect(buscador.getByText('Buscar', { exact: true })).toBeVisible()
  await sinTextoCortado(page.locator('header').first())
  await page.setViewportSize({ width: 383 + relleno, height: 915 })
  await expect(buscador.getByText('Buscar', { exact: true })).toBeHidden()
  const caja = await buscador.boundingBox()
  expect(Math.round(caja?.height ?? 0), 'alto del buscador').toBe(44)
  await sinTextoCortado(page.locator('header').first())
})

test('con el texto normal el buscador se llama «Buscar», también en escritorio', async ({
  page,
}, info) => {
  await entrar(page, r.ana.email)
  await irALeads(page)
  await capturar(page, info, 'buscador-normal')
  await expect(buscadorDeLaBarra(page)).toBeVisible()
  await expect(buscadorDeLaBarra(page).getByText('Buscar', { exact: true })).toBeVisible()
})
