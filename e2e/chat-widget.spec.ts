import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { esMovil } from './soporte/inventario'
import {
  escribirEnElHilo,
  limpiarChat,
  prepararChat,
  sembrarMensaje,
  type TerrenoDelChat,
} from './soporte/chat'
import { sql } from './soporte/sql'

// El widget flotante del chat (7.11-1): fuera de `/chat`, la burbuja dice cuántos mensajes hay sin leer (la entrada «Chat» de la barra lateral también), se abre
// y se responde sin salir de la pantalla (la URL no cambia); sin `chat.participar` no hay burbuja ni entrada. En el celular la burbuja es un enlace a `/chat`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelChat

test.beforeAll(async ({}, info) => {
  t = await prepararChat(info.project.name, { permisosDeAna: ['chat.participar', 'leads.ver'] })
  // La siembra deja a Ana con dos directas sin leer: se marcan leídas para partir de cero.
  sql(
    `update public.conversaciones_miembros set ultimo_leido_en = now() where usuario_id = '${t.ana.id}'`,
  )
})

test.afterAll(async () => {
  await limpiarChat()
})

test('en /leads llega un mensaje: la burbuja dice «1», se abre y se responde sin salir', async ({
  page,
}) => {
  test.skip(esMovil(page), 'En el celular la burbuja es un enlace a /chat (otro test).')
  await entrar(page, t.ana.email)
  await page.goto('/leads')
  const burbuja = page.getByRole('button', { name: /^Chat/ })
  await expect(burbuja).toBeVisible()
  await expect(burbuja).toHaveAccessibleName('Chat')

  sembrarMensaje(t.conLuis, t.luis.id, 'Ya llegó el contenedor')

  await expect(burbuja).toHaveAccessibleName('Chat, 1 sin leer', { timeout: 20_000 })
  await expect(
    page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: /^Chat/ }),
  ).toHaveAccessibleName('Chat 1 sin leer')

  await burbuja.click()
  const panel = page.getByRole('dialog', { name: 'Chat' })
  await expect(panel).toBeVisible()
  await panel.getByRole('button', { name: new RegExp(t.luis.nombre) }).click()
  await expect(panel.getByText('Ya llegó el contenedor')).toBeVisible()

  await escribirEnElHilo(page, 'Visto, gracias')
  await expect(panel.getByText('Visto, gracias')).toBeVisible()
  await expect(page).toHaveURL(/\/leads$/)
  await expect
    .poll(() =>
      sql(
        `select count(*) from public.mensajes where conversacion_id = '${t.conLuis}' and autor_id = '${t.ana.id}' and cuerpo = 'Visto, gracias'`,
      ),
    )
    .toBe('1')

  // Abrir el hilo lo marcó leído: el contador vuelve a cero.
  await expect(burbuja).toHaveAccessibleName('Chat', { timeout: 20_000 })
  await expect(
    page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: /^Chat/ }),
  ).toHaveAccessibleName('Chat')

  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(burbuja).toBeFocused()
})

test('en el celular la burbuja es un enlace a /chat', async ({ page }) => {
  test.skip(!esMovil(page), 'Sólo en el celular.')
  await entrar(page, t.ana.email)
  await page.goto('/leads')
  await page.getByRole('link', { name: /^Chat/ }).first().click()
  await expect(page).toHaveURL(/\/chat$/)
})

test('sin chat.participar no hay burbuja ni entrada «Chat»', async ({ page }) => {
  await entrar(page, t.sofia.email)
  await page.goto('/perfil')
  // La pantalla ya dibujó su marco: la barra lateral (escritorio) o el botón del menú (celular).
  await expect(
    esMovil(page)
      ? page.getByRole('button', { name: 'Abrir el menú' })
      : page.getByRole('navigation', { name: 'Principal' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: /^Chat/ })).toHaveCount(0)
  await expect(page.getByRole('link', { name: /^Chat/ })).toHaveCount(0)
})
