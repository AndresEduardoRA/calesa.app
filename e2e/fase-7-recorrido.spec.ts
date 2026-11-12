import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { sql } from './soporte/sql'
import { crearLead } from './soporte/leads'
import {
  limpiarMenciones,
  NOMBRE_DEL_LEAD,
  NOMBRE_VISIBLE_DEL_LEAD,
  prepararMenciones,
  type TerrenoDeMenciones,
} from './soporte/chat-menciones'

// El recorrido del «Terminado cuando» de la Fase 7 (7.14-1), con las cuentas del chat: (R1) una tarea dada con `/tarea` en el chat le llega al
// responsable en la campana sin recargar, con las dos sesiones abiertas a la vez; (R2) la mención a un lead que no ve muestra el placeholder y el
// nombre no está en el DOM; (R3) el buscador no trae lo que la RLS esconde ni busca por teléfono. El push de esa tarea no lo puede entregar
// Chromium: el tramo de la base a la función servida lo recorre `supabase/tests/push-de-verdad.sh` y la última milla, `push-contrato.test.ts`.
test.describe.configure({ mode: 'serial' })

const NOMBRE_AJENO = 'Ajeno del Recorrido'
// El teléfono del lead de Ana (`prepararMenciones`): ella lo ve, y aun así no se busca por él.
const TELEFONO_DEL_LEAD = '70033441'

let t: TerrenoDeMenciones

test.beforeAll(async ({}, info) => {
  t = await prepararMenciones(info.project.name)
  await crearLead({ nombre: NOMBRE_AJENO, telefono: '70055662', deQuien: t.duena.email })
})

test.afterAll(async () => {
  await limpiarMenciones()
})

const campana = (page: Page) =>
  page.locator('header').getByRole('button', { name: /^Notificaciones/ })
const paleta = (page: Page) => page.getByRole('dialog', { name: 'Buscar' })

test('E2E R1 la tarea dada con /tarea en el chat le llega a Luis en la campana sin recargar', async ({
  page,
  browser,
}, info) => {
  const titulo = `Revisar el recorrido E2E ${info.project.name}`
  await entrar(page, t.ana.email)
  await page.goto(`/chat?c=${t.conLuis}`)

  // Luis, en otra sesión, mira su perfil con la campana sin avisos.
  const contexto = await browser.newContext({ baseURL: new URL(page.url()).origin })
  const deLuis = await contexto.newPage()
  await entrar(deLuis, t.luis.email, { fresco: true })
  await deLuis.goto('/perfil')
  await expect(campana(deLuis)).toHaveAccessibleName('Notificaciones')

  const campo = page.getByRole('textbox', { name: 'Mensaje' })
  await campo.fill(`/tarea ${titulo}`)
  await expect(
    page.getByRole('status').filter({ hasText: 'Enter abre el formulario' }),
  ).toBeVisible()
  await campo.press('Enter')
  const panel = page.getByRole('dialog', { name: 'Nueva tarea', exact: true })
  await expect(panel.getByLabel('Título', { exact: true })).toHaveValue(titulo)
  await expect(panel.getByRole('button', { name: 'Quitar a Luis Chat' })).toBeVisible()
  const manana = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)
  await panel.getByLabel('Vence').fill(`${manana}T12:00`)
  await panel.getByRole('button', { name: 'Crear tarea' }).click()
  await expect(panel).toBeHidden()
  const ficha = page.getByRole('log', { name: 'Mensajes' }).locator('[data-ficha="tarea"]')
  await expect(ficha.getByText(titulo)).toBeVisible()
  await expect(ficha.getByText('Para Luis Chat')).toBeVisible()

  // Sin recargar: la campana de Luis cuenta el aviso y el popover lo trae.
  await expect(campana(deLuis)).toHaveAccessibleName(/1 sin leer/, { timeout: 20_000 })
  await campana(deLuis).click()
  await expect(
    deLuis.getByRole('dialog', { name: 'Notificaciones' }).getByText(new RegExp(titulo)),
  ).toBeVisible()
  expect(
    sql(`select count(*) from public.notificaciones
          where usuario_id = '${t.luis.id}' and tipo = 'tarea_asignada' and cuerpo = '${titulo}'`),
  ).toBe('1')
  await contexto.close()
})

test('E2E R2 Luis lee el placeholder de la mención a un lead que no ve y el nombre no está en el DOM', async ({
  page,
}) => {
  await entrar(page, t.luis.email)
  await page.goto(`/chat?c=${t.conLuis}`)
  const chip = page
    .getByRole('log', { name: 'Mensajes' })
    .getByRole('button', { name: 'No tienes acceso a este lead' })
  await expect(chip).toBeVisible()
  await expect(page.getByText(NOMBRE_VISIBLE_DEL_LEAD)).toHaveCount(0)
  await expect(page.locator(`[href*="${t.leadId}"]`)).toHaveCount(0)

  await chip.click()
  const drawer = page.getByRole('dialog', { name: 'No tienes acceso a este lead' })
  await expect(drawer).toBeVisible()
  await expect(drawer.getByRole('link')).toHaveCount(0)
  await expect(page.getByText(NOMBRE_VISIBLE_DEL_LEAD)).toHaveCount(0)
})

async function buscar(page: Page, texto: string) {
  const cuadro = paleta(page).getByRole('combobox', { name: 'Buscar' })
  await cuadro.fill(texto)
}

test('E2E R3 el buscador no trae lo que la RLS esconde ni busca por teléfono', async ({ page }) => {
  await entrar(page, t.ana.email)
  await page.goto('/perfil')
  await page.locator('header').getByRole('button', { name: 'Buscar' }).click()
  await expect(paleta(page)).toBeVisible()

  // Control: su propio lead sale por el nombre.
  await buscar(page, NOMBRE_DEL_LEAD)
  await expect(
    paleta(page).getByRole('option', { name: new RegExp(NOMBRE_DEL_LEAD) }),
  ).toBeVisible()

  // El de la dueña, no: la RLS lo esconde.
  await buscar(page, NOMBRE_AJENO)
  await expect(paleta(page).getByText(`Sin resultados para «${NOMBRE_AJENO}».`)).toBeVisible()
  await expect(paleta(page).getByRole('option', { name: new RegExp(NOMBRE_AJENO) })).toHaveCount(0)

  // Ni por teléfono, aunque el lead sea suyo.
  await buscar(page, TELEFONO_DEL_LEAD)
  await expect(paleta(page).getByText('No se busca por teléfono.')).toBeVisible()
  await expect(paleta(page).getByRole('option', { name: new RegExp(NOMBRE_DEL_LEAD) })).toHaveCount(
    0,
  )

  // Luis no tiene `leads.ver`: el lead de Ana no le sale.
  await page.context().clearCookies()
  await entrar(page, t.luis.email, { fresco: true })
  await page.goto('/perfil')
  await page.locator('header').getByRole('button', { name: 'Buscar' }).click()
  await buscar(page, NOMBRE_DEL_LEAD)
  await expect(paleta(page).getByText(`Sin resultados para «${NOMBRE_DEL_LEAD}».`)).toBeVisible()
  await expect(paleta(page).getByRole('option', { name: new RegExp(NOMBRE_DEL_LEAD) })).toHaveCount(
    0,
  )
})
