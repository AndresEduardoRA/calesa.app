import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { irALeads } from './soporte/leads-listado'
import { limpiarRecorrido, prepararRecorrido, type TerrenoDelRecorrido } from './soporte/recorrido'
import { sql } from './soporte/sql'

// La campana (7.02-2): una fila que la base inserta para la sesión abierta la muestra sin recargar (Realtime es señal y
// el contador se relee), abrirla lleva a su `ruta` y la marca leída (y accionada, si su tipo lo dice), y una `ruta` sin
// pantalla no es un enlace. «Ver todas» y la lista por cursor se suman en la parte 3.
test.describe.configure({ mode: 'serial' })

let r: TerrenoDelRecorrido
let anaId = ''

const TITULO_CON_PANTALLA = 'e2e-campana tarea con pantalla'
const TITULO_SIN_PANTALLA = 'e2e-campana recordatorio sin pantalla'

const borrarAvisos = () => sql(`delete from public.notificaciones where usuario_id = '${anaId}'`)

test.beforeAll(async ({}, info) => {
  r = await prepararRecorrido(info.project.name, 'Campana')
  anaId = sql(`select id from auth.users where email = '${r.ana.email}'`)
  borrarAvisos()
})

test.afterAll(async () => {
  if (anaId) {
    borrarAvisos()
  }
  await limpiarRecorrido(r)
})

const campana = (page: Page) =>
  page.locator('header').getByRole('button', { name: /^Notificaciones/ })

test('una notificación nueva aparece en la campana sin recargar', async ({ page }) => {
  await entrar(page, r.ana.email)
  await irALeads(page)
  await expect(campana(page)).toHaveAccessibleName('Notificaciones')

  sql(`insert into public.notificaciones (usuario_id, tipo, titulo, cuerpo, ruta, requiere_accion)
       values ('${anaId}', 'tarea_asignada', '${TITULO_CON_PANTALLA}', 'Con cuerpo', '/leads/${r.uno.id}', true)`)

  await expect(campana(page)).toHaveAccessibleName(/1 sin leer/, { timeout: 20_000 })
})

test('abrir la notificación lleva a su ruta y la marca leída y accionada', async ({ page }) => {
  await entrar(page, r.ana.email)
  await irALeads(page)
  await expect(campana(page)).toHaveAccessibleName(/1 sin leer/, { timeout: 20_000 })

  await campana(page).click()
  const popover = page.getByRole('dialog', { name: 'Notificaciones' })
  await expect(popover.getByText(TITULO_CON_PANTALLA)).toBeVisible()
  await expect(popover.getByText('Pide acción')).toBeVisible()
  await popover.getByText(TITULO_CON_PANTALLA).click()

  await expect(page).toHaveURL(new RegExp(`/leads/${r.uno.id}`))
  await expect(popover).toBeHidden()
  await expect
    .poll(() =>
      sql(`select (leida_en is not null)::text || ',' || (accionada_en is not null)::text
           from public.notificaciones where usuario_id = '${anaId}' and titulo = '${TITULO_CON_PANTALLA}'`),
    )
    .toBe('true,true')
  // Sin no leídas, la campana vuelve a su nombre simple.
  await expect(campana(page)).toHaveAccessibleName('Notificaciones', { timeout: 20_000 })
})

test('una ruta sin pantalla no es un enlace: se marca leída y lo dice', async ({ page }) => {
  sql(`insert into public.notificaciones (usuario_id, tipo, titulo, ruta, requiere_accion)
       values ('${anaId}', 'recordatorio', '${TITULO_SIN_PANTALLA}', '/agenda?recordatorio=1', false)`)
  await entrar(page, r.ana.email)
  await irALeads(page)
  await expect(campana(page)).toHaveAccessibleName(/1 sin leer/, { timeout: 20_000 })

  await campana(page).click()
  const popover = page.getByRole('dialog', { name: 'Notificaciones' })
  await expect(popover.getByRole('link', { name: new RegExp(TITULO_SIN_PANTALLA) })).toHaveCount(0)
  await popover.getByRole('button', { name: new RegExp(TITULO_SIN_PANTALLA) }).click()
  await expect(popover.getByText('Esa pantalla todavía no está disponible')).toBeVisible()
  expect(page.url()).toContain('/leads')
  await expect
    .poll(() =>
      sql(`select (leida_en is not null)::text || ',' || (accionada_en is not null)::text
           from public.notificaciones where usuario_id = '${anaId}' and titulo = '${TITULO_SIN_PANTALLA}'`),
    )
    .toBe('true,false')
})
