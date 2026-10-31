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
import { crearOrigenDeSubastaDeCotizar } from './soporte/cotizar-formula'
import { aLaVistaSinDesplazar, sinScrollHorizontal, textoGrandeAlCargar } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// El panel del vehículo de la hoja de cotizar (paso 4.14-2a, `docs/UX.md` › «Cotizar»): la barra sobre la hoja abre `?panel=vehiculo`, con «Últ. cotización» y, en un origen de
// subasta, «Cierre subasta» (las abiertas o en vivo que cierran desde hace 24 h, P5), por cursor y sin pedirle la página al servidor. Elegir pone el vehículo en la URL de la
// hoja y cierra el panel (P2); «atrás» no lo reabre. Con el panel abierto, Ctrl+S no guarda la hoja de detrás.
test.describe.configure({ mode: 'serial' })

// Presupuestos previos (`docs/RENDIMIENTO.md`, panel del vehículo): una tarjeta ≈ 13 nodos (15 sin foto, con el `<svg>` del icono), 16 con holgura, × 20 = 320, más ≈ 50 de
// estructura = 370; una fila de la respuesta ≈ 450 bytes × 21 ≈ 9.500, 12.000 con holgura. Lo medido que pasa el presupuesto para el paso; lo que cabe fija el tope en lo
// medido más un 5 %, con techo en el presupuesto. Medido en el 4.14-2a, con 20 tarjetas sin foto y en los dos proyectos: 284 nodos y 4.660 bytes.
const TOPE_DE_NODOS = 299
const TOPE_DE_BYTES = 4_900

let subasta = { id: '', nombre: '' }
let manual = { id: '', nombre: '' }
let duena = ''
let lead = ''

// Lo sembrado en el origen de subasta, por SQL (el cierre sale de `estado_subasta` y `subasta_fin_en`: la columna generada no se escribe). 30 cotizados, del 01 (el más
// reciente) al 30; uno nunca cotizado y creado último (si la lectura no filtrara los nulos, iría primero); una abierta que cerró hace 2 h (entra por el margen) y otra hace
// 30 h (no); una terminada que cierra en 1 h (no está viva); y 22 vivas que cierran en las próximas horas, de la 01 a la 22.
function sembrar(origenId: string): void {
  const o = `${literal(origenId)}::uuid`
  sql(`
    insert into public.vehiculos (origen_id, titulo, cotizado_en, creado_en)
      select ${o}, 'Panel cot ' || lpad(g::text, 2, '0'), now() - g * interval '1 minute', now() - interval '1 day'
        from generate_series(1, 30) g;
    insert into public.vehiculos (origen_id, titulo, creado_en) values (${o}, 'Panel nunca', now() + interval '1 hour');
    insert into public.vehiculos (origen_id, titulo, estado_subasta, subasta_fin_en) values
      (${o}, 'Panel cerró hace 2 h', 'abierta', now() - interval '2 hours'),
      (${o}, 'Panel cerró hace 30 h', 'abierta', now() - interval '30 hours'),
      (${o}, 'Panel terminada', 'terminada', now() + interval '1 hour');
    insert into public.vehiculos (origen_id, titulo, estado_subasta, subasta_fin_en)
      select ${o}, 'Panel cierra ' || lpad(g::text, 2, '0'), (case when g % 2 = 0 then 'en_vivo' else 'abierta' end)::public.estado_subasta,
             now() + g * interval '1 hour'
        from generate_series(1, 22) g;`)
}

const idDe = (titulo: string): string =>
  sql(
    `select id from public.vehiculos where origen_id = ${literal(subasta.id)}::uuid and titulo = ${literal(titulo)}`,
  )

test.beforeAll(async ({}, info) => {
  ;({ origen: manual, duena, lead } = await prepararGuardado(info.project.name, 'panelveh'))
  subasta = await crearOrigenDeSubastaDeCotizar(info.project.name, 'panelsub')
  sembrar(subasta.id)
})

test.afterAll(async () => {
  await limpiarGuardado()
})

const barra = (page: Page): Locator => page.getByRole('button', { name: /^Vehículo:/ })
const panel = (page: Page): Locator => page.getByRole('dialog', { name: 'Vehículo' })
const tarjetas = (page: Page): Locator =>
  panel(page).getByRole('list', { name: 'Vehículos' }).getByRole('listitem')
const TITULO = /Panel (?:cot \d\d|nunca|cierra \d\d|cerró hace \d+ h|terminada)/
async function titulos(page: Page): Promise<string[]> {
  const textos = await tarjetas(page).allTextContents()
  return textos.map((texto) => TITULO.exec(texto)?.[0] ?? texto)
}
const serie = (prefijo: string, desde: number, hasta: number) =>
  Array.from(
    { length: hasta - desde + 1 },
    (_, i) => `${prefijo} ${String(desde + i).padStart(2, '0')}`,
  )

async function abrirLaHoja(page: Page, origenId: string, extra = ''): Promise<void> {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${origenId}&lead=${lead}${extra}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
}

// Los pedidos a la página que no son un prefetch: ir al servidor (el documento o su RSC) volvería a montar la hoja.
function vigilarIdasAlServidor(page: Page): string[] {
  const idas: string[] = []
  page.on('request', (pedido) => {
    const url = new URL(pedido.url())
    const encabezados = pedido.headers()
    if (url.pathname !== '/cotizaciones/nuevo' || encabezados['next-router-prefetch'] === '1') {
      return
    }
    if (
      pedido.isNavigationRequest() ||
      url.searchParams.has('_rsc') ||
      encabezados['rsc'] === '1'
    ) {
      idas.push(pedido.url())
    }
  })
  return idas
}

test('E2E «Últ. cotización»: de la más reciente, por cursor y sin ir al servidor', async ({
  page,
}) => {
  await abrirLaHoja(page, subasta.id)
  await expect(barra(page)).toContainText('Selecciona un vehículo')
  await barra(page).focus()
  const idas = vigilarIdasAlServidor(page)
  await page.keyboard.press('Enter')
  await expect(panel(page)).toBeVisible()
  await expect(panel(page).getByRole('tab', { name: 'Últ. cotización' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(tarjetas(page)).toHaveCount(20)
  expect(await titulos(page)).toEqual(serie('Panel cot', 1, 20))
  await panel(page).getByRole('button', { name: 'Siguiente' }).click()
  await expect(page).toHaveURL(/cursor=/)
  await expect(tarjetas(page)).toHaveCount(10)
  expect(await titulos(page)).toEqual(serie('Panel cot', 21, 30))
  await panel(page).getByRole('button', { name: 'Anterior' }).click()
  await expect(tarjetas(page)).toHaveCount(20)
  expect(await titulos(page)).toEqual(serie('Panel cot', 1, 20))
  await expect(panel(page)).not.toContainText('Página')
  await expect(panel(page)).not.toContainText('Panel nunca')
  expect(idas).toEqual([])
})

test('E2E «Cierre subasta»: la que cerró hace poco primero, después la más próxima; ni la vieja ni la terminada', async ({
  page,
}) => {
  await abrirLaHoja(page, subasta.id)
  await barra(page).click()
  await panel(page).getByRole('tab', { name: 'Cierre subasta' }).click()
  await expect(page).toHaveURL(/lista=cierre/)
  await expect(tarjetas(page).first()).toContainText('Panel cerró hace 2 h')
  await expect(tarjetas(page)).toHaveCount(20)
  expect(await titulos(page)).toEqual(['Panel cerró hace 2 h', ...serie('Panel cierra', 1, 19)])
  await expect(tarjetas(page).first()).toContainText('Cierra')
  await panel(page).getByRole('button', { name: 'Siguiente' }).click()
  await expect(tarjetas(page)).toHaveCount(3)
  expect(await titulos(page)).toEqual(serie('Panel cierra', 20, 22))
  await expect(panel(page)).not.toContainText('Panel cerró hace 30 h')
  await expect(panel(page)).not.toContainText('Panel terminada')
})

test('E2E elegir cierra el panel y guarda con ese vehículo; quitar lo saca; «atrás» no reabre el panel', async ({
  page,
}) => {
  const guardados = await vigilarGuardados(page)
  await abrirLaHoja(page, subasta.id)
  await barra(page).click()
  const elegida = tarjetas(page).filter({ hasText: 'Panel cot 05' }).getByRole('button')
  await elegida.focus()
  await page.keyboard.press('Enter')
  const cinco = idDe('Panel cot 05')
  await expect(page).toHaveURL(new RegExp(`vehiculo=${cinco}`))
  expect(new URL(page.url()).searchParams.get('panel')).toBeNull()
  await expect(panel(page)).toBeHidden()
  await expect(barra(page)).toContainText('Panel cot 05')
  await expect(barra(page)).toBeFocused()

  await tipearEnLaHoja(page, 'pub', '100')
  await expect(totalDeLaHoja(page)).toContainText('105,00')
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  expect(guardados.pedidos).toHaveLength(1)
  expect(
    sql(
      `select vehiculo_id from public.cotizaciones where lead_id = ${literal(lead)}::uuid order by creado_en desc limit 1`,
    ),
  ).toBe(cinco)

  await barra(page).click()
  await expect(panel(page).getByRole('region', { name: 'Elegido' })).toContainText('Panel cot 05')
  await expect(
    tarjetas(page).filter({ hasText: 'Panel cot 05' }).getByRole('button'),
  ).toHaveAttribute('aria-current', 'true')
  await expect(tarjetas(page).filter({ hasText: 'Panel cot 05' })).toContainText('Seleccionado')
  await panel(page).getByRole('button', { name: 'Quitar' }).click()
  await expect(panel(page)).toBeHidden()
  await expect(barra(page)).toContainText('Selecciona un vehículo')
  expect(new URL(page.url()).searchParams.get('vehiculo')).toBeNull()

  // Elegido el 01 y después el 02, «atrás» vuelve a la hoja del 01 sin el panel: elegir reemplaza la entrada de abrirlo.
  const uno = idDe('Panel cot 01')
  for (const titulo of ['Panel cot 01', 'Panel cot 02']) {
    await barra(page).click()
    await tarjetas(page).filter({ hasText: titulo }).getByRole('button').click()
    await expect(barra(page)).toContainText(titulo)
  }
  await page.goBack()
  await expect(page).toHaveURL(new RegExp(`vehiculo=${uno}`))
  expect(new URL(page.url()).searchParams.get('panel')).toBeNull()
  await expect(panel(page)).toBeHidden()
  await expect(barra(page)).toContainText('Panel cot 01')
})

test('E2E con el panel abierto, Ctrl+S no guarda la hoja de detrás', async ({ page }) => {
  const guardados = await vigilarGuardados(page)
  await abrirLaHoja(page, subasta.id)
  await tipearEnLaHoja(page, 'pub', '100')
  await expect(totalDeLaHoja(page)).toContainText('105,00')
  await barra(page).click()
  await expect(tarjetas(page)).toHaveCount(20)
  await guardarConElAtajo(page)
  await expect(panel(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(panel(page)).toBeHidden()
  // Con el panel cerrado, el atajo vuelve a ser de la hoja. Otro valor antes de guardar: si el Ctrl+S de recién hubiera guardado, éste no sería el único pedido (y
  // con lo mismo tipeado, la hoja ya guardada podría no mandar nada).
  await tipearEnLaHoja(page, 'pub', '200')
  await expect(totalDeLaHoja(page)).toContainText('205,00')
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  expect(guardados.pedidos.map((pedido) => pedido.entradas.inputs)).toEqual([{ pub: 200 }])
})

test('E2E la barra va fuera de la hoja; el panel cabe en su presupuesto de nodos y bytes', async ({
  page,
}) => {
  await abrirLaHoja(page, subasta.id)
  await expect(page.locator('[data-hoja]').filter({ has: barra(page) })).toHaveCount(0)
  const respuesta = page.waitForResponse((r) => new URL(r.url()).pathname === '/rest/v1/vehiculos')
  await barra(page).click()
  const bytes = (await (await respuesta).body()).length
  await expect(tarjetas(page)).toHaveCount(20)
  const nodos = await panel(page).evaluate((e) => e.querySelectorAll('*').length + 1)
  test.info().annotations.push({
    type: 'medido',
    description: `nodos ${String(nodos)}, bytes ${String(bytes)}`,
  })
  console.warn(`[panel del vehículo] nodos ${String(nodos)}, bytes ${String(bytes)}`)
  expect(nodos).toBeLessThanOrEqual(TOPE_DE_NODOS)
  expect(bytes).toBeLessThanOrEqual(TOPE_DE_BYTES)
})

test('E2E al 200 % el panel no desplaza de costado y la tarjeta enfocada se ve', async ({
  page,
}) => {
  await textoGrandeAlCargar(page)
  await abrirLaHoja(page, subasta.id)
  await barra(page).click()
  await expect(tarjetas(page)).toHaveCount(20)
  await sinScrollHorizontal(page)
  const tarjeta = tarjetas(page).nth(3).getByRole('button')
  await tarjeta.focus()
  await aLaVistaSinDesplazar(tarjeta, 'la tarjeta enfocada del panel')
})

test('E2E en un origen manual: sin «Cierre subasta», su vacío, y un error que se reintenta', async ({
  page,
}) => {
  await abrirLaHoja(page, manual.id)
  let fallar = true
  await page.route(
    (url) => url.pathname === '/rest/v1/vehiculos',
    async (ruta) => {
      if (fallar) {
        fallar = false
        await ruta.fulfill({ status: 500, body: '{"message":"caída de prueba"}' })
        return
      }
      await ruta.fallback()
    },
  )
  await barra(page).click()
  await expect(panel(page).getByRole('alert')).toContainText('No se pudieron cargar los vehículos.')
  await panel(page).getByRole('button', { name: 'Reintentar' }).click()
  await expect(panel(page)).toContainText('Todavía no se cotizó ningún vehículo de este origen.')
  await expect(panel(page).getByRole('tab', { name: 'Cierre subasta' })).toHaveCount(0)
  await expect(panel(page)).not.toContainText('Cierre subasta')
})
