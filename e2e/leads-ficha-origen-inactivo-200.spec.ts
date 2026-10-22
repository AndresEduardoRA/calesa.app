import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { irAFicha } from './soporte/leads-ficha'
import {
  PREFIJO_DE_ORIGEN_E2E,
  borrarOrigenesDePrueba,
  sembrarOrigen,
} from './soporte/origenes-de-lead'
import {
  aLaVistaSinDesplazar,
  limpiarRecorrido,
  prepararRecorrido,
  sinScrollHorizontal,
  textoGrandeAlCargar,
  type TerrenoDelRecorrido,
} from './soporte/recorrido'
import { sql } from './soporte/sql'

// 5a-22: un lead cuyo origen está inactivo y tiene un nombre largo, con el texto al 200 %. La línea del origen de la cabecera de la ficha
// medía 436 px en 412 (la página se desplazaba de costado) porque «(inactivo)» no cede y el nombre no se achicaba: ahora el nombre se corta con «…»
// (y dice su texto entero con `title`) y «(inactivo)» queda siempre a la vista. Lo mismo en «Datos» de la ficha y en el resumen
// (`?lead=`), que antes no decía que el origen está apagado. Una prueba por pantalla y sin `serial`: cuando una cae, las demás siguen.

let r: TerrenoDelRecorrido
let origen = ''

test.beforeAll(async ({}, info) => {
  r = await prepararRecorrido(info.project.name, 'OI')
  origen = `${PREFIJO_DE_ORIGEN_E2E} origen inactivo con un nombre tan largo que no cabe ni en escritorio ${info.project.name}`
  const inactivo = await sembrarOrigen(origen)
  // La base no deja asignar un origen ya apagado: se asigna activo y después se apaga.
  sql(`
    update public.origenes_lead set icono = 'compartir' where id = '${inactivo.id}';
    update public.leads set origen_lead_id = '${inactivo.id}' where id = '${r.uno.id}';
    update public.origenes_lead set activo = false where id = '${inactivo.id}';
  `)
})

test.afterAll(async () => {
  await limpiarRecorrido(r)
  await borrarOrigenesDePrueba()
})

test('la cabecera de la ficha: el origen se corta con «…» y «(inactivo)» queda a la vista, sin ensanchar la página', async ({
  page,
}) => {
  await textoGrandeAlCargar(page)
  await entrar(page, r.t.personas.duena)
  await irAFicha(page, r.uno.id)
  const cabecera = page.locator('header')
  const nombre = cabecera.getByTitle(origen, { exact: true }).locator('.truncate')
  await expect(nombre).toBeVisible()
  const marca = cabecera.getByText('(inactivo)')
  await expect(marca).toBeVisible()
  await sinScrollHorizontal(page)
  await aLaVistaSinDesplazar(marca, '«(inactivo)» de la cabecera')
  // El nombre de 90 letras no cabe en una línea al 200 %: se corta (y el `title` del origen dice el resto).
  expect(await nombre.evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true)
})

test('«Datos» de la ficha: «(inactivo)» queda a la vista junto al origen', async ({ page }) => {
  await textoGrandeAlCargar(page)
  await entrar(page, r.t.personas.duena)
  await irAFicha(page, r.uno.id)
  const dato = page.locator('dd').filter({ hasText: '(inactivo)' })
  await expect(dato).toBeVisible()
  await aLaVistaSinDesplazar(dato.getByText('(inactivo)'), '«(inactivo)» de «Datos»')
  await sinScrollHorizontal(page)
})

test('el resumen del lead: dice que el origen está inactivo y no ensancha la página', async ({
  page,
}) => {
  await textoGrandeAlCargar(page)
  await entrar(page, r.t.personas.duena)
  await page.goto(`/leads?lead=${r.uno.id}`)
  const resumen = page.getByRole('dialog', { name: r.uno.nombre })
  await expect(resumen).toBeVisible()
  const marca = resumen.getByText('(inactivo)')
  await expect(marca).toBeVisible()
  await aLaVistaSinDesplazar(marca, '«(inactivo)» del resumen')
  await sinScrollHorizontal(page)
})
