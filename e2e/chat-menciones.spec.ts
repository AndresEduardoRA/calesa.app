import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import {
  limpiarMenciones,
  NOMBRE_VISIBLE_DEL_LEAD,
  prepararMenciones,
  type TerrenoDeMenciones,
} from './soporte/chat-menciones'

// El chat (7.10-1): las menciones del hilo se leen bajo la sesión de quien mira. Ana mencionó un lead suyo en dos conversaciones: Luis, que no lo ve,
// lee «No tienes acceso a este lead» (el nombre no está ni en el DOM) y su drawer no abre datos; la dueña ve el nombre, abre el drawer sin salir del
// chat y recargar lo mantiene. Un token a algo que no existe se lee como «sin acceso».
test.describe.configure({ mode: 'serial' })

let t: TerrenoDeMenciones

test.beforeAll(async ({}, info) => {
  t = await prepararMenciones(info.project.name)
})

test.afterAll(async () => {
  await limpiarMenciones()
})

test('E2E: quien no ve el lead lee el placeholder y el drawer no abre datos', async ({ page }) => {
  await entrar(page, t.luis.email)
  await page.goto(`/chat?c=${t.conLuis}`)
  const hilo = page.getByRole('log', { name: 'Mensajes' })
  const chip = hilo.getByRole('button', { name: 'No tienes acceso a este lead' })
  await expect(chip).toBeVisible()
  await expect(hilo.getByText('Revisa')).toBeVisible()
  // Ni el nombre ni el id: el DOM entero no los trae.
  await expect(page.getByText(NOMBRE_VISIBLE_DEL_LEAD)).toHaveCount(0)
  await expect(page.locator(`[href*="${t.leadId}"]`)).toHaveCount(0)

  await chip.click()
  await expect(page).toHaveURL(new RegExp(`mencion=lead(%3A|:)${t.leadId}`))
  const drawer = page.getByRole('dialog', { name: 'No tienes acceso a este lead' })
  await expect(drawer).toBeVisible()
  await expect(drawer.getByText('Pídele a quien lo tiene que te lo comparta.')).toBeVisible()
  await expect(drawer.getByRole('link')).toHaveCount(0)
  await expect(drawer.getByText(NOMBRE_VISIBLE_DEL_LEAD)).toHaveCount(0)
})

test('E2E: la dueña ve el nombre, abre el drawer sin salir del chat y recargar lo mantiene', async ({
  page,
}) => {
  await entrar(page, t.duena.email)
  await page.goto(`/chat?c=${t.conLaDuena}`)
  const hilo = page.getByRole('log', { name: 'Mensajes' })
  const chip = hilo.getByRole('button', { name: `Abrir lead ${NOMBRE_VISIBLE_DEL_LEAD}` })
  await expect(chip).toBeVisible()
  await expect(chip).toContainText(`#${NOMBRE_VISIBLE_DEL_LEAD}`)

  await chip.click()
  await expect(page).toHaveURL(new RegExp(`/chat\\?c=${t.conLaDuena}&mencion=`))
  const drawer = page.getByRole('dialog', { name: NOMBRE_VISIBLE_DEL_LEAD })
  await expect(drawer).toBeVisible()
  await expect(drawer.getByRole('link', { name: 'Abrir en Leads' })).toHaveAttribute(
    'href',
    `/leads?lead=${t.leadId}`,
  )

  await page.reload()
  await expect(page.getByRole('dialog', { name: NOMBRE_VISIBLE_DEL_LEAD })).toBeVisible()
  await page
    .getByRole('dialog')
    .locator('[data-pie-de-panel]')
    .getByRole('button', { name: 'Cerrar' })
    .click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page).not.toHaveURL(/mencion=/)
})

test('E2E: una mención a algo que no existe se lee como sin acceso', async ({ page }) => {
  await entrar(page, t.duena.email)
  await page.goto(`/chat?c=${t.conLaDuena}`)
  const hilo = page.getByRole('log', { name: 'Mensajes' })
  await expect(hilo.getByRole('button', { name: 'No tienes acceso a este vehículo' })).toBeVisible()
  await expect(hilo.getByText(t.vehiculoInexistente)).toHaveCount(0)
})
