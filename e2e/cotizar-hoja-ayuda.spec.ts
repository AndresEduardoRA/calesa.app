import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarRolesDePrueba,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { AYUDA_DE_LA_HOJA, publicarFormulaConAvanzado } from './soporte/cotizar-avanzado'
import {
  escribirEnLaHoja,
  guardarConElAtajo,
  limpiarGuardado,
  prepararGuardado,
  tarjetaGuardada,
  vigilarGuardados,
} from './soporte/cotizar-guardar'
import { MARCA } from './soporte/cotizar-formula'
import { sinScrollHorizontal, sinTextoCortado, textoGrandeAlCargar } from './soporte/recorrido'

// La ayuda de texto de una celda de la hoja de cotizar (paso 4.13-4a, `docs/UX.md` › «Cotizar»): el botón «Ayuda de X» de la celda abre un panel de sólo lectura con su URL
// (`?ayuda=texto&nodo=<id>`) y, al cerrarlo, el foco vuelve a ese botón. La celda de la hoja (`pub`) y la de «Avanzado» (`x_celda`, que abre su ayuda encima del modal) tienen cada
// una la suya; la ayuda de una tabla es del 4.13-4c y la URL no abre lo que la hoja no muestra.
test.describe.configure({ mode: 'serial' })

let origen = { id: '', nombre: '' }
let duena = ''
let lead = ''
let todos = ''

const AYUDA_DE_AVANZADO = `AYUDA-${MARCA}`

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  ;({ origen, duena, lead } = await prepararGuardado(proyecto, 'ayuda'))
  publicarFormulaConAvanzado(origen.id)
  todos = correoDePrueba(`todos-ayuda-${proyecto}`)
  await crearPersona({ email: todos, contrasena: CONTRASENA, nombre: 'Tito Todos', invitada: true })
  await darRolDePrueba({
    email: todos,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Ve todos ${proyecto}`,
      clave: `e2e_ve_todos_ayuda_${proyecto}`,
    },
    permisos: ['cotizaciones.ver', 'cotizaciones.crear'],
  })
})

test.afterAll(async () => {
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

const url = (resto = '') => `/cotizaciones/nuevo?origen=${origen.id}&lead=${lead}${resto}`
const modal = (page: Page) => page.getByRole('dialog', { name: 'Avanzado' })
const panel = (page: Page, etiqueta: string) =>
  page.getByRole('dialog', { name: `Ayuda de ${etiqueta}` })
const botonDeAyuda = (page: Page, etiqueta: string) =>
  page.getByRole('button', { name: `Ayuda de ${etiqueta}` })
// El panel recibe el foco al terminar de abrirse: antes de eso un Esc todavía no es suyo.
const abiertaDeVerdad = (ayuda: Locator) =>
  expect(ayuda.getByRole('button', { name: 'Cerrar' })).toBeFocused()
const enLaUrl = (page: Page, clave: string) => new URL(page.url()).searchParams.get(clave)

// Una ausencia sólo vale con la página ya hidratada y su código diferido pedido: se espera a que una celda abra (eso necesita la hidratación) y a que la red quede quieta.
async function paginaQuieta(page: Page): Promise<void> {
  await expect(page.locator('[data-hoja]')).toBeVisible()
  await escribirEnLaHoja(page, 'pub', '1')
  await page.waitForLoadState('networkidle')
}

async function abrir(page: Page, destino = url()): Promise<void> {
  await entrar(page, duena, { fresco: true })
  await page.goto(destino)
  await expect(page.locator('[data-hoja]')).toBeVisible()
}

test('la ayuda de una celda de la hoja abre su texto con su URL; al cerrarla con Esc el foco vuelve a su botón', async ({
  page,
}) => {
  await abrir(page)
  await botonDeAyuda(page, 'Pública').click()
  await expect(panel(page, 'Pública')).toContainText(AYUDA_DE_LA_HOJA)
  expect(enLaUrl(page, 'ayuda')).toBe('texto')
  expect(enLaUrl(page, 'nodo')).toBe('pub')
  await abiertaDeVerdad(panel(page, 'Pública'))
  await page.keyboard.press('Escape')
  await expect(panel(page, 'Pública')).toBeHidden()
  expect(enLaUrl(page, 'ayuda')).toBeNull()
  await expect(botonDeAyuda(page, 'Pública')).toBeFocused()
})

test('recargada con su URL la ayuda se abre, y al cerrarla el foco vuelve al botón de su celda', async ({
  page,
}) => {
  await abrir(page, url('&ayuda=texto&nodo=pub'))
  await expect(panel(page, 'Pública')).toContainText(AYUDA_DE_LA_HOJA)
  await abiertaDeVerdad(panel(page, 'Pública'))
  await page.keyboard.press('Escape')
  await expect(panel(page, 'Pública')).toBeHidden()
  await expect(botonDeAyuda(page, 'Pública')).toBeFocused()
})

test('la ayuda de una celda de «Avanzado» se abre encima del modal: Esc cierra sólo la ayuda y el foco vuelve a su botón dentro del modal', async ({
  page,
}) => {
  await abrir(page)
  await page.locator('[data-avanzado]').getByRole('button').click()
  await expect(modal(page)).toBeVisible()
  await botonDeAyuda(page, `ETIQ-${MARCA}`).click()
  const ayuda = panel(page, `ETIQ-${MARCA}`)
  await expect(ayuda).toContainText(AYUDA_DE_AVANZADO)
  expect(enLaUrl(page, 'nodo')).toBe('x_celda')
  expect(enLaUrl(page, 'panel')).toBe('avanzado')
  await abiertaDeVerdad(ayuda)
  await page.keyboard.press('Escape')
  await expect(ayuda).toBeHidden()
  await expect(modal(page)).toBeVisible()
  await expect(botonDeAyuda(page, `ETIQ-${MARCA}`)).toBeFocused()
  expect(enLaUrl(page, 'ayuda')).toBeNull()
})

test('recargada con el modal y la ayuda en la URL, se abren los dos y Esc cierra primero la ayuda', async ({
  page,
}) => {
  await abrir(page, url('&panel=avanzado&ayuda=texto&nodo=x_celda'))
  await expect(panel(page, `ETIQ-${MARCA}`)).toContainText(AYUDA_DE_AVANZADO)
  // Con la ayuda encima, el modal queda detrás (oculto a los lectores de pantalla): se lo busca por su cuerpo.
  await expect(page.locator('[data-avanzado-cuerpo]')).toBeAttached()
  await abiertaDeVerdad(panel(page, `ETIQ-${MARCA}`))
  await page.keyboard.press('Escape')
  await expect(panel(page, `ETIQ-${MARCA}`)).toBeHidden()
  await expect(modal(page)).toBeVisible()
  await expect(botonDeAyuda(page, `ETIQ-${MARCA}`)).toBeFocused()
})

test('la URL no abre lo que la hoja no muestra: una celda de «Avanzado» con el modal cerrado, una de tabla, un id inventado', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  for (const nodo of ['x_celda', 'con_ayuda', 'no_existe']) {
    await page.goto(url(`&ayuda=texto&nodo=${nodo}`))
    await paginaQuieta(page)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page.getByText(AYUDA_DE_AVANZADO)).toHaveCount(0)
  }
})

test('quien no ve «Avanzado» no recibe su ayuda aunque la URL la nombre', async ({ page }) => {
  await entrar(page, todos, { fresco: true })
  await page.goto(url('&panel=avanzado&ayuda=texto&nodo=x_celda'))
  await paginaQuieta(page)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText(AYUDA_DE_AVANZADO)
})

test('Ctrl+S con la ayuda abierta guarda; guardada, la URL queda sin la ayuda y «Cotizar otra» vuelve sin ella', async ({
  page,
}) => {
  const guardados = await vigilarGuardados(page)
  await abrir(page)
  await botonDeAyuda(page, 'Pública').click()
  await expect(panel(page, 'Pública')).toBeVisible()
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  expect(guardados.pedidos).toHaveLength(1)
  await expect.poll(() => enLaUrl(page, 'ayuda')).toBeNull()
  expect(enLaUrl(page, 'nodo')).toBeNull()
  await page.getByRole('button', { name: 'Cotizar otra' }).click()
  await expect(page.locator('[data-hoja]')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

for (const zoom of [100, 200]) {
  test(`la ayuda al ${String(zoom)} %: no desplaza de costado, no corta nada y el texto se parte`, async ({
    page,
  }) => {
    if (zoom === 200) {
      await textoGrandeAlCargar(page)
    }
    await abrir(page, url('&ayuda=texto&nodo=pub'))
    await expect(panel(page, 'Pública')).toContainText(AYUDA_DE_LA_HOJA)
    await sinScrollHorizontal(page)
    await sinTextoCortado(panel(page, 'Pública'))
  })
}
