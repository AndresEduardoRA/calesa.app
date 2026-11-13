import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'

// 9.10: la app se puede instalar. El manifest, el service worker real (el e2e corre sobre el build de producción, donde se
// registra) y la entrada «Instalar la app» del menú del usuario. Instalar de verdad no se puede en Chromium de pruebas: el
// `beforeinstallprompt` es un doble que cuenta las llamadas a `prompt()`.

let duena = ''

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-pwa-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Paula Pwa' })
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
})

const menuDeUsuario = (page: Page) => page.getByRole('button', { name: 'Menú de Paula Pwa' })

// El navegador avisa que puede instalar. Devuelve cuántas veces se llamó a `prompt()`.
async function avisarQuePuedeInstalar(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __prompts: number }
    w.__prompts = 0
    const evento = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: () => {
        w.__prompts += 1
        return Promise.resolve()
      },
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    })
    window.dispatchEvent(evento)
  })
  return () => page.evaluate(() => (window as unknown as { __prompts: number }).__prompts)
}

test('E2E el manifest dice el nombre, el inicio, la ventana propia, los íconos y los atajos', async ({
  request,
}) => {
  const respuesta = await request.get('/manifest.webmanifest')
  expect(respuesta.status()).toBe(200)
  const manifest = (await respuesta.json()) as {
    name: string
    id: string
    start_url: string
    display: string
    icons: { sizes: string; purpose?: string }[]
    shortcuts: { name: string; url: string }[]
  }
  expect(manifest.name.length).toBeGreaterThan(0)
  expect(manifest.id).toBe('/')
  expect(manifest.start_url).toBe('/')
  expect(manifest.display).toBe('standalone')
  const iconos = manifest.icons.map((icono) => `${icono.sizes}:${icono.purpose ?? 'any'}`)
  expect(iconos).toEqual(expect.arrayContaining(['192x192:any', '512x512:any', '512x512:maskable']))
  expect(manifest.shortcuts.map((atajo) => atajo.name)).toEqual(['Nuevo lead', 'Cotizar'])
})

test('E2E el service worker queda activo y se pide sin caché', async ({ page, request }) => {
  await entrar(page, duena, { fresco: true })
  const estado = await page.evaluate(async () => {
    const registro = await navigator.serviceWorker.ready
    return registro.active?.state ?? null
  })
  expect(estado).toBe('activated')
  const sw = await request.get('/sw.js')
  expect(sw.status()).toBe(200)
  expect(sw.headers()['cache-control']).toContain('no-cache')
})

test('E2E con el aviso del navegador, «Instalar la app» llama a prompt() una vez y desaparece', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const entrada = page.getByRole('menuitem', { name: 'Instalar la app' })
  let prompts: () => Promise<number> = () => Promise.resolve(0)
  // El navegador avisa una sola vez y en la prueba puede llegar antes de que el shell hidrate: se repite hasta que la entrada aparece.
  await expect(async () => {
    prompts = await avisarQuePuedeInstalar(page)
    if (!(await entrada.isVisible())) await menuDeUsuario(page).click()
    await expect(entrada).toBeVisible({ timeout: 1_000 })
  }).toPass()
  await entrada.click()
  await expect.poll(prompts).toBe(1)
  await menuDeUsuario(page).click()
  await expect(page.getByRole('menuitem', { name: 'Cerrar sesión' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Instalar la app' })).toHaveCount(0)
})

test('E2E sin el aviso del navegador, el menú no ofrece instalar', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await menuDeUsuario(page).click()
  await expect(page.getByRole('menuitem', { name: 'Cerrar sesión' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Instalar la app' })).toHaveCount(0)
})

test.describe('en un iPhone', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  })

  test('E2E la entrada explica «Compartir › Agregar a inicio»', async ({ page }) => {
    await entrar(page, duena, { fresco: true })
    await menuDeUsuario(page).click()
    await page.getByRole('menuitem', { name: 'Instalar la app' }).click()
    await expect(page.getByText(/toca Compartir y luego «Agregar a inicio»/)).toBeVisible()
  })
})

test('E2E el clic de una notificación enfoca la ventana abierta y navega a su ruta', async ({
  page,
  context,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/perfil')
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))
  const worker =
    context.serviceWorkers().find((sw) => sw.url().endsWith('/sw.js')) ??
    (await context.waitForEvent('serviceworker'))
  // El evento que el navegador despacha al tocar la notificación: sólo lleva lo que `sw.js` lee.
  // `focus()` exige el gesto de un clic real en la notificación: para un evento sintético Chromium lo rechaza
  // («Not allowed to focus a window»). Sólo ese método se sustituye durante el evento; `matchAll`, la elección de la
  // ventana y `navigate()` son los de `sw.js`.
  await worker.evaluate(async () => {
    const Cliente = (
      globalThis as unknown as { WindowClient: { prototype: { focus: () => unknown } } }
    ).WindowClient
    const focusReal = Cliente.prototype.focus
    Cliente.prototype.focus = function (this: unknown) {
      return Promise.resolve(this)
    }
    // `ExtendableEvent` no está en los tipos de DOM: es del worker.
    const Extensible = (globalThis as unknown as { ExtendableEvent: new (tipo: string) => Event })
      .ExtendableEvent
    const evento = Object.assign(new Extensible('notificationclick'), {
      notification: { close: () => undefined, data: { ruta: '/notificaciones' } },
    })
    globalThis.dispatchEvent(evento)
    // Se espera a que `sw.js` termine de navegar antes de devolver `focus` a su valor.
    await new Promise((listo) => setTimeout(listo, 1_500))
    Cliente.prototype.focus = focusReal
  })
  await expect(page).toHaveURL(/\/notificaciones$/)
})
