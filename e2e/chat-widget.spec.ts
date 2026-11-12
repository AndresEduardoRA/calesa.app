import { expect, test } from './soporte/prueba'
import { abrirConN, dialogo, entrar } from './soporte/alta'
import { esMovil } from './soporte/inventario'
import {
  escribirEnElHilo,
  limpiarChat,
  prepararChat,
  sembrarMensaje,
  type TerrenoDelChat,
} from './soporte/chat'
import { borrarLeadsDePrueba, crearLead } from './soporte/leads'
import { codigoDePaisDeLaEmpresa, fijarCatalogosDeLead, telefonoAlAzar } from './soporte/leads-alta'
import { sql } from './soporte/sql'

// «Escribirle por chat» (7.11-2): el aviso «Lo tiene X» del alta lleva a `/chat?con=<X>`, que abre la directa que ya existe; si la base niega la
// conversación, la pantalla lo dice y no pierde la lista.
// El widget flotante del chat (7.11-1): fuera de `/chat`, la burbuja dice cuántos mensajes hay sin leer (la entrada «Chat» de la barra lateral también), se abre
// y se responde sin salir de la pantalla (la URL no cambia); sin `chat.participar` no hay burbuja ni entrada. En el celular la burbuja es un enlace a `/chat`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelChat
let restaurar = async () => {}

test.beforeAll(async ({}, info) => {
  // Ana crea leads (el alta le avisa de quién es un teléfono) y Luis es quien tiene uno.
  t = await prepararChat(info.project.name, {
    // `leads.ver` sólo de los propios: si Ana viera el de Luis, el aviso diría «Ya existe» y no «Lo tiene Luis».
    permisosDeAna: ['chat.participar', { clave: 'leads.ver', alcance: 'propios' }, 'leads.crear'],
    permisosDeLuis: ['chat.participar', { clave: 'leads.ver', alcance: 'propios' }, 'leads.crear'],
  })
  restaurar = await fijarCatalogosDeLead()
  // La siembra deja a Ana con dos directas sin leer: se marcan leídas para partir de cero.
  sql(
    `update public.conversaciones_miembros set ultimo_leido_en = now() where usuario_id = '${t.ana.id}'`,
  )
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await limpiarChat()
  await restaurar()
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

test('«Escribirle por chat» desde el alta abre la directa con quien tiene el lead', async ({
  page,
}) => {
  test.skip(esMovil(page), 'El alta con la tecla N es de escritorio.')
  const nacional = telefonoAlAzar()
  await crearLead({
    nombre: 'Chat del alta',
    telefono: `${await codigoDePaisDeLaEmpresa()}${nacional}`,
    deQuien: t.luis.email,
  })
  await entrar(page, t.ana.email)
  await page.goto('/leads')
  await abrirConN(page)
  const panel = dialogo(page)
  await panel.getByLabel('Teléfono principal').fill(nacional)
  await expect(panel.getByText(`Lo tiene ${t.luis.nombre}.`)).toBeVisible()

  await panel.getByRole('link', { name: 'Escribirle por chat' }).click()
  // Es la directa que ya existía con Luis: no se crea otra.
  await expect(page).toHaveURL(new RegExp(`/chat\\?c=${t.conLuis}$`))
  await expect(page.getByText('Hola Ana, ¿viste el contenedor?')).toBeVisible()
})

test('/chat?con= con alguien que no puede usar el chat lo dice y deja la lista', async ({
  page,
}) => {
  await entrar(page, t.ana.email)
  await page.goto(`/chat?con=${t.sofia.id}`)
  await expect(page.getByRole('alert').filter({ hasText: 'Esa persona' })).toHaveText(
    /Esa persona no puede usar el chat\./,
  )
  await expect(page).toHaveURL(new RegExp(`con=${t.sofia.id}`))
  // La pantalla de siempre sigue debajo: sus conversaciones.
  await expect(page.getByRole('link', { name: new RegExp(t.duena.nombre) })).toBeVisible()
})
