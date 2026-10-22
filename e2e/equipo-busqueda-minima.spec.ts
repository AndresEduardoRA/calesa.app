import { expect, test, type Locator, type Page } from './soporte/prueba'
import {
  borrarPersonasDePrueba,
  borrarPersonasSembradas,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  sembrarPersonas,
} from './soporte/base'
import { ingresar } from './soporte/pasos'
import { sinScrollHorizontal, sinTextoCortado } from './soporte/recorrido'

// 5a-31: la búsqueda del equipo pide 3 letras o dígitos seguidos, como la de leads (5a-8). Con 1 o 2 caracteres («z», «zq») el campo lo dice
// con el mismo texto que leads, «Escribe al menos 3 letras», en una línea, y no pide nada al servidor: la lista sigue entera. Con 3, busca.
// `?q=zq` en la URL tampoco filtra (la RPC lo ignora: `equipo_lista()` con menos de 3 devuelve la lista sin texto). Antes «zq» buscaba y, sin
// coincidencias, la base recorría todo el orden (172 ms con 100.000 personas). Corre en los dos proyectos, al 100 % y al 200 %.
test.describe.configure({ mode: 'serial' })

const CLAVE = 'una-clave-de-prueba-9'
const PREFIJO = 'Minima'
const SEMBRADAS = 120
const TOPE = 100
const ZETA = 'Zeta Busqueda Minima'
const AVISO = 'Escribe al menos 3 letras'
const BOTON_DE_PERSONA = /^(Acciones sobre|Más acciones de) /

let duena = ''

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-minima-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CLAVE, nombre: 'Dalia Minima' })
  sembrarPersonas(SEMBRADAS, PREFIJO)
  await crearPersona({
    email: correoDePrueba(`zeta-minima-${info.project.name}`),
    contrasena: CLAVE,
    nombre: ZETA,
    invitada: true,
  })
})

test.afterAll(async () => {
  borrarPersonasSembradas(PREFIJO)
  await borrarPersonasDePrueba()
})

const campo = (page: Page): Locator =>
  page.getByRole('searchbox', { name: 'Buscar por nombre o correo' })
const aviso = (page: Page): Locator => page.locator('[data-aviso-de-busqueda]')
const botones = (page: Page): Locator => page.getByRole('button', { name: BOTON_DE_PERSONA })

// Los pedidos que Next hace al servidor para volver a dibujar la lista (RSC): lo que cuesta buscar.
function contarPedidos(page: Page): { cuales: () => string[] } {
  const urls: string[] = []
  page.on('request', (pedido) => {
    const url = new URL(pedido.url())
    if (url.pathname === '/configuracion/equipo' && pedido.headers()['rsc'] === '1') {
      urls.push(`${url.search} (${pedido.method()})`)
    }
  })
  return { cuales: () => urls }
}

// Un texto en una sola línea: el rango de su contenido tiene un solo rectángulo.
async function enUnaSolaLinea(lugar: Locator): Promise<void> {
  const renglones = await lugar.evaluate((el) => {
    const rango = document.createRange()
    rango.selectNodeContents(el)
    return new Set([...rango.getClientRects()].map((r) => Math.round(r.top))).size
  })
  expect(renglones, 'el aviso ocupa un solo renglón').toBe(1)
}

async function entrar(page: Page, zoom: '100' | '200') {
  await page.goto('/ingreso')
  await ingresar(page, duena, CLAVE)
  await expect(page).toHaveURL('/')
  await page.goto('/configuracion/equipo')
  await expect(botones(page)).toHaveCount(TOPE)
  if (zoom === '200') {
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%'
    })
  }
}

// La línea del aviso, entera y sin desplazar la página.
async function avisoALaVista(page: Page) {
  await expect(aviso(page)).toHaveText(AVISO)
  await aviso(page).scrollIntoViewIfNeeded()
  await expect(aviso(page)).toBeInViewport()
  await enUnaSolaLinea(aviso(page))
  await sinTextoCortado(aviso(page))
  await sinScrollHorizontal(page)
}

for (const zoom of ['100', '200'] as const) {
  test(`al ${zoom} %: con 1 y 2 letras el campo lo dice y no busca; con 3 busca`, async ({
    page,
  }) => {
    await entrar(page, zoom)
    const pedidos = contarPedidos(page)
    await expect(aviso(page)).toHaveCount(0)

    // Una letra y dos: la línea, y nada para el servidor.
    for (const [escrito, valor] of [
      ['Z', 'Z'],
      ['e', 'Ze'],
    ] as const) {
      await campo(page).pressSequentially(escrito, { delay: 60 })
      await expect(campo(page)).toHaveValue(valor)
      await avisoALaVista(page)
    }
    // Pasada la espera de la URL (300 ms), nada pidió la lista de nuevo y se sigue viendo entera.
    await page.waitForTimeout(900)
    expect(pedidos.cuales(), 'pedidos al servidor con 1 y 2 letras').toEqual([])
    expect(new URL(page.url()).searchParams.get('q')).toBeNull()
    await expect(botones(page)).toHaveCount(TOPE)

    // Con tres, busca: la URL lleva ?q=, la lista se filtra y la línea se va.
    await campo(page).pressSequentially('t', { delay: 60 })
    await expect(page).toHaveURL(/q=Zet/)
    await expect(botones(page)).toHaveCount(1)
    await expect(page.getByText(ZETA, { exact: true }).first()).toBeVisible()
    await expect(aviso(page)).toHaveCount(0)

    // De vuelta a dos: se quita ?q=, la lista vuelve entera y el campo conserva lo escrito con su línea.
    await campo(page).press('Backspace')
    await expect(page).not.toHaveURL(/[?&]q=/)
    await expect(botones(page)).toHaveCount(TOPE)
    await expect(campo(page)).toHaveValue('Ze')
    await avisoALaVista(page)
  })

  test(`al ${zoom} %: «zq» sin coincidencias tampoco busca ni vacía la lista`, async ({ page }) => {
    await entrar(page, zoom)
    const pedidos = contarPedidos(page)
    await campo(page).pressSequentially('zq', { delay: 60 })
    await avisoALaVista(page)
    await page.waitForTimeout(900)
    expect(pedidos.cuales(), 'pedidos al servidor con «zq»').toEqual([])
    expect(new URL(page.url()).searchParams.get('q')).toBeNull()
    await expect(botones(page)).toHaveCount(TOPE)
    await expect(page.getByText('Nada coincide')).toHaveCount(0)
  })
}

test('«?q=zq» (o un comodín suelto) en la URL no filtra: la lista entera, con el aviso junto al campo', async ({
  page,
}) => {
  await entrar(page, '100')
  for (const q of ['zq', 'z', 'a b c', '%', '_', '\\', '"']) {
    await page.goto(`/configuracion/equipo?q=${encodeURIComponent(q)}`)
    await expect(botones(page), `«${q}»`).toHaveCount(TOPE)
    await expect(campo(page)).toHaveValue(q)
    await expect(aviso(page)).toHaveText(AVISO)
  }
})
