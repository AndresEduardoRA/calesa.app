import { expect, test, type Page } from './soporte/prueba'
import { abrirBanco, BANCO_DE_XCELL, RUTA_DEL_BANCO_DE_XCELL } from './soporte/banco'

// La XCell sola, hidratada, con un teclado de verdad (4.12-1). Lo que jsdom no reproduce: dónde cae el carácter que abre la edición, a quién va
// el foco con Tab, y qué hace el navegador con el keypress de un Enter. El banco no es una ruta de la app: `e2e/soporte/banco.ts`.

const abrir = (page: Page, opciones?: Parameters<typeof abrirBanco>[3]) =>
  abrirBanco(page, BANCO_DE_XCELL, RUTA_DEL_BANCO_DE_XCELL, opciones)

const valorDe = (page: Page, caso: string, parada = 0) =>
  page.locator(`[data-caso="${caso}"] [data-parada="${String(parada)}"]`)

const entradaDe = (page: Page, caso: string) => page.locator(`[data-caso="${caso}"] input`)

const emitidos = (page: Page) => page.evaluate(() => window.__emitidos)

// Quién tiene el foco, dicho por el caso del banco y su parada (o «entrada»).
const enfoque = (page: Page) =>
  page.evaluate(() => {
    const e = document.activeElement
    const caso = e?.closest('[data-caso]')?.getAttribute('data-caso') ?? null
    if (e instanceof HTMLInputElement) {
      return { caso, donde: 'entrada' }
    }
    return { caso, donde: e?.getAttribute('data-parada') ?? e?.tagName.toLowerCase() ?? null }
  })

test('tipear abre la edición con ese carácter y no lo duplica', async ({ page }) => {
  await abrir(page)
  await valorDe(page, 'normal').focus()
  await page.keyboard.press('5')
  await expect(entradaDe(page, 'normal')).toHaveValue('5')
  await page.keyboard.press('0')
  await expect(entradaDe(page, 'normal')).toHaveValue('50')
  await page.keyboard.press('Enter')
  await expect(entradaDe(page, 'normal')).toHaveCount(0)
  expect(await emitidos(page)).toEqual([['fees', 50]])
  // Enter confirmó y el foco volvió al valor: el keypress de ese Enter no lo vuelve a abrir.
  expect(await enfoque(page)).toEqual({ caso: 'normal', donde: '0' })
  await expect(entradaDe(page, 'normal')).toHaveCount(0)
  await expect(valorDe(page, 'normal')).toContainText('50')
})

test('Esc cancela y vuelve al valor, sin emitir', async ({ page }) => {
  await abrir(page)
  await valorDe(page, 'normal').focus()
  await page.keyboard.type('99')
  await page.keyboard.press('Escape')
  await expect(entradaDe(page, 'normal')).toHaveCount(0)
  await expect(valorDe(page, 'normal')).toContainText('1.234,57')
  expect(await enfoque(page)).toEqual({ caso: 'normal', donde: '0' })
  expect(await emitidos(page)).toEqual([])
})

test('Tab confirma y avanza de valor en valor, sin pasar por ↺, y llega a la deshabilitada', async ({
  page,
}) => {
  await abrir(page)
  await valorDe(page, 'modificado').focus()
  await page.keyboard.press('Enter')
  await page.keyboard.type('12')
  await page.keyboard.press('Tab')
  expect(await emitidos(page)).toEqual([['factor', 0.12]])
  // La que sigue es «modificado sin defecto», que también tiene ↺: Tab cae en su valor.
  expect(await enfoque(page)).toEqual({ caso: 'modificado-sin-defecto', donde: '0' })
  await page.keyboard.press('Tab')
  expect(await enfoque(page)).toEqual({ caso: 'deshabilitado', donde: '0' })
  await page.keyboard.press('Shift+Tab')
  expect(await enfoque(page)).toEqual({ caso: 'modificado-sin-defecto', donde: '0' })
  await expect(entradaDe(page, 'modificado')).toHaveCount(0)
})

test('en un par, Tab va del monto al porcentaje y después a la celda que sigue', async ({
  page,
}) => {
  await abrir(page)
  await valorDe(page, 'par').focus()
  await page.keyboard.press('Tab')
  expect(await enfoque(page)).toEqual({ caso: 'par', donde: '1' })
  await page.keyboard.type('13')
  await page.keyboard.press('Tab')
  expect(await emitidos(page)).toEqual([['iva_pct', 0.13]])
  expect(await enfoque(page)).toEqual({ caso: 'par-modificado', donde: '0' })
})

test('las flechas llegan a ↺ y Enter lo acciona; el foco vuelve al valor', async ({ page }) => {
  await abrir(page)
  await valorDe(page, 'modificado').focus()
  await page.keyboard.press('ArrowRight')
  expect(await enfoque(page)).toEqual({ caso: 'modificado', donde: '12' })
  await expect(page.locator('[data-caso="modificado"] [data-parada="12"]')).toHaveAttribute(
    'aria-label',
    'Volver al valor por defecto de Factor de depreciación',
  )
  await page.keyboard.press('ArrowLeft')
  expect(await enfoque(page)).toEqual({ caso: 'modificado', donde: '0' })
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  expect(await page.evaluate(() => window.__resets)).toEqual(['factor'])
  expect(await enfoque(page)).toEqual({ caso: 'modificado', donde: '0' })
})

test('un texto que no es un número no avanza: queda con su aviso', async ({ page }) => {
  await abrir(page)
  await valorDe(page, 'normal').focus()
  await page.keyboard.type('abc')
  await page.keyboard.press('Tab')
  expect(await enfoque(page)).toEqual({ caso: 'normal', donde: 'entrada' })
  await expect(page.locator('[data-caso="normal"] [role="alert"]')).toHaveText(
    'Escribe un número, por ejemplo 1234,5.',
  )
  await expect(entradaDe(page, 'normal')).toHaveValue('abc')
  await page.keyboard.press('Escape')
  expect(await emitidos(page)).toEqual([])
})

test('abrir y salir con Tab sin tocar nada no emite: 1234,567 y 14,94 %', async ({ page }) => {
  await abrir(page)
  await valorDe(page, 'normal').focus()
  await page.keyboard.press('Enter')
  await expect(entradaDe(page, 'normal')).toHaveValue('1234,567')
  await page.keyboard.press('Tab')
  await valorDe(page, 'par', 1).focus()
  await page.keyboard.press('Enter')
  await expect(entradaDe(page, 'par')).toHaveValue('14,94')
  await page.keyboard.press('Tab')
  expect(await emitidos(page)).toEqual([])
})

test('un clic afuera confirma lo escrito', async ({ page }) => {
  await abrir(page)
  await valorDe(page, 'normal').focus()
  await page.keyboard.type('77')
  await page.locator('[data-caso="vacio"] [data-parada="0"]').click()
  expect(await emitidos(page)).toEqual([['fees', 77]])
})

test('300 celdas: ninguna le roba el foco a la página y caben en el tope de nodos', async ({
  page,
}) => {
  await abrir(page, { modo: '300' })
  await expect(page.locator('[data-xcell]')).toHaveCount(300)
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true)
  const nodos = await page.evaluate(
    () => document.querySelectorAll('#banco [data-xcell], #banco [data-xcell] *').length,
  )
  // La mezcla del banco mide 2.688 (≈ 9 por celda; el peor estado, 15). Un nodo de más por celda son 300 y lo ve este tope.
  expect(nodos).toBeLessThanOrEqual(2800)
})
