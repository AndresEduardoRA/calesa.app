import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import {
  guardarConElAtajo,
  limpiarGuardado,
  prepararGuardado,
  tarjetaGuardada,
  tipearEnLaHoja,
  totalDeLaHoja,
  vigilarGuardados,
} from './soporte/cotizar-guardar'
import { crearOrigenDeCotizar } from './soporte/cotizar-formula'
import { crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { aLaVistaSinDesplazar, sinScrollHorizontal, textoGrandeAlCargar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// El panel del cliente de la hoja de cotizar (paso 4.14-3b, `docs/UX.md` › «Cotizar»): la barra «Cliente» sobre la hoja abre `?panel=cliente`, con «míos» por lo más reciente (el
// último seguimiento o el alta) en las pestañas «Todos», «Prospecto» y «Cliente», por cursor y sin pedirle la página al servidor; con 3 letras o `#n`, la búsqueda entre los leads que
// quien mira ve. Elegir pone el lead en la URL de la hoja y cierra el panel; «Quitar» lo saca; elegir conserva lo tipeado (P1). Con el panel abierto, Ctrl+S no guarda la hoja de detrás.
test.describe.configure({ mode: 'serial' })

// Presupuestos previos (`docs/RENDIMIENTO.md`, panel del cliente): una fila ≈ 12 nodos × 20 + las pestañas, el buscador y el elegido ≈ 320 nodos; una fila de la respuesta ≈ 280 bytes × 21 ≈ 6.000.
// Lo medido (4.14-3b, 20 filas, en los dos proyectos): 151 nodos y 5.030 bytes. El tope es lo medido más un 5 % (el criterio del panel del vehículo).
const TOPE_DE_NODOS = 159
const TOPE_DE_BYTES = 5_282

let origenId = ''
let sinFormula = { id: '', nombre: '' }
let duena = ''
let propio = { id: '', nombre: '', numero: '' }
// Lo sembrado: 25 leads «panelcli 01» (el más reciente) a «panelcli 25», con tres de la clase cliente (03, 07, 11), y el lead de la hoja, el más antiguo.
let nombreDelTipoCliente = ''

const nombreDe = (n: number): string => `panelcli ${String(n).padStart(2, '0')}`

test.beforeAll(async ({}, info) => {
  const preparado = await prepararGuardado(info.project.name, 'panelcli')
  origenId = preparado.origen.id
  duena = preparado.duena
  sinFormula = await crearOrigenDeCotizar(info.project.name, 'panelclisin', false)
  for (let n = 1; n <= 25; n++) {
    await crearLead({ nombre: nombreDe(n), telefono: telefonoAlAzar(), deQuien: duena })
  }
  nombreDelTipoCliente = sql(
    `select nombre from public.tipos_lead where clase = 'cliente' and activo order by orden limit 1`,
  )
  sql(`
    update public.leads set ultimo_seguimiento_en = now() - (substring(nombre from '\\d+$')::int) * interval '1 minute'
      where nombre like 'E2E panelcli %';
    update public.leads set tipo_lead_id = (select id from public.tipos_lead where clase = 'cliente' and activo order by orden limit 1)
      where nombre in ('E2E panelcli 03', 'E2E panelcli 07', 'E2E panelcli 11');
    update public.leads set ultimo_seguimiento_en = now() - interval '1 day' where id = ${literal(preparado.lead)}::uuid;`)
  const [id = '', nombre = '', numero = ''] = sql(
    `select id, nombre, numero from public.leads where id = ${literal(preparado.lead)}::uuid`,
  ).split('|')
  propio = { id, nombre, numero }
})

test.afterAll(async () => {
  await limpiarGuardado()
})

const barra = (page: Page): Locator => page.getByRole('button', { name: /^Cliente:/ })
const panel = (page: Page): Locator => page.getByRole('dialog', { name: 'Cliente', exact: true })
const filas = (page: Page): Locator =>
  panel(page).getByRole('list', { name: 'Leads' }).getByRole('listitem')
async function nombres(page: Page): Promise<string[]> {
  const textos = await filas(page).allTextContents()
  return textos.map((texto) => /panelcli \d\d|cotizar panelcli/.exec(texto)?.[0] ?? texto)
}
const serie = (desde: number, hasta: number) =>
  Array.from({ length: hasta - desde + 1 }, (_, i) => nombreDe(desde + i))

async function abrirLaHoja(page: Page, extra = ''): Promise<void> {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${origenId}${extra}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
}

// Los pedidos a la página que no son un prefetch: ir al servidor volvería a montar la hoja.
function vigilarIdasAlServidor(page: Page): string[] {
  const idas: string[] = []
  page.on('request', (pedido) => {
    const url = new URL(pedido.url())
    const cab = pedido.headers()
    if (url.pathname !== '/cotizaciones/nuevo' || cab['next-router-prefetch'] === '1') {
      return
    }
    if (pedido.isNavigationRequest() || url.searchParams.has('_rsc') || cab['rsc'] === '1') {
      idas.push(pedido.url())
    }
  })
  return idas
}

test('E2E «Todos»: lo más reciente primero, por cursor y sin ir al servidor; el tipo va como texto', async ({
  page,
}) => {
  await abrirLaHoja(page)
  await expect(barra(page)).toContainText('Selecciona un cliente')
  await barra(page).focus()
  const idas = vigilarIdasAlServidor(page)
  await page.keyboard.press('Enter')
  await expect(panel(page)).toBeVisible()
  await expect(panel(page).getByRole('tab', { name: 'Todos' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(filas(page)).toHaveCount(20)
  expect(await nombres(page)).toEqual(serie(1, 20))
  await expect(filas(page).filter({ hasText: nombreDe(3) })).toContainText(nombreDelTipoCliente)
  await panel(page).getByRole('button', { name: 'Siguiente' }).click()
  await expect(page).toHaveURL(/cursor=/)
  await expect(filas(page)).toHaveCount(6)
  expect(await nombres(page)).toEqual([...serie(21, 25), 'cotizar panelcli'])
  await panel(page).getByRole('button', { name: 'Anterior' }).click()
  await expect(filas(page)).toHaveCount(20)
  expect(await nombres(page)).toEqual(serie(1, 20))
  expect(idas).toEqual([])
})

test('E2E las pestañas por clase muestran sólo esa clase, también sin ir al servidor', async ({
  page,
}) => {
  await abrirLaHoja(page)
  await barra(page).click()
  const idas = vigilarIdasAlServidor(page)
  await panel(page).getByRole('tab', { name: 'Cliente' }).click()
  await expect(page).toHaveURL(/clase=cliente/)
  await expect(filas(page)).toHaveCount(3)
  expect(await nombres(page)).toEqual([nombreDe(3), nombreDe(7), nombreDe(11)])
  await panel(page).getByRole('tab', { name: 'Prospecto' }).click()
  await expect(filas(page)).toHaveCount(20)
  await expect(filas(page).filter({ hasText: nombreDe(3) })).toHaveCount(0)
  expect(idas).toEqual([])
})

test('E2E la búsqueda: por 3 letras, por #número, sin resultados y con menos de 3 letras', async ({
  page,
}) => {
  await abrirLaHoja(page)
  await barra(page).click()
  const campo = panel(page).getByRole('searchbox', { name: 'Buscar por nombre o número' })
  await campo.fill('panelcli 07')
  await expect(page).toHaveURL(/buscar=/)
  await expect(panel(page).getByRole('heading', { name: 'Resultados' })).toBeVisible()
  await expect(panel(page).getByRole('tab')).toHaveCount(0)
  expect(await nombres(page)).toEqual([nombreDe(7)])
  await campo.fill(`#${propio.numero}`)
  // El número también es el propio de otros leads de la dueña: el lead buscado está entre los resultados.
  await expect(filas(page).filter({ hasText: propio.nombre.replace(/^E2E /, '') })).toHaveCount(1)
  await campo.fill('zzqzz')
  await expect(panel(page)).toContainText(
    'Ningún lead que puedas ver tiene «zzqzz» en el nombre o ese número.',
  )
  await campo.fill('pa')
  await expect(panel(page)).toContainText('Escribe al menos 3 letras')
  await expect(panel(page).getByRole('tab', { name: 'Todos' })).toBeVisible()
})

test('E2E elegir cierra el panel y guarda con ese lead; «Quitar» lo saca; «atrás» no reabre el panel', async ({
  page,
}) => {
  const guardados = await vigilarGuardados(page)
  await abrirLaHoja(page)
  await barra(page).click()
  await filas(page)
    .filter({ hasText: nombreDe(5) })
    .getByRole('button')
    .click()
  const cinco = sql(`select id from public.leads where nombre = 'E2E ${nombreDe(5)}'`)
  await expect(page).toHaveURL(new RegExp(`lead=${cinco}`))
  expect(new URL(page.url()).searchParams.get('panel')).toBeNull()
  await expect(panel(page)).toBeHidden()
  await expect(barra(page)).toContainText(nombreDe(5))
  await expect(barra(page)).toBeFocused()
  await tipearEnLaHoja(page, 'pub', '100')
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  expect(guardados.pedidos.map((pedido) => pedido.leadId)).toEqual([cinco])
  await barra(page).click()
  await expect(panel(page).getByRole('region', { name: 'Elegido' })).toContainText(nombreDe(5))
  await expect(
    filas(page)
      .filter({ hasText: nombreDe(5) })
      .getByRole('button'),
  ).toHaveAttribute('aria-current', 'true')
  await panel(page).getByRole('button', { name: 'Quitar' }).click()
  await expect(barra(page)).toContainText('Selecciona un cliente')
  expect(new URL(page.url()).searchParams.get('lead')).toBeNull()
  for (const n of [1, 2]) {
    await barra(page).click()
    await filas(page)
      .filter({ hasText: nombreDe(n) })
      .getByRole('button')
      .click()
    await expect(barra(page)).toContainText(nombreDe(n))
  }
  await page.goBack()
  await expect(barra(page)).toContainText(nombreDe(1))
  await expect(panel(page)).toBeHidden()
})

test('E2E un lead de la URL que no se ve se suelta: la barra queda sin cliente y las pestañas de origen no lo llevan', async ({
  page,
}) => {
  await abrirLaHoja(page, '&lead=11111111-2222-4333-8444-555555555555')
  await expect(barra(page)).toContainText('Selecciona un cliente')
  const enlaces = page.getByRole('navigation', { name: 'Orígenes' }).getByRole('link')
  await expect(enlaces.first()).toBeVisible()
  for (const enlace of await enlaces.all()) {
    await expect(enlace).not.toHaveAttribute('href', /lead=/)
  }
})

test('E2E las pestañas son los orígenes donde se cotiza, con su nombre; cambiar de origen conserva el cliente', async ({
  page,
}) => {
  await abrirLaHoja(page, `&lead=${propio.id}`)
  const pestanas = page.getByRole('navigation', { name: 'Orígenes' })
  await expect(pestanas.getByRole('link', { name: sinFormula.nombre })).not.toHaveAttribute(
    'aria-current',
    'page',
  )
  await pestanas.getByRole('link', { name: sinFormula.nombre }).click()
  await expect(page).toHaveURL(new RegExp(`origen=${sinFormula.id}&lead=${propio.id}`))
  await expect(page.getByText(`Falta publicar la fórmula de ${sinFormula.nombre}`)).toBeVisible()
  await expect(pestanas.getByRole('link', { name: sinFormula.nombre })).toHaveAttribute(
    'aria-current',
    'page',
  )
})

test('E2E con el panel abierto, Ctrl+S no guarda la hoja de detrás', async ({ page }) => {
  const guardados = await vigilarGuardados(page)
  await abrirLaHoja(page, `&lead=${propio.id}`)
  await tipearEnLaHoja(page, 'pub', '100')
  await barra(page).click()
  await expect(filas(page)).toHaveCount(20)
  await guardarConElAtajo(page)
  await expect(panel(page)).toBeVisible()
  expect(guardados.pedidos).toHaveLength(0)
  await page.keyboard.press('Escape')
  await expect(panel(page)).toBeHidden()
})

test('E2E elegir el cliente conserva lo tipeado y lo avisa (P1)', async ({ page }) => {
  await abrirLaHoja(page)
  await tipearEnLaHoja(page, 'pub', '100')
  await expect(totalDeLaHoja(page)).toContainText('105,00')
  await barra(page).click()
  await filas(page)
    .filter({ hasText: nombreDe(4) })
    .getByRole('button')
    .click()
  await expect(barra(page)).toContainText(nombreDe(4))
  await expect(page.getByText('Recuperamos lo que habías escrito y no guardaste.')).toBeVisible()
  await expect(totalDeLaHoja(page)).toContainText('105,00')
})

test('E2E la barra va fuera de la hoja; el panel cabe en su presupuesto de nodos y bytes', async ({
  page,
}) => {
  await abrirLaHoja(page)
  await expect(page.locator('[data-hoja]').filter({ has: barra(page) })).toHaveCount(0)
  const respuesta = page.waitForResponse(
    (r) => new URL(r.url()).pathname === '/rest/v1/leads_cartera_vista',
  )
  await barra(page).click()
  const bytes = (await (await respuesta).body()).length
  await expect(filas(page)).toHaveCount(20)
  const nodos = await panel(page).evaluate((e) => e.querySelectorAll('*').length + 1)
  test.info().annotations.push({
    type: 'medido',
    description: `nodos ${String(nodos)}, bytes ${String(bytes)}`,
  })
  console.warn(`[panel del cliente] nodos ${String(nodos)}, bytes ${String(bytes)}`)
  expect(nodos).toBeLessThanOrEqual(TOPE_DE_NODOS)
  expect(bytes).toBeLessThanOrEqual(TOPE_DE_BYTES)
})

test('E2E al 200 % el panel no desplaza de costado y la fila enfocada se ve', async ({ page }) => {
  await textoGrandeAlCargar(page)
  await abrirLaHoja(page)
  await barra(page).click()
  await expect(filas(page)).toHaveCount(20)
  await sinScrollHorizontal(page)
  const fila = filas(page).nth(3).getByRole('button')
  await fila.focus()
  await aLaVistaSinDesplazar(fila, 'la fila enfocada del panel')
})
