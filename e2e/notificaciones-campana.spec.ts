import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { irALeads } from './soporte/leads-listado'
import { limpiarRecorrido, prepararRecorrido, type TerrenoDelRecorrido } from './soporte/recorrido'
import { sql } from './soporte/sql'

// La campana (7.02-2): una fila que la base inserta para la sesión abierta la muestra sin recargar (Realtime es señal y
// el contador se relee), abrirla lleva a su `ruta` y la marca leída (y accionada, si su tipo lo dice), y una `ruta` sin
// pantalla no es un enlace. «Ver todas» lleva a `/notificaciones` (7.02-3): 20 filas, «Ver más» por cursor sin repetir ni
// saltar, `?ver=por-accionar` filtra, una fila nueva entra arriba sin recargar y «Marcar todas como leídas» las deja leídas.
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

// Una ruta interna que ninguna pantalla va a tener: con una real (`/agenda`, que llegó con 7.07) el spec se rompía al llegar su pantalla.
test('una ruta sin pantalla no es un enlace: se marca leída y lo dice', async ({ page }) => {
  sql(`insert into public.notificaciones (usuario_id, tipo, titulo, ruta, requiere_accion)
       values ('${anaId}', 'recordatorio', '${TITULO_SIN_PANTALLA}', '/e2e-sin-pantalla?recordatorio=1', false)`)
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

// La lista (7.02-3): 25 avisos, de más nuevo a más viejo; los dos más viejos piden acción.
const FILAS = 25
const aviso = (page: Page) => page.locator('li[data-notificacion]')
const idsDeLaLista = (page: Page) =>
  aviso(page).evaluateAll((filas) => filas.map((fila) => fila.getAttribute('data-notificacion')))

test('«Ver todas» lista 20 y «Ver más» trae el resto por cursor sin repetir', async ({ page }) => {
  borrarAvisos()
  sql(`insert into public.notificaciones (usuario_id, tipo, titulo, requiere_accion, creado_en)
       select '${anaId}', 'tarea_asignada', 'e2e-lista ' || lpad(n::text, 2, '0'), n >= ${FILAS - 1},
              now() - (n || ' minutes')::interval
       from generate_series(1, ${FILAS}) n`)
  await entrar(page, r.ana.email)
  await irALeads(page)
  await expect(campana(page)).toHaveAccessibleName(/\d+\+? sin leer/, { timeout: 20_000 })
  await campana(page).click()
  await page
    .getByRole('dialog', { name: 'Notificaciones' })
    .getByRole('link', { name: 'Ver todas' })
    .click()

  await expect(page).toHaveURL(/\/notificaciones$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Notificaciones' })).toBeVisible()
  await expect(aviso(page)).toHaveCount(20)
  await expect(aviso(page).first()).toContainText('e2e-lista 01')
  await expect(aviso(page).last()).toContainText('e2e-lista 20')

  await page.getByRole('button', { name: 'Ver más' }).click()
  await expect(aviso(page)).toHaveCount(FILAS)
  const ids = await idsDeLaLista(page)
  expect(new Set(ids).size).toBe(FILAS)
  await expect(aviso(page).last()).toContainText('e2e-lista 25')
  await expect(page.getByRole('button', { name: 'Ver más' })).toHaveCount(0)
})

test('?ver=por-accionar sólo lista las que piden acción y «Todas» vuelve a todas', async ({
  page,
}) => {
  await entrar(page, r.ana.email)
  await page.goto('/notificaciones?ver=por-accionar')
  await expect(aviso(page)).toHaveCount(2)
  await expect(page.getByRole('tab', { name: 'Por accionar' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await page.getByRole('tab', { name: 'Todas' }).click()
  await expect(page).not.toHaveURL(/ver=/)
  await expect(aviso(page)).toHaveCount(20)
})

test('un aviso nuevo entra arriba de la lista abierta sin recargar', async ({ page }) => {
  await entrar(page, r.ana.email)
  await page.goto('/notificaciones')
  await expect(aviso(page)).toHaveCount(20)
  sql(`insert into public.notificaciones (usuario_id, tipo, titulo, requiere_accion)
       values ('${anaId}', 'tarea_asignada', 'e2e-lista nueva', false)`)
  await expect(aviso(page).first()).toContainText('e2e-lista nueva', { timeout: 20_000 })
  await expect(aviso(page)).toHaveCount(21)
})

test('«Marcar todas como leídas» las deja leídas y el botón desaparece', async ({ page }) => {
  await entrar(page, r.ana.email)
  await page.goto('/notificaciones')
  await page.getByRole('button', { name: 'Marcar todas como leídas' }).click()
  await expect
    .poll(() =>
      sql(
        `select count(*)::text from public.notificaciones where usuario_id = '${anaId}' and leida_en is null`,
      ),
    )
    .toBe('0')
  await expect(page.getByRole('button', { name: 'Marcar todas como leídas' })).toHaveCount(0)
  await expect(campana(page)).toHaveAccessibleName('Notificaciones', { timeout: 20_000 })
  // Marcar leídas no acciona: las dos que piden acción siguen pendientes.
  expect(
    sql(
      `select count(*)::text from public.notificaciones where usuario_id = '${anaId}' and accionada_en is not null`,
    ),
  ).toBe('0')
})
