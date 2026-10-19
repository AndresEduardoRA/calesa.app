import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { aLaVista } from './soporte/inventario'
import { crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import {
  PROPIO_BERTA,
  buscar,
  fila,
  irALeads,
  limpiarListado,
  prepararListado,
  sinResultados,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { capturar, sinScrollHorizontal, sinTextoCortado } from './soporte/recorrido'

// 5a-8: el nombre se busca con 3 letras o dígitos seguidos. Con 1 o 2 caracteres el listado no pide nada al servidor por nombre y el campo lo dice en
// una línea junto a él; con 3 o más, busca. Un número (`12`, `#5`) sigue buscando con menos. `?q=ab` en la URL tampoco busca ni cuenta como filtro.
// Corre en los dos proyectos: la línea tiene que caber en una sola línea al 100 % y al 200 % del texto, también en el celular.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  await crearLead({
    nombre: 'Zeta Uno',
    telefono: `${t.codigo}${telefonoAlAzar()}`,
    deQuien: t.personas.berta,
  })
})

test.afterAll(async () => {
  await limpiarListado(t)
})

const AVISO = 'Escribe al menos 3 letras'
const campoDeBusqueda = (page: Page): Locator =>
  page.getByRole('searchbox', { name: 'Buscar por nombre o número' })
const aviso = (page: Page): Locator => page.locator('[data-aviso-de-busqueda]')

// Los pedidos que Next hace al servidor para volver a dibujar `/leads` (RSC): lo que cuesta buscar.
function contarPedidosDelListado(page: Page): { cuantos: () => number; cuales: () => string[] } {
  const urls: string[] = []
  page.on('request', (pedido) => {
    const url = new URL(pedido.url())
    if (url.pathname === '/leads' && pedido.headers()['rsc'] === '1') {
      urls.push(`${url.search} (${pedido.method()})`)
    }
  })
  return { cuantos: () => urls.length, cuales: () => urls }
}

// Un texto en una sola línea: el rango de su contenido tiene un solo rectángulo (un renglón partido tendría dos).
async function enUnaSolaLinea(lugar: Locator): Promise<void> {
  const renglones = await lugar.evaluate((el) => {
    const rango = document.createRange()
    rango.selectNodeContents(el)
    return new Set([...rango.getClientRects()].map((r) => Math.round(r.top))).size
  })
  expect(renglones, 'la línea de la búsqueda ocupa un solo renglón').toBe(1)
}

for (const zoom of ['100', '200'] as const) {
  test(`al ${zoom} %: con 1 y 2 caracteres el campo lo dice en una línea y no busca; con 3 busca`, async ({
    page,
  }, info) => {
    await entrar(page, t.personas.berta)
    await irALeads(page)
    if (zoom === '200') {
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%'
      })
    }
    const pedidos = contarPedidosDelListado(page)
    const campo = campoDeBusqueda(page)
    await expect(fila(page, PROPIO_BERTA)).toBeVisible()
    await expect(aviso(page)).toHaveCount(0)
    const antes = pedidos.cuantos()

    // Una letra y dos: la línea, sin cortar, y nada para el servidor.
    for (const [escrito, caracteres] of [
      ['Z', 1],
      ['e', 2],
    ] as const) {
      await campo.pressSequentially(escrito, { delay: 60 })
      await expect(campo).toHaveValue('Zeta'.slice(0, caracteres))
      await expect(aLaVista(aviso(page))).toHaveText(AVISO)
      await enUnaSolaLinea(aviso(page))
      await sinTextoCortado(aviso(page))
      await sinScrollHorizontal(page)
      await capturar(page, info, `busqueda-con-${String(caracteres)}-${zoom}`)
    }
    // Pasada la espera de la URL, nada pidió la lista de nuevo y se sigue viendo toda.
    await page.waitForTimeout(900)
    expect(pedidos.cuales().slice(antes), 'pedidos al servidor con 1 y 2 caracteres').toEqual([])
    expect(new URL(page.url()).searchParams.get('q')).toBeNull()
    await expect(fila(page, PROPIO_BERTA)).toBeVisible()
    await expect(fila(page, 'Zeta Uno')).toBeVisible()
    await expect(page.getByRole('list', { name: 'Filtros activos' })).toHaveCount(0)

    // Con tres, busca: la URL lleva ?q=, la lista se filtra y la línea se va.
    await campo.pressSequentially('t', { delay: 60 })
    await expect(page).toHaveURL(/q=Zet/)
    await expect(fila(page, 'Zeta Uno')).toBeVisible()
    await expect(fila(page, PROPIO_BERTA)).toHaveCount(0)
    await expect(aviso(page)).toHaveCount(0)
    await capturar(page, info, `busqueda-con-3-${zoom}`)

    // De vuelta a dos: se quita ?q=, la lista vuelve entera y el campo conserva lo escrito con su línea.
    await campo.press('Backspace')
    await expect(page).not.toHaveURL(/[?&]q=/)
    await expect(fila(page, PROPIO_BERTA)).toBeVisible()
    await page.waitForTimeout(700)
    await expect(campo).toHaveValue('Ze')
    await expect(aLaVista(aviso(page))).toHaveText(AVISO)
  })
}

test('?q=ab por la URL no busca por nombre: la lista entera, la línea y ningún filtro activo', async ({
  page,
}) => {
  await entrar(page, t.personas.berta)
  await irALeads(page, buscar('ab'))
  await expect(campoDeBusqueda(page)).toHaveValue('ab')
  await expect(aLaVista(aviso(page))).toHaveText(AVISO)
  await expect(fila(page, PROPIO_BERTA)).toBeVisible()
  await expect(sinResultados(page)).toHaveCount(0)
  await expect(page.getByRole('list', { name: 'Filtros activos' })).toHaveCount(0)
  // Un término con comodines tampoco: «a_b» no tiene 3 letras seguidas.
  await irALeads(page, buscar('a_b'))
  await expect(aLaVista(aviso(page))).toHaveText(AVISO)
  await expect(fila(page, PROPIO_BERTA)).toBeVisible()
})

test('un número busca con 1 o 2 dígitos, con o sin #, y no dice nada', async ({ page }) => {
  await entrar(page, t.personas.berta)
  const numero = String(t.numeroPropioDeBerta)
  await irALeads(page)
  await campoDeBusqueda(page).fill(`#${numero}`)
  await expect(fila(page, PROPIO_BERTA)).toBeVisible()
  await expect(page).toHaveURL(/q=%23/)
  await expect(aviso(page)).toHaveCount(0)
  await irALeads(page, buscar(numero))
  await expect(fila(page, PROPIO_BERTA)).toBeVisible()
  await expect(aviso(page)).toHaveCount(0)
})
