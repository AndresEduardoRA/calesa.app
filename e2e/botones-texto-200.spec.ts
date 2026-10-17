import type { Locator, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { aLaVista } from './soporte/inventario'
import {
  irALeads,
  limpiarListado,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { irAlEmbudo } from './soporte/leads-oportunidades'

// Las etiquetas de los botones chicos («Nuevo lead», «Filtros», «Vistas», «Importar», «Papelera», «Etapas») crecen con el texto
// (cierre 3, hallazgo 4). El botón base animaba todo con `transition-all`, también `font-size` y el alto: al cambiar la raíz el
// texto crecía a medio camino y una captura o una medición tomada enseguida lo veía casi igual (13 px y no 26), mientras los
// campos y los títulos, sin transición, ya estaban al doble. Se lee en el mismo instante del cambio, sin esperar.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

// El tamaño del texto de cada botón con la raíz al 100 % y, sin esperar un cuadro, al 200 %.
async function tamanos(page: Page, botones: Locator[]) {
  const identificados = await Promise.all(
    botones.map(async (boton, i) => {
      await boton.evaluate((el, n) => el.setAttribute('data-medir', String(n)), i)
      return i
    }),
  )
  return page.evaluate((indices) => {
    const leer = () =>
      indices.map((i) => {
        const el = document.querySelector(`[data-medir="${String(i)}"]`)
        return el ? Number.parseFloat(getComputedStyle(el).fontSize) : 0
      })
    const antes = leer()
    document.documentElement.style.fontSize = '200%'
    const despues = leer()
    document.documentElement.style.fontSize = ''
    return { antes, despues }
  }, identificados)
}

function exigirElDoble(medidas: { antes: number[]; despues: number[] }, nombres: string[]) {
  nombres.forEach((nombre, i) => {
    const antes = medidas.antes[i] ?? 0
    const despues = medidas.despues[i] ?? 0
    expect(antes, `«${nombre}» existe`).toBeGreaterThan(0)
    expect(despues / antes, `«${nombre}»: ${String(antes)} px → ${String(despues)} px`).toBeCloseTo(
      2,
      1,
    )
  })
}

test('Filtros, Vistas, Importar y Papelera doblan su texto con la raíz al 200 %', async ({
  page,
}) => {
  await entrar(page, t.personas.berta)
  await irALeads(page)
  const nombres = ['Filtros', 'Vistas', 'Importar', 'Papelera']
  const botones = nombres.map((nombre) =>
    aLaVista(
      page
        .getByRole('button', { name: nombre, exact: true })
        .or(page.getByRole('link', { name: nombre, exact: true })),
    ).first(),
  )
  for (const boton of botones) await expect(boton).toBeVisible()
  exigirElDoble(await tamanos(page, botones), nombres)
})

test('«Etapas» dobla su texto con la raíz al 200 %', async ({ page }) => {
  await entrar(page, t.personas.berta)
  await irAlEmbudo(page)
  const etapas = aLaVista(page.getByRole('button', { name: 'Etapas', exact: true })).first()
  await expect(etapas).toBeVisible()
  exigirElDoble(await tamanos(page, [etapas]), ['Etapas'])
})

test('«Nuevo lead» de la barra superior dobla su texto donde se dibuja con texto', async ({
  page,
}) => {
  await entrar(page, t.personas.berta)
  await irALeads(page)
  const nuevo = aLaVista(page.getByRole('button', { name: /^Nuevo lead/ })).first()
  await expect(nuevo).toBeVisible()
  // En el celular sólo se dibuja el icono (el texto sale con `sm:`, un media query que no sigue a la raíz): su etiqueta es la del lector.
  const conTexto = await nuevo.evaluate(
    (el) =>
      el.textContent.trim().length > 0 &&
      getComputedStyle(el.querySelector('span') ?? el).display !== 'none',
  )
  test.skip(
    !conTexto,
    'En el celular «Nuevo lead» es sólo el icono: el texto está para el lector de pantalla.',
  )
  exigirElDoble(await tamanos(page, [nuevo]), ['Nuevo lead'])
})
