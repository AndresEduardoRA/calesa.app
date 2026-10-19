import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { irAFicha, ponerExtras } from './soporte/leads-ficha'
import { abrirAgregarTelefono, nacional } from './soporte/leads-ficha-telefonos'
import { irALeads, nombre } from './soporte/leads-listado'
import { limpiarRecorrido, prepararRecorrido, type TerrenoDelRecorrido } from './soporte/recorrido'

// Los avisos con un panel abierto (cierre 2): con un modal abierto el aviso sigue en lo que el lector de pantalla lee (la región
// de avisos, `aria-live`, no queda bajo `aria-hidden` ni fuera del árbol de accesibilidad del navegador) y se alcanza con el teclado;
// y con el panel «Nuevo lead» abierto y algo escrito, la acción «Abrir ficha» de un aviso pregunta en el pie antes de irse.
test.describe.configure({ mode: 'serial' })

let r: TerrenoDelRecorrido

test.beforeAll(async ({}, info) => {
  r = await prepararRecorrido(info.project.name, 'AvisosPanel')
})

test.afterAll(async () => {
  await limpiarRecorrido(r)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('con un modal abierto, el aviso está en el árbol de accesibilidad y se alcanza con el teclado', async ({
  page,
}) => {
  await ponerExtras(r.dos.id, [{ telefono: `${r.t.codigo}${nacional()}`, etiqueta: 'Casa' }])
  await entrar(page, r.ana.email)
  await irAFicha(page, r.dos.id)
  await page.getByRole('button', { name: 'Quitar' }).click()
  await expect(
    page.locator('[data-sonner-toast]').filter({ hasText: 'Teléfono quitado.' }),
  ).toBeVisible()
  const modal = await abrirAgregarTelefono(page)
  await expect(modal).toBeVisible()

  // Lo que anuncia el lector: una región `aria-live`, sin un `aria-hidden` por encima.
  const region = page.getByRole('region', { name: /^Avisos/ })
  await expect(region).toHaveAttribute('aria-live', 'polite')
  const ocultoPorUnAncestro = await region.evaluate((el) => {
    for (let e: Element | null = el; e; e = e.parentElement) {
      if (e.getAttribute('aria-hidden') === 'true' || e.hasAttribute('inert')) {
        return true
      }
    }
    return false
  })
  expect(ocultoPorUnAncestro, 'la región de avisos está oculta para el lector').toBe(false)

  // El árbol de accesibilidad de verdad (el del navegador, no el de Playwright): el aviso y sus botones no están ignorados.
  const cdp = await page.context().newCDPSession(page)
  const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as {
    nodes: { role?: { value: string }; name?: { value: string }; ignored?: boolean }[]
  }
  const expuestos = (rol: string, texto: RegExp) =>
    nodes.some((n) => n.role?.value === rol && texto.test(n.name?.value ?? '') && !n.ignored)
  expect(expuestos('region', /^Avisos/), 'la región de avisos').toBe(true)
  expect(expuestos('button', /^Deshacer$/), 'el botón del aviso').toBe(true)
  expect(expuestos('button', /^Cerrar aviso$/), 'cerrar el aviso').toBe(true)
  expect(expuestos('StaticText', /^Teléfono quitado\.$/), 'el texto del aviso').toBe(true)

  // Con el teclado: Alt+T lleva a los avisos aunque el modal esté abierto, y Tab sigue hasta volver al modal.
  await page.keyboard.press('Alt+t')
  await expect
    .poll(() => page.evaluate(() => !!document.activeElement?.closest('[data-sonner-toaster]')))
    .toBe(true)
  const recorrido: boolean[] = []
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab')
    recorrido.push(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]')))
  }
  expect(recorrido.at(-1), 'el foco vuelve al modal').toBe(true)
})

async function abrirAlta(page: Page) {
  await irALeads(page)
  await expect(async () => {
    await page.getByRole('button', { name: 'Nuevo lead' }).click()
    await expect(page.getByRole('dialog', { name: 'Nuevo lead' })).toBeVisible({ timeout: 1000 })
  }).toPass()
  return page.getByRole('dialog', { name: 'Nuevo lead' })
}

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('«Abrir ficha» con el siguiente lead a medio escribir pregunta en el pie: «Seguir editando» no tira nada', async ({
  page,
}, info) => {
  await entrar(page, r.ana.email)
  const alta = await abrirAlta(page)
  await alta.getByLabel('Teléfono principal').fill(nacional())
  await alta.getByLabel('Nombre').fill(nombre(`Alta uno ${info.project.name}`))
  await page.keyboard.press('Control+s')
  const aviso = page.locator('[data-sonner-toast]').filter({ hasText: /Abrir ficha/ })
  await expect(aviso.getByRole('button', { name: 'Abrir ficha' })).toBeVisible()
  await expect(alta.getByLabel('Teléfono principal')).toHaveValue('')
  // Sin nada escrito, el aviso se pulsaría sin preguntar: acá el siguiente ya tiene teléfono.
  await alta.getByLabel('Teléfono principal').fill(nacional())
  const antes = page.url()
  await aviso.getByRole('button', { name: 'Abrir ficha' }).click()
  await expect(alta.getByText('Tienes cambios sin guardar.')).toBeVisible()
  await expect(alta.getByRole('button', { name: 'Seguir editando' })).toBeFocused()
  expect(page.url()).toBe(antes)
  await alta.getByRole('button', { name: 'Seguir editando' }).click()
  await expect(alta.getByText('Tienes cambios sin guardar.')).toHaveCount(0)
  await expect(alta.getByLabel('Teléfono principal')).not.toHaveValue('')
})

test('«Abrir ficha» y «Descartar»: se va a la ficha del lead nuevo y el formulario queda vacío', async ({
  page,
}, info) => {
  await entrar(page, r.ana.email)
  const alta = await abrirAlta(page)
  await alta.getByLabel('Teléfono principal').fill(nacional())
  await alta.getByLabel('Nombre').fill(nombre(`Alta dos ${info.project.name}`))
  await page.keyboard.press('Control+s')
  const aviso = page.locator('[data-sonner-toast]').filter({ hasText: /Abrir ficha/ })
  await expect(aviso.getByRole('button', { name: 'Abrir ficha' })).toBeVisible()
  await expect(alta.getByLabel('Teléfono principal')).toHaveValue('')
  await alta.getByLabel('Teléfono principal').fill(nacional())
  await aviso.getByRole('button', { name: 'Abrir ficha' }).click()
  await alta.getByRole('button', { name: 'Descartar' }).click()
  await expect(page).toHaveURL(/\/leads\/[0-9a-f-]{36}/)
  await expect(
    page.getByRole('heading', { name: nombre(`Alta dos ${info.project.name}`), level: 1 }),
  ).toBeVisible()
  // Lo descartado no vuelve: el próximo «Nuevo lead» empieza vacío.
  await irALeads(page)
  const otra = await abrirAlta(page)
  await expect(otra.getByLabel('Teléfono principal')).toHaveValue('')
})
