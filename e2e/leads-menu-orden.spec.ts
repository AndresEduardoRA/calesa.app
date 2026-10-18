import type { Locator, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { aLaVista } from './soporte/inventario'
import { borrarLeadsDePrueba } from './soporte/leads'
import { nuevoLead } from './soporte/leads-ficha'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { irAFicha } from './soporte/leads-ficha'
import {
  fila,
  irALeads,
  limpiarListado,
  nombre,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { abrirMenuDeLaFicha, abrirMenuDelLead } from './soporte/leads-marcas'
import {
  embudoPorDefecto,
  irAlEmbudo,
  oportunidad,
  tarjeta,
  verEtapa,
} from './soporte/leads-oportunidades'
import { borrarLotesDePrueba } from './soporte/papelera'
import { capturar } from './soporte/recorrido'

// El «⋯» del lead, el mismo en la fila del listado, la tarjeta del kanban, el resumen y la ficha (9i): una sola lista en este orden —agendar,
// anotar, etiquetas, favorito, tachado y, separada, la papelera—, y lo que una persona no puede hacer no aparece. Cada acción hace lo suyo
// en cada superficie. Capturas: `E2E_CAPTURAS=e2e-capturas/9i`.
test.describe.configure({ mode: 'serial' })

const COMPLETO = [
  'Agendar recordatorio…',
  'Anotar seguimiento…',
  'Etiquetas…',
  'Favorito',
  'Tachado',
  'Enviar a la papelera',
]
const SOLO_MARCAS = ['Etiquetas…', 'Favorito', 'Tachado']

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  // Enviar a la papelera deja un lote de quien lo envió: se va, con sus leads, antes que las personas.
  await borrarLeadsDePrueba()
  await borrarLotesDePrueba()
  await limpiarListado(t)
})

const leadDeBerta = (corto: string) =>
  nuevoLead({ corto, telefono: completoCon(t, nacional()), deQuien: t.personas.berta })

async function opciones(menu: Locator): Promise<string[]> {
  const textos = await menu.locator('[role=menuitem], [role=menuitemcheckbox]').allInnerTexts()
  return textos.map((texto) => texto.trim())
}

const separadores = (menu: Locator) => menu.getByRole('separator')

async function cerrar(page: Page, menu: Locator) {
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
}

const resumenDe = (page: Page, corto: string) => page.getByRole('dialog', { name: nombre(corto) })

// El «⋯» dentro del resumen del lead.
async function menuDelResumen(page: Page, corto: string): Promise<Locator> {
  const menu = page.getByRole('menu')
  await expect(async () => {
    if (!(await menu.isVisible())) {
      await resumenDe(page, corto)
        .getByRole('button', { name: `Más acciones de ${nombre(corto)}` })
        .click()
    }
    await expect(menu).toBeVisible({ timeout: 1000 })
  }).toPass()
  return menu
}

// El «⋯» de la tarjeta del kanban: lee el lead al abrirse, así que se espera la lista entera.
async function menuDeLaTarjeta(page: Page, titulo: string, corto: string): Promise<Locator> {
  const menu = page.getByRole('menu')
  await expect(async () => {
    if (!(await menu.isVisible())) {
      await tarjeta(page, titulo)
        .getByRole('button', { name: `Más acciones de ${nombre(corto)}` })
        .click()
    }
    await expect(menu).toBeVisible({ timeout: 1000 })
  }).toPass()
  return menu
}

test('con todo, el orden es el mismo en la fila, la tarjeta del kanban, el resumen y la ficha', async ({
  page,
}, info) => {
  const corto = `Orden ${info.project.name}`
  const lead = await leadDeBerta(corto)
  const titulo = `Op orden ${info.project.name}`
  await embudoPorDefecto(t.personas.berta)
  await oportunidad(t.personas.berta, lead.id, { titulo })
  await entrar(page, t.personas.berta)

  // La fila (o la tarjeta del celular) del listado.
  await irALeads(page)
  const deLaFila = await abrirMenuDelLead(page, nombre(corto))
  expect(await opciones(deLaFila)).toEqual(COMPLETO)
  // Tres bloques: dos separadores (entre agendar/anotar y las marcas, y antes de la papelera).
  await expect(separadores(deLaFila)).toHaveCount(2)
  await capturar(page, info, 'menu-del-lead-fila')
  await cerrar(page, deLaFila)

  // El resumen.
  await fila(page, corto).click()
  await expect(resumenDe(page, corto)).toBeVisible()
  const delResumen = await menuDelResumen(page, corto)
  expect(await opciones(delResumen)).toEqual(COMPLETO)
  await expect(separadores(delResumen)).toHaveCount(2)
  await capturar(page, info, 'menu-del-lead-resumen')
  await cerrar(page, delResumen)

  // La ficha.
  await irAFicha(page, lead.id)
  const deLaFicha = await abrirMenuDeLaFicha(page)
  expect(await opciones(deLaFicha)).toEqual(COMPLETO)
  await expect(separadores(deLaFicha)).toHaveCount(2)
  await capturar(page, info, 'menu-del-lead-ficha')
  await cerrar(page, deLaFicha)

  // La tarjeta del kanban: trae sus datos al abrirse.
  await irAlEmbudo(page)
  await verEtapa(page, 'Nuevo')
  await expect(tarjeta(page, titulo)).toBeVisible()
  const delKanban = await menuDeLaTarjeta(page, titulo, corto)
  await expect.poll(() => opciones(delKanban)).toEqual(COMPLETO)
  await expect(separadores(delKanban)).toHaveCount(2)
  await capturar(page, info, 'menu-del-lead-kanban')
  await cerrar(page, delKanban)
})

test('quien ve el lead sin tenerlo en su cartera ni poder enviarlo sólo ve las marcas, en las cuatro superficies', async ({
  page,
}, info) => {
  const corto = `Ajeno orden ${info.project.name}`
  const lead = await leadDeBerta(corto)
  await entrar(page, t.personas.sinCrear)
  await irALeads(page, '?alcance=todos')
  const deLaFila = await abrirMenuDelLead(page, nombre(corto))
  expect(await opciones(deLaFila)).toEqual(SOLO_MARCAS)
  // Un solo bloque: sin separadores.
  await expect(separadores(deLaFila)).toHaveCount(0)
  await cerrar(page, deLaFila)

  await fila(page, corto).click()
  const delResumen = await menuDelResumen(page, corto)
  expect(await opciones(delResumen)).toEqual(SOLO_MARCAS)
  await cerrar(page, delResumen)

  await irAFicha(page, lead.id)
  const deLaFicha = await abrirMenuDeLaFicha(page)
  expect(await opciones(deLaFicha)).toEqual(SOLO_MARCAS)
  await cerrar(page, deLaFicha)
})

test('anotar y agendar abren su modal donde se pidieron: el resumen, la ficha y el kanban', async ({
  page,
}, info) => {
  const corto = `Acciones ${info.project.name}`
  const lead = await leadDeBerta(corto)
  const titulo = `Op acciones ${info.project.name}`
  await oportunidad(t.personas.berta, lead.id, { titulo })
  await entrar(page, t.personas.berta)

  // El resumen elige la pestaña y abre el modal dentro.
  await irALeads(page)
  await fila(page, corto).click()
  let menu = await menuDelResumen(page, corto)
  await menu.getByRole('menuitem', { name: 'Anotar seguimiento…' }).click()
  await expect(page).toHaveURL(/pestana=seguimientos/)
  await expect(page).toHaveURL(/panel=anotar-seguimiento/)
  await expect(page.getByRole('dialog', { name: 'Anotar seguimiento' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Anotar seguimiento' })).toBeHidden()
  await expect(resumenDe(page, corto)).toBeVisible()
  menu = await menuDelResumen(page, corto)
  await menu.getByRole('menuitem', { name: 'Agendar recordatorio…' }).click()
  await expect(page).toHaveURL(/pestana=recordatorios/)
  await expect(page.getByRole('dialog', { name: 'Agendar recordatorio' })).toBeVisible()
  await page.keyboard.press('Escape')

  // La ficha va a «Seguimientos» con el modal abierto.
  await irAFicha(page, lead.id)
  menu = await abrirMenuDeLaFicha(page)
  await menu.getByRole('menuitem', { name: 'Anotar seguimiento…' }).click()
  await expect(page).toHaveURL(/seccion=seguimientos/)
  await expect(page).toHaveURL(/panel=anotar-seguimiento/)
  await expect(page.getByRole('dialog', { name: 'Anotar seguimiento' })).toBeVisible()

  // La tarjeta del kanban abre el modal de la fila, sobre ese lead.
  await irAlEmbudo(page)
  await verEtapa(page, 'Nuevo')
  menu = await menuDeLaTarjeta(page, titulo, corto)
  await expect.poll(() => opciones(menu)).toEqual(COMPLETO)
  await menu.getByRole('menuitem', { name: 'Anotar seguimiento…' }).click()
  const modal = page.getByRole('dialog', { name: 'Anotar seguimiento' })
  await expect(modal).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`para=${lead.id}`))
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
})

test('favorito desde el resumen se ve en el resumen, y enviar a la papelera lo cierra', async ({
  page,
}, info) => {
  const corto = `Marcas resumen ${info.project.name}`
  await leadDeBerta(corto)
  await entrar(page, t.personas.berta)
  await irALeads(page)
  await fila(page, corto).click()
  const resumen = resumenDe(page, corto)
  let menu = await menuDelResumen(page, corto)
  await menu.getByRole('menuitemcheckbox', { name: 'Favorito' }).click()
  await cerrar(page, menu)
  // El resumen vuelve a leer el lead y muestra la marca nueva.
  await expect(aLaVista(resumen.getByText('Favorito', { exact: true }))).toBeAttached()

  menu = await menuDelResumen(page, corto)
  await menu.getByRole('menuitem', { name: 'Enviar a la papelera' }).click()
  await expect(page).not.toHaveURL(/lead=/)
  await expect(resumen).toHaveCount(0)
  await expect(
    page
      .locator('[data-sonner-toast]')
      .filter({ hasText: `«${nombre(corto)}» se envió a la papelera.` }),
  ).toBeVisible()
})

test('sin red al abrir el «⋯» de una tarjeta del kanban lo dice, y al volver la red muestra la lista', async ({
  page,
  context,
}, info) => {
  test.setTimeout(60_000)
  const corto = `Sin red ${info.project.name}`
  const lead = await leadDeBerta(corto)
  const titulo = `Op sin red ${info.project.name}`
  await oportunidad(t.personas.berta, lead.id, { titulo })
  await entrar(page, t.personas.berta)
  await irAlEmbudo(page)
  await verEtapa(page, 'Nuevo')
  await expect(tarjeta(page, titulo)).toBeVisible()
  await context.setOffline(true)
  await tarjeta(page, titulo)
    .getByRole('button', { name: `Más acciones de ${nombre(corto)}` })
    .click()
  // La lectura reintenta antes de rendirse (supabase-js: unos 7 s sin red).
  await expect(page.getByText('No se pudo cargar. Cierra el menú y vuelve a abrirlo.')).toBeVisible(
    { timeout: 20_000 },
  )
  await context.setOffline(false)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toBeHidden()
  const menu = await menuDeLaTarjeta(page, titulo, corto)
  await expect.poll(() => opciones(menu)).toEqual(COMPLETO)
})

test('la dueña sobre un lead ajeno: marca y envía, pero no anota ni agenda (no es de su cartera)', async ({
  page,
}, info) => {
  const corto = `Ajeno dueña ${info.project.name}`
  const lead = await leadDeBerta(corto)
  await entrar(page, t.personas.duena)
  await irALeads(page, '?alcance=todos')
  const deLaFila = await abrirMenuDelLead(page, nombre(corto))
  expect(await opciones(deLaFila)).toEqual([
    'Etiquetas…',
    'Favorito',
    'Tachado',
    'Enviar a la papelera',
  ])
  await expect(separadores(deLaFila)).toHaveCount(1)
  await capturar(page, info, 'menu-del-lead-duena-fila')
  await cerrar(page, deLaFila)
  await fila(page, corto).click()
  const delResumen = await menuDelResumen(page, corto)
  expect(await opciones(delResumen)).toEqual([
    'Etiquetas…',
    'Favorito',
    'Tachado',
    'Enviar a la papelera',
  ])
  await capturar(page, info, 'menu-del-lead-duena-resumen')
  await cerrar(page, delResumen)
  await irAFicha(page, lead.id)
  const deLaFicha = await abrirMenuDeLaFicha(page)
  expect(await opciones(deLaFicha)).toEqual([
    'Etiquetas…',
    'Favorito',
    'Tachado',
    'Enviar a la papelera',
  ])
  await cerrar(page, deLaFicha)
})
