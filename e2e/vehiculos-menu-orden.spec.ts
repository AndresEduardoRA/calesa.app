import type { Locator, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar, menuDeVehiculo } from './soporte/inventario'
import { crearLead, vincular } from './soporte/leads'
import { capturar } from './soporte/recorrido'
import { vehiculoPorTitulo } from './soporte/vehiculos'
import {
  OTRO,
  TITULO,
  abrirConUnClic,
  alInventario,
  limpiarResumen,
  prepararResumen,
  resumenDe,
  type TerrenoDelResumen,
} from './soporte/vehiculos-resumen'

// El «⋯» de un vehículo, el mismo en la fila, la tarjeta, el resumen y la ficha (9i): «Editar» y «Publicar en la web…» arriba y, separada,
// «Enviar a la papelera». «Editar» es un botón en el resumen y en la ficha; lo que una persona no puede hacer no aparece (y la papelera,
// si ya se sabe que no va, se ve apagada con el motivo). Capturas: `E2E_CAPTURAS=e2e-capturas/9i`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelResumen

test.beforeAll(async ({}, info) => {
  t = await prepararResumen(`${info.project.name}_menu`, [
    'vehiculos.vitrina',
    'vehiculos.eliminar',
  ])
})

test.afterAll(async () => {
  await limpiarResumen(t.id)
})

async function opciones(menu: Locator): Promise<string[]> {
  const textos = await menu.locator('[role=menuitem], [role=menuitemcheckbox]').allInnerTexts()
  return textos.map((texto) => texto.trim())
}

// Abre el «⋯» que está a la vista (la fila, la tarjeta, el resumen o la ficha) y lo espera.
async function abrir(boton: Locator, page: Page): Promise<Locator> {
  const menu = page.getByRole('menu')
  await expect(async () => {
    if (!(await menu.isVisible())) {
      await boton.click()
    }
    await expect(menu).toBeVisible({ timeout: 1000 })
  }).toPass()
  return menu
}

async function cerrar(page: Page, menu: Locator) {
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
}

test('con todo, el orden es el mismo en la fila, el resumen y la ficha, y la papelera va separada al final', async ({
  page,
}, info) => {
  await entrar(page, t.terreno.duena)
  await alInventario(page, t.terreno.corea.id)
  const deLaFila = await abrir(menuDeVehiculo(page, TITULO), page)
  expect(await opciones(deLaFila)).toEqual([
    'Editar',
    'Publicar en la web…',
    'Enviar a la papelera',
  ])
  await expect(deLaFila.getByRole('separator')).toHaveCount(1)
  await capturar(page, info, 'menu-del-vehiculo-fila')
  await cerrar(page, deLaFila)

  // En el resumen «Editar» es el botón; el «⋯» lleva el resto, en el mismo orden.
  const resumen = await abrirConUnClic(page, TITULO)
  const delResumen = await abrir(
    resumen.getByRole('button', { name: `Más acciones de ${TITULO}` }),
    page,
  )
  expect(await opciones(delResumen)).toEqual(['Publicar en la web…', 'Enviar a la papelera'])
  await expect(delResumen.getByRole('separator')).toHaveCount(1)
  await capturar(page, info, 'menu-del-vehiculo-resumen')
  await cerrar(page, delResumen)

  await page.goto(`/vehiculos/${t.id}`)
  await expect(page.getByRole('heading', { name: TITULO, level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Editar', exact: true })).toBeVisible()
  const deLaFicha = await abrir(
    page.getByRole('button', { name: `Más acciones de ${TITULO}` }),
    page,
  )
  expect(await opciones(deLaFicha)).toEqual(['Publicar en la web…', 'Enviar a la papelera'])
  await capturar(page, info, 'menu-del-vehiculo-ficha')
  await cerrar(page, deLaFicha)
})

test('lo que no se puede no aparece: con sólo «editar» el «⋯» tiene «Editar»', async ({ page }) => {
  await entrar(page, t.terreno.soloCorea)
  await alInventario(page, t.terreno.corea.id)
  const menu = await abrir(menuDeVehiculo(page, TITULO), page)
  expect(await opciones(menu)).toEqual(['Editar'])
  await expect(menu.getByRole('separator')).toHaveCount(0)
})

test('sin nada que ofrecer no hay «⋯»', async ({ page }) => {
  await entrar(page, t.lectorSinLeads)
  await alInventario(page, t.terreno.corea.id)
  await expect(page.getByRole('button', { name: `Abrir ${TITULO}` }).first()).toBeAttached()
  await expect(menuDeVehiculo(page, TITULO)).toHaveCount(0)
})

test('«Publicar en la web…» lleva a la ficha con el panel abierto', async ({ page }) => {
  await entrar(page, t.terreno.duena)
  await alInventario(page, t.terreno.corea.id)
  const menu = await abrir(menuDeVehiculo(page, TITULO), page)
  await menu.getByRole('menuitem', { name: 'Publicar en la web…' }).click()
  await expect(page).toHaveURL(new RegExp(`/vehiculos/${t.id}\\?.*panel=vitrina`))
  await expect(page.getByRole('dialog', { name: 'Publicar en la web' })).toBeVisible()
})

test('un vehículo vinculado a un lead tiene la papelera apagada, con el motivo', async ({
  page,
}) => {
  const lead = await crearLead({
    nombre: 'Lead menu vehiculo',
    telefono: `591789${String(Math.floor(Math.random() * 90000) + 10000)}`,
    deQuien: t.terreno.duena,
  })
  const otro = (await vehiculoPorTitulo(OTRO))?.id ?? ''
  await vincular(otro, lead)
  await entrar(page, t.terreno.duena)
  await alInventario(page, t.terreno.corea.id)
  const menu = await abrir(menuDeVehiculo(page, OTRO), page)
  await expect(menu.getByRole('menuitem', { name: 'Enviar a la papelera' })).toBeDisabled()
  await expect(menu.getByText('Está vinculado a un lead. Quita el vínculo antes.')).toBeVisible()
  await cerrar(page, menu)
  await vincular(otro, null)
})

test('enviar a la papelera desde el resumen lo cierra y ofrece «Deshacer»', async ({ page }) => {
  await entrar(page, t.terreno.duena)
  await alInventario(page, t.terreno.corea.id)
  const resumen = await abrirConUnClic(page, OTRO)
  const menu = await abrir(resumen.getByRole('button', { name: `Más acciones de ${OTRO}` }), page)
  await menu.getByRole('menuitem', { name: 'Enviar a la papelera' }).click()
  const aviso = page.locator('[data-sonner-toast]').filter({ hasText: 'se envió a la papelera' })
  await expect(aviso).toBeVisible()
  await expect(page).not.toHaveURL(/vehiculo=/)
  await expect(resumenDe(page, OTRO)).toHaveCount(0)
  await aviso.getByRole('button', { name: 'Deshacer' }).click()
  await expect(menuDeVehiculo(page, OTRO)).toBeVisible()
})
