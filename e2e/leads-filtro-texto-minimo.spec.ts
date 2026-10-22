import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { aLaVista } from './soporte/inventario'
import { crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import {
  PROPIO_BERTA,
  fila,
  irALeads,
  limpiarListado,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { capturar, sinScrollHorizontal, sinTextoCortado } from './soporte/recorrido'

// 4.03 (5a-9): el texto de un campo del layout se filtra con 3 letras o dígitos seguidos, como el nombre (5a-8). Con 1 o 2 el campo lo dice en una línea y no pide nada al
// servidor; con 3, filtra; una URL escrita a mano o una vista guardada vieja con menos no filtra y lo dice (el aviso de filtro descartado). Corre en los dos proyectos y al 100 %
// y al 200 % del texto: al 200 % el panel de filtros ya no cabe al costado y «Filtros» abre la hoja. Capturas: `E2E_CAPTURAS=e2e-capturas/4-03c/{antes,despues}`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
const VERDE = 'Zeta Verde'

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  // Berta ya tiene un lead de color «rojo»; éste es «verde».
  await crearLead({
    nombre: VERDE,
    telefono: `${t.codigo}${telefonoAlAzar()}`,
    deQuien: t.personas.berta,
    atributos: { e2e_color: 'verde' },
  })
})

test.afterAll(async () => {
  await limpiarListado(t)
})

const AVISO = 'Escribe al menos 3 letras'
const CLAVE = 'a.e2e_color'
const aviso = (page: Page): Locator => page.locator('[data-aviso-de-filtro]')

// El panel de filtros: al costado si cabe y, si no, la hoja que abre «Filtros» (el celular, o el escritorio con el texto al 200 %).
async function panel(page: Page): Promise<Locator> {
  const alCostado = page.getByRole('complementary', { name: 'Filtros' })
  if (await alCostado.isVisible()) {
    return alCostado
  }
  await page
    .getByRole('button', { name: /^Filtros/ })
    .filter({ visible: true })
    .click()
  const hoja = page.getByRole('dialog', { name: 'Filtros' })
  await expect(hoja).toBeVisible()
  return hoja
}

// Los pedidos que Next hace al servidor para volver a dibujar `/leads` (RSC): lo que cuesta filtrar.
function contarPedidosDelListado(page: Page): { cuales: () => string[]; cuantos: () => number } {
  const urls: string[] = []
  page.on('request', (pedido) => {
    const url = new URL(pedido.url())
    if (url.pathname === '/leads' && pedido.headers()['rsc'] === '1') {
      urls.push(`${url.search} (${pedido.method()})`)
    }
  })
  return { cuales: () => urls, cuantos: () => urls.length }
}

// Un texto en una sola línea: el rango de su contenido tiene un solo rectángulo.
async function enUnaSolaLinea(lugar: Locator): Promise<void> {
  const renglones = await lugar.evaluate((el) => {
    const rango = document.createRange()
    rango.selectNodeContents(el)
    return new Set([...rango.getClientRects()].map((r) => Math.round(r.top))).size
  })
  expect(renglones, 'la línea del filtro ocupa un solo renglón').toBe(1)
}

for (const zoom of ['100', '200'] as const) {
  test(`al ${zoom} %: con 1 y 2 letras el campo lo dice en una línea y no filtra; con 3 filtra`, async ({
    page,
  }, info) => {
    await entrar(page, t.personas.berta)
    await irALeads(page)
    if (zoom === '200') {
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%'
      })
    }
    await expect(fila(page, PROPIO_BERTA)).toBeVisible()
    const filtros = await panel(page)
    const campo = filtros.getByLabel('Color E2E')
    await expect(aviso(page)).toHaveCount(0)
    const pedidos = contarPedidosDelListado(page)
    const antes = pedidos.cuantos()

    // Una letra y dos: la línea, sin cortar, y nada para el servidor.
    for (const [escrito, caracteres] of [
      ['v', 1],
      ['e', 2],
    ] as const) {
      await campo.pressSequentially(escrito, { delay: 60 })
      await expect(campo).toHaveValue('ver'.slice(0, caracteres))
      await expect(aLaVista(aviso(page))).toHaveText(AVISO)
      await enUnaSolaLinea(aviso(page))
      await sinTextoCortado(aviso(page))
      await sinScrollHorizontal(page)
      await capturar(page, info, `filtro-con-${String(caracteres)}-${zoom}`)
    }
    // Pasada la espera de la URL, nada pidió la lista de nuevo y se sigue viendo toda.
    await page.waitForTimeout(900)
    expect(pedidos.cuales().slice(antes), 'pedidos al servidor con 1 y 2 letras').toEqual([])
    expect(new URL(page.url()).searchParams.get(CLAVE)).toBeNull()

    // Con tres, filtra: la URL lleva la clave, la lista se filtra y la línea se va.
    await campo.pressSequentially('r', { delay: 60 })
    await expect(page).toHaveURL(/a\.e2e_color=ver/)
    await expect(aviso(page)).toHaveCount(0)
    await capturar(page, info, `filtro-con-3-${zoom}`)

    // De vuelta a dos: se quita la clave, el campo conserva lo escrito con su línea.
    await campo.press('Backspace')
    await expect(page).not.toHaveURL(/a\.e2e_color/)
    await page.waitForTimeout(700)
    await expect(campo).toHaveValue('ve')
    await expect(aLaVista(aviso(page))).toHaveText(AVISO)
    await capturar(page, info, `filtro-de-vuelta-a-2-${zoom}`)
  })
}

test('con 3 letras la lista sólo trae lo que coincide', async ({ page }) => {
  await entrar(page, t.personas.berta)
  await irALeads(page, `?${CLAVE}=ver`)
  await expect(fila(page, VERDE)).toBeVisible()
  await expect(fila(page, PROPIO_BERTA)).toHaveCount(0)
  await expect(page.getByRole('list', { name: 'Filtros activos' })).toBeVisible()
  await expect(aviso(page)).toHaveCount(0)
})

test('una URL escrita a mano con 2 letras no filtra, lo dice y «Entendido» la limpia', async ({
  page,
}, info) => {
  await entrar(page, t.personas.berta)
  await irALeads(page, `?${CLAVE}=ve`)
  await expect(
    page.getByText('Se quitó el filtro «Color E2E»: escribe al menos 3 letras.'),
  ).toBeVisible()
  // La lista entera y ningún filtro activo: lo corto no cuenta.
  await expect(fila(page, PROPIO_BERTA)).toBeVisible()
  await expect(fila(page, VERDE)).toBeVisible()
  await expect(page.getByRole('list', { name: 'Filtros activos' })).toHaveCount(0)
  await capturar(page, info, 'url-con-2-letras')
  await page.getByRole('button', { name: 'Entendido' }).click()
  await expect(page).not.toHaveURL(/a\.e2e_color/)
  await expect(page.getByText(/Se quitó el filtro «Color E2E»/)).toHaveCount(0)
})
