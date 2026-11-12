import type { Browser, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { aprobarElBl, borrarMover, sembrarMover, type TerrenoDeMover } from './soporte/mover'

// Mover desde el panel de la unidad (6.04-1): «Qué falta» abre solo; con nota obligatoria el botón está apagado y dice por qué; con el documento bloqueante sin aprobar dice cuál falta y se
// habilita al aprobarlo (la lectura se repite al volver el foco); y si otra persona movió antes, el aviso de conflicto la nombra y conserva la nota. Permisos, conflicto y carrera de la base
// ya tienen su prueba SQL (6.02): aquí se prueba que la pantalla los dice.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let terreno: TerrenoDeMover

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarMover(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-mover-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dalia Mover',
  })
  terreno = await sembrarMover(proyecto)
})

test.afterAll(async () => {
  await borrarMover(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

async function otraPersona(browser: Browser, page: Page): Promise<Page> {
  const contexto = await browser.newContext({ baseURL: new URL(page.url()).origin })
  return contexto.newPage()
}

const destino = (page: Page, nombre: string) =>
  page.locator('[data-destino]').filter({ hasText: nombre })

test('E2E mover · con la nota obligatoria el botón está apagado y dice por qué; con la nota mueve', async ({
  page,
}) => {
  await entrar(page, terreno.primera.correo, { fresco: true })
  await page.goto(`/logistica/vehiculo/${terreno.enA.id}`)
  // «Qué falta» nace abierto y muestra a dónde puede ir.
  await expect(page.getByRole('heading', { name: terreno.b.nombre, level: 3 })).toBeVisible()
  await page.getByRole('button', { name: `Elegir el destino «${terreno.b.nombre}»` }).click()
  const mover = page.getByRole('button', { name: `Mover a «${terreno.b.nombre}»` })
  await expect(mover).toBeDisabled()
  await expect(page.locator('[data-motivo-del-boton]')).toHaveText(
    'Esta fase pide una nota interna.',
  )
  await page.getByLabel('Nota interna (obligatoria)').fill('Zarpó el lunes.')
  await expect(mover).toBeEnabled()
  await page.getByLabel('Nota interna (obligatoria)').press('Control+Enter')
  await expect(page.getByText(`${terreno.enA.titulo} pasó a «${terreno.b.nombre}».`)).toBeVisible()
  // La tarjeta cambió de columna: en la columna B ahora hay dos vehículos.
  await page.goto(`/logistica?fase=${terreno.b.id}`)
  await expect(page.getByRole('region', { name: `${terreno.b.nombre}: 2 vehículos` })).toBeVisible()
})

test('E2E mover · un requisito bloqueante sin aprobar apaga el botón y dice cuál; al aprobarlo se habilita', async ({
  page,
}) => {
  await entrar(page, terreno.primera.correo)
  await page.goto(`/logistica/vehiculo/${terreno.enB.id}`)
  await page.getByRole('button', { name: `Elegir el destino «${terreno.c.nombre}»` }).click()
  const bloque = destino(page, terreno.c.nombre)
  await expect(bloque.getByText('Falta', { exact: true })).toBeVisible()
  await expect(bloque.getByText('Obligatorio')).toBeVisible()
  await expect(bloque.locator('[data-motivo-del-boton]')).toHaveText(
    `Falta: ${terreno.tipoDeBl.nombre} aprobado.`,
  )
  await expect(bloque.getByRole('button', { name: `Mover a «${terreno.c.nombre}»` })).toBeDisabled()
  await aprobarElBl(terreno, terreno.enB.id)
  // Al volver el foco a la ventana (pasaron más de 5 s desde la lectura) «Qué falta» se relee.
  await expect(async () => {
    await page.evaluate(() => {
      window.dispatchEvent(new Event('focus'))
    })
    await expect(bloque.getByText('Cumplido', { exact: true })).toBeVisible({ timeout: 1500 })
  }).toPass({ timeout: 20_000 })
  await expect(bloque.getByRole('button', { name: `Mover a «${terreno.c.nombre}»` })).toBeEnabled()
})

test('E2E mover · si otra persona movió antes, el aviso de conflicto la nombra y no se mueve nada', async ({
  page,
  browser,
}) => {
  // La segunda cuenta mueve primero el vehículo que sigue en A… que ya está en B por la primera prueba: se usa un vehículo nuevo.
  await entrar(page, terreno.primera.correo)
  const sinMover = await vehiculoNuevoEnA(terreno)
  await page.goto(`/logistica/vehiculo/${sinMover}`)
  await page.getByRole('button', { name: `Elegir el destino «${terreno.b.nombre}»` }).click()
  await page.getByLabel('Nota interna (obligatoria)').fill('Mi nota.')

  const otra = await otraPersona(browser, page)
  await entrar(otra, terreno.segunda.correo, { fresco: true })
  await otra.goto(`/logistica/vehiculo/${sinMover}`)
  await otra.getByRole('button', { name: `Elegir el destino «${terreno.b.nombre}»` }).click()
  await otra.getByLabel('Nota interna (obligatoria)').fill('Yo primero.')
  await otra.getByLabel('Nota interna (obligatoria)').press('Control+Enter')
  await expect(otra.getByText(/pasó a «/)).toBeVisible()

  // La primera todavía ve la fase vieja: al enviar, la base responde el conflicto con el nombre de quien movió.
  await page.getByLabel('Nota interna (obligatoria)').press('Control+Enter')
  const aviso = page.getByRole('status').filter({ hasText: 'Rosa Mamani la movió a' })
  await expect(aviso).toContainText(`«${terreno.b.nombre}»`)
  await expect(aviso).toContainText('No se movió nada.')
  // «Recargar» deja el panel en la fase nueva y la nota que había escrito sigue a mano.
  await aviso.getByRole('button', { name: 'Recargar' }).click()
  await expect(page.getByRole('heading', { name: terreno.c.nombre, level: 3 })).toBeVisible()
  await page.getByRole('button', { name: `Elegir el destino «${terreno.c.nombre}»` }).click()
  await expect(page.getByLabel(/Nota interna/)).toHaveValue('Mi nota.')
  await otra.context().close()
})

async function vehiculoNuevoEnA(t: TerrenoDeMover): Promise<string> {
  const { data, error } = await admin()
    .from('vehiculos')
    .insert({
      origen_id: t.origen.id,
      titulo: `E2E Mover conflicto ${proyecto}`,
      fase_id: t.a.id,
      fase_desde: new Date().toISOString(),
    })
    .select('id')
    .single<{ id: string }>()
  if (error) throw new Error(`No se pudo crear el vehículo: ${error.message}`)
  return data.id
}
