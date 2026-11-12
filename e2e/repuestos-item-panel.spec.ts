import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { sql } from './soporte/sql'

// El panel de un ítem de repuestos (8.13-2): en la hoja de `/repuestos/[id]`, «Abrir panel» abre `?item=<id>` con la descripción, el proyecto, la fase, «Qué falta», los documentos, el
// transporte («no tiene vehículo» en un proyecto externo), las notas y el historial. La dueña pasa el ítem de «Por cotizar» a «Comprado» (con su precio ya puesto) y la fila de historial
// nace con `repuesto_id`; escribe una nota. `?panel=stock&item=` sigue abriendo el stock y no el panel del ítem. Quien sólo tiene `repuestos.ver` abre el mismo panel con mover y subir
// apagados, cada uno con su motivo, y puede escribir una nota. Mover en sí tiene su prueba en `flujos` (parte 1) y la base su prueba SQL: aquí se prueba que la pantalla lo dice.
// La etiqueta no empieza con «E2E»: la limpieza de `repuestos-proyecto.spec.ts` borra esas (D12). Cada proyecto de Playwright usa la suya.
test.describe.configure({ mode: 'serial' })

const REPUESTO = 'Faro derecho'
let etiqueta = ''
let duena = ''
let lectora = ''
let proyecto = ''
let item = ''
const limpiar = () => {
  if (etiqueta !== '') {
    sql(`delete from repuestos_proyectos where vehiculo_etiqueta = '${etiqueta}'`)
  }
}

test.beforeAll(async ({}, info) => {
  const nombre = info.project.name
  etiqueta = `Prueba panel item e2e ${nombre}`
  limpiar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-panel-item-${nombre}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Rita Panel' })
  lectora = correoDePrueba(`lectora-panel-item-${nombre}`)
  await crearPersona({
    email: lectora,
    contrasena: CONTRASENA,
    nombre: 'Lola Panel',
    invitada: true,
  })
  await darRolDePrueba({
    email: lectora,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Ve repuestos panel ${nombre}`,
      clave: `e2e_ve_repuestos_panel_${nombre}`,
    },
    permisos: ['repuestos.ver'],
  })
})

test.afterAll(async () => {
  limpiar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const bloque = (page: Page, clave: string) => page.locator(`[data-bloque-del-hueco="${clave}"]`)

test('la dueña abre el panel de un ítem, lo pasa a «Comprado» y escribe una nota', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/repuestos?panel=nuevo-proyecto')
  const nuevo = page.getByRole('dialog', { name: 'Nuevo proyecto' })
  await nuevo.getByLabel('Vehículo', { exact: true }).fill(etiqueta)
  await nuevo.getByRole('button', { name: 'Crear proyecto' }).click()
  await expect(page).toHaveURL(/\/repuestos\/[0-9a-f-]{36}$/)
  proyecto = new URL(page.url()).pathname.split('/').pop() ?? ''

  const nueva = page.getByLabel('Nuevo ítem: descripción')
  await nueva.fill(REPUESTO)
  await nueva.press('Enter')
  await expect(page.getByLabel(`Descripción del ítem ${REPUESTO}`)).toBeVisible()
  item = sql(`select id from repuestos_items where proyecto_id = '${proyecto}'`).trim()
  // «Comprado» exige un precio (`repuesto.precio`): se pone aquí, no se prueba otra vez.
  sql(`update repuestos_items set precio_cliente = 99, moneda = 'USD' where id = '${item}'`)
  await page.reload()

  await page.getByRole('button', { name: `Abrir el panel del ítem ${REPUESTO}` }).click()
  const panel = page.getByRole('dialog', { name: 'Repuesto' })
  await expect(page).toHaveURL(new RegExp(`item=${item}`))
  await expect(panel.getByRole('heading', { name: REPUESTO })).toBeVisible()
  const numero = sql(`select numero from repuestos_proyectos where id = '${proyecto}'`).trim()
  await expect(panel.getByText(`Proyecto #${numero}`)).toBeVisible()
  await expect(panel.getByText('Por cotizar')).toBeVisible()
  await expect(panel.getByRole('link', { name: 'Abrir proyecto' })).toBeVisible()

  // Transporte: el proyecto es externo, no hay vehículo al que seguir.
  await bloque(page, 'transporte').locator('summary').click()
  await expect(panel.getByText(/Este proyecto no tiene vehículo/)).toBeVisible()
  // Documentos: la zona de subir está habilitada para quien tiene `repuestos.documentos.subir`.
  await bloque(page, 'documentos').locator('summary').click()
  const zona = panel.getByRole('form', { name: 'Subir documentos' })
  await expect(zona).toBeVisible()
  await expect(zona.getByLabel('Tipo de documento')).toBeEnabled()

  // «Qué falta» nace abierto: se elige «Comprado» y se mueve.
  await panel.getByRole('button', { name: 'Elegir el destino «Comprado»' }).click()
  await panel.getByRole('button', { name: 'Comprar' }).click()
  await expect(page.getByText(`${REPUESTO} pasó a «Comprado».`)).toBeVisible()
  await expect(panel.getByText('Comprado').first()).toBeVisible()
  const enLaBase = sql(
    `select f.nombre || ':' || (select count(*) from historial_fases h where h.repuesto_id = i.id) from repuestos_items i join fases f on f.id = i.fase_id where i.id = '${item}'`,
  )
  expect(enLaBase.trim()).toBe('Comprado:2')

  // Una nota del ítem.
  await bloque(page, 'notas').locator('summary').click()
  const notas = page.locator('[data-hueco="notas"]')
  await notas.getByLabel('Escribir una nota').fill('Llega con el flete')
  await notas.getByRole('button', { name: 'Guardar nota' }).click()
  await expect(notas.locator('[data-nota]').filter({ hasText: 'Llega con el flete' })).toBeVisible()
  expect(
    sql(
      `select count(*) from notas where repuesto_id = '${item}' and cuerpo = 'Llega con el flete'`,
    ).trim(),
  ).toBe('1')

  // Recargar con `?item=` lo vuelve a abrir; con `?panel=stock` manda el stock.
  await page.reload()
  await expect(
    page.getByRole('dialog', { name: 'Repuesto' }).getByRole('heading', { name: REPUESTO }),
  ).toBeVisible()
  await page.goto(`/repuestos/${proyecto}?panel=stock&item=${item}`)
  await expect(page.getByRole('dialog', { name: `Stock de «${REPUESTO}»` })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Repuesto' })).toHaveCount(0)
})

test('con sólo repuestos.ver: el panel abre, mover y subir apagados con su motivo, y la nota se escribe', async ({
  page,
}) => {
  // Vuelve a «Por cotizar» el ítem que movió la dueña, para que haya a dónde mover.
  const porCotizar = `(select f.id from fases f join flujos fl on fl.id = f.flujo_id where fl.ambito = 'repuestos' and f.es_inicial limit 1)`
  sql(`update repuestos_items set fase_id = ${porCotizar}, fase_desde = now() where id = '${item}'`)
  await entrar(page, lectora, { fresco: true })
  await page.goto(`/repuestos/${proyecto}?item=${item}`)
  const panel = page.getByRole('dialog', { name: 'Repuesto' })
  await expect(panel.getByRole('heading', { name: REPUESTO })).toBeVisible()

  await expect(panel.getByRole('button', { name: 'Elegir el destino «Comprado»' })).toBeDisabled()
  await expect(panel.getByText('No tienes permiso para mover repuestos.')).toBeVisible()

  await bloque(page, 'documentos').locator('summary').click()
  await expect(panel.getByRole('form', { name: 'Subir documentos' })).toContainText(/permiso/i)

  await bloque(page, 'notas').locator('summary').click()
  const notas = page.locator('[data-hueco="notas"]')
  await notas.getByLabel('Escribir una nota').fill('Visto por Lola')
  await notas.getByRole('button', { name: 'Guardar nota' }).click()
  await expect(notas.locator('[data-nota]').filter({ hasText: 'Visto por Lola' })).toBeVisible()
})
