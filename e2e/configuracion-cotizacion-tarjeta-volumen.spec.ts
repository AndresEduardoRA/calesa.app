import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import {
  crearConfiguradoraDeTarjeta,
  limpiarTerrenoDePlantilla,
  prepararTerrenoDePlantilla,
} from './soporte/plantilla'
import { publicarLaMiniConMiembros } from './soporte/plantilla-volumen'
import { borrarPersonasDePrueba, borrarRolesDePrueba } from './soporte/base'

// La pestaña «Tarjeta» con volumen (4.19-3b): el primer HTML no lleva lo que el editor no dibuja (el cuerpo de un nodo); con 500 miembros se mide el peso de la
// pestaña; con 600, el tope de 500 filas dice dónde buscar y «Buscar fila» halla la que el tope dejaba fuera.
test.describe.configure({ mode: 'serial' })

// Lo medido en escritorio con 500 miembros (4.19-3b: 147.484 B del primer HTML y 4.754 nodos con «Filas» abierto), más un 5 %. Va a docs/RENDIMIENTO.md.
const TOPE_DE_BYTES_DEL_HTML = 154_900
const TOPE_DE_NODOS_CON_500 = 5_000

let configuradora = ''
let mini = { id: '', nombre: '' }
let con500 = { id: '', nombre: '' }
let con600 = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  info.setTimeout(240_000)
  const proyecto = info.project.name
  const terreno = await prepararTerrenoDePlantilla(proyecto, 'tarjvol')
  mini = { id: terreno.origenId, nombre: '' }
  con500 = await crearOrigenDeCotizar(proyecto, 'tarjv500', false)
  publicarLaMiniConMiembros(con500.id, 500)
  con600 = await crearOrigenDeCotizar(proyecto, 'tarjv600', false)
  publicarLaMiniConMiembros(con600.id, 600)
  configuradora = await crearConfiguradoraDeTarjeta(proyecto, 'tarjvol', [
    mini.id,
    con500.id,
    con600.id,
  ])
})

test.afterAll(async ({}, info) => {
  info.setTimeout(120_000)
  await limpiarTerrenoDePlantilla()
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

async function abrir(page: Page, id: string) {
  await page.goto(`/configuracion/cotizacion?seccion=tarjeta&origen=${id}`)
  await expect(page.getByRole('heading', { name: /^Tarjeta de / })).toBeVisible()
}

test('E7: el primer HTML no lleva el cuerpo de un nodo que el editor no dibuja', async ({
  page,
}) => {
  await entrar(page, configuradora, { fresco: true })
  const respuesta = await page.request.get(
    `/configuracion/cotizacion?seccion=tarjeta&origen=${mini.id}`,
  )
  expect(respuesta.ok()).toBe(true)
  expect(await respuesta.text()).not.toContain('Probabilidad de compra en subasta')
})

test('E7: con 500 miembros se miden los bytes del primer HTML y los nodos del DOM', async ({
  page,
}, info) => {
  await entrar(page, configuradora, { fresco: true })
  const respuesta = await page.request.get(
    `/configuracion/cotizacion?seccion=tarjeta&origen=${con500.id}`,
  )
  const bytes = Buffer.byteLength(await respuesta.text())
  await abrir(page, con500.id)
  await page.getByText('Filas', { exact: true }).click()
  await expect(page.getByLabel('Buscar fila')).toBeVisible()
  const nodos = await page.evaluate(() => document.querySelectorAll('*').length)
  info.annotations.push({
    type: 'medido',
    description: `${String(bytes)} B, ${String(nodos)} nodos`,
  })
  expect(bytes).toBeLessThan(TOPE_DE_BYTES_DEL_HTML)
  expect(nodos).toBeLessThan(TOPE_DE_NODOS_CON_500)
})

test('E7: con 600 miembros, el aviso de tope y «Buscar fila» halla la fila 600', async ({
  page,
}) => {
  await entrar(page, configuradora, { fresco: true })
  await abrir(page, con600.id)
  await page.getByText('Filas', { exact: true }).click()
  await expect(page.getByText(/Se muestran las 500 primeras filas/)).toBeVisible()
  await expect(page.getByLabel('Etiqueta de «Miembro 600»')).toHaveCount(0)
  await page.getByLabel('Buscar fila').fill('miembro 600')
  await expect(page.getByLabel('Etiqueta de «Miembro 600»')).toBeVisible()
  await expect(page.getByText(/Se muestran las 500 primeras filas/)).toHaveCount(0)
})
