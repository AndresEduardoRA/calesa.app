import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { borrarRolesDePrueba } from './soporte/base'
import { limpiarGuardado } from './soporte/cotizar-guardar'
import { cerrarPanelDeFiltros, esMovil, panelDeFiltros } from './soporte/inventario'
import {
  TITULO_DOS,
  TITULO_UNO,
  crearVehiculoEn,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/listado-de-cotizaciones'
import { literal, sql } from './soporte/sql'

// El listado `/cotizaciones` (paso 4.16-4a, `docs/UX.md` › «Cotizaciones»): lo que ve cada quien (la RLS decide), sus filtros en la URL, la paginación por cursor, «Nueva
// cotización» y el filtro por vehículo. Todo se filtra por el origen de la prueba para no ver lo de otros specs. Sin resumen todavía (4.16-4b): el número de cada fila es el
// enlace a su página. El terreno (origen, personas, vehículos y cotizaciones sembradas) lo arma `soporte/listado-de-cotizaciones.ts`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

const filas = (page: Page): Locator =>
  page.locator('tbody tr, li article').filter({ visible: true })
const enElOrigen = (): string => `/cotizaciones?origen=${t.origen.id}`
const numeroDeLaVieja = (): string =>
  sql(
    `select numero from public.cotizaciones where origen_id = ${literal(t.origen.id)}::uuid and creado_en < now() - interval '5 days'`,
  )

async function irAlListado(page: Page, correo: string, consulta = ''): Promise<void> {
  await entrar(page, correo, { fresco: true })
  await page.goto(`${enElOrigen()}${consulta}`)
  await expect(filas(page).first()).toBeVisible()
}

async function elegir(page: Page, grupo: string, opcion: string): Promise<void> {
  const panel = await panelDeFiltros(page)
  await panel.getByRole('group', { name: grupo }).getByRole('radio', { name: opcion }).check()
  await cerrarPanelDeFiltros(page)
}

test('E1 la dueña ve Cotizaciones en el menú y cada fila con su cliente, vehículo, clase, total y vigencia', async ({
  page,
}) => {
  await entrar(page, t.duena, { fresco: true })
  if (esMovil(page)) {
    await page.getByRole('button', { name: 'Abrir el menú' }).click()
  }
  await page
    .getByRole('link', { name: 'Cotizaciones', exact: true })
    .filter({ visible: true })
    .click()
  await expect(page).toHaveURL(/\/cotizaciones$/)
  await page.goto(enElOrigen())
  await expect(filas(page)).toHaveCount(19)

  const vieja = filas(page).filter({ hasText: `N.º ${numeroDeLaVieja()}` })
  await expect(vieja).toContainText('Vencida')
  // Sin vehículo, «—»; el cliente es el de la cotización.
  await expect(vieja).toContainText(t.nombreDelLeadDeLaDuena)
  await expect(vieja).toContainText('—')

  const conVehiculo = filas(page).filter({ hasText: TITULO_UNO }).first()
  await expect(conVehiculo).toContainText(t.nombreDelLeadDeLaDuena)
  await expect(conVehiculo).toContainText('Preventa')
  await expect(conVehiculo).toContainText(t.origen.nombre)
  await expect(conVehiculo).toContainText('Vale hasta el')
  await expect(conVehiculo).toContainText('Gala Guarda')
  await expect(conVehiculo.getByText(/\d/).first()).toBeVisible()

  // El número lleva a la página de su cotización.
  await vieja.getByRole('link', { name: /^N\.º / }).click()
  await expect(page).toHaveURL(/\/cotizaciones\/[0-9a-f-]{36}$/)
})

test('E2 los filtros de Clase y Cuáles acotan la lista, «Limpiar» la devuelve y escribir un filtro vuelve a la primera página', async ({
  page,
}) => {
  await irAlListado(page, t.duena, '&por=10')
  await elegir(page, 'Clase', 'Final')
  await expect(page).toHaveURL(/clase=final/)
  await expect(filas(page)).toHaveCount(1)
  await expect(filas(page).first()).toContainText('Final')

  await page.getByRole('button', { name: 'Limpiar' }).click()
  await expect(page).not.toHaveURL(/clase=/)
  await expect(filas(page)).toHaveCount(10)

  // «Mías»: las de la dueña, ninguna de Ana.
  await elegir(page, 'Cuáles', 'Mías')
  await expect(page).toHaveURL(/cuales=mias/)
  await expect(filas(page)).toHaveCount(10)
  await expect(filas(page).filter({ hasText: 'Ana Propios' })).toHaveCount(0)

  // Desde la página 2, cambiar un filtro quita el cursor y vuelve a la primera.
  await page.getByRole('link', { name: 'Siguiente' }).filter({ visible: true }).click()
  await expect(page).toHaveURL(/cursor=/)
  await elegir(page, 'Clase', 'Preventa')
  await expect(page).toHaveURL(/clase=preventa/)
  await expect(page).not.toHaveURL(/cursor=/)
})

test('E3 de a 10, Siguiente y Anterior caminan por cursor y un cursor sin filas lo dice', async ({
  page,
}) => {
  await irAlListado(page, t.duena, '&por=10')
  await expect(filas(page)).toHaveCount(10)
  await page.getByRole('link', { name: 'Siguiente' }).filter({ visible: true }).click()
  await expect(page).toHaveURL(/cursor=/)
  await expect(filas(page)).toHaveCount(9)
  await expect(page.getByRole('link', { name: 'Siguiente' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Anterior' }).filter({ visible: true }).click()
  await expect(filas(page)).toHaveCount(10)

  // El cursor «siguiente» desde la cotización más vieja de toda la base, sin filtros: ya no hay nada después (con un filtro puesto, el estado es «Nada coincide»).
  const [instante, id] = sql(
    `select to_char(creado_en at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US"+00:00"') || '|' || id from public.cotizaciones order by creado_en asc, id asc limit 1`,
  ).split('|')
  const cursor = Buffer.from(`s|${instante ?? ''}|${id ?? ''}`).toString('base64url')
  await page.goto(`/cotizaciones?por=10&cursor=${cursor}`)
  await expect(page.getByText('No hay más en esta página')).toBeVisible()
})

test('E4 quien ve «propios» ve las suyas, con su cliente, y no las de la dueña sobre un lead que no es suyo', async ({
  page,
}) => {
  await irAlListado(page, t.ana)
  await expect(filas(page)).toHaveCount(2)
  await expect(filas(page).first()).toContainText(t.nombreDelLeadDeAna)
  await expect(filas(page).first()).toContainText('Ana Propios')
  await expect(page.getByText(t.nombreDelLeadDeLaDuena)).toHaveCount(0)
  await expect(page.getByText('Gala Guarda')).toHaveCount(0)
})

test('E5 sin ver leads, el cliente es «—» y su nombre no está en la página', async ({ page }) => {
  await irAlListado(page, t.soloVer)
  await expect(filas(page).first()).toContainText('—')
  await expect(page.getByText(t.nombreDelLeadDeLaDuena)).toHaveCount(0)
})

test('E5b sin ver cotizaciones, ni la entrada en el menú ni la lista', async ({ page }) => {
  await entrar(page, t.sinVer, { fresco: true })
  if (esMovil(page)) {
    await page.getByRole('button', { name: 'Abrir el menú' }).click()
  }
  await expect(page.getByRole('link', { name: 'Cotizaciones', exact: true })).toHaveCount(0)
  await page.goto('/cotizaciones')
  await expect(
    page.getByText('No tienes permiso para ver cotizaciones en ningún origen.'),
  ).toBeVisible()
})

test('E6 «Nueva cotización» abre la hoja en el origen del filtro y la tecla N hace lo mismo', async ({
  page,
}) => {
  await irAlListado(page, t.duena)
  const nueva = page.getByRole('link', { name: 'Nueva cotización' }).filter({ visible: true })
  await expect(nueva).toHaveAttribute('href', new RegExp(`^/cotizaciones/nuevo\\?origen=`))
  await nueva.click()
  await expect(page).toHaveURL(/\/cotizaciones\/nuevo\?origen=/)

  if (!esMovil(page)) {
    await page.goto(enElOrigen())
    await expect(filas(page).first()).toBeVisible()
    await page.locator('body').press('n')
    await expect(page).toHaveURL(/\/cotizaciones\/nuevo\?origen=/)
  }
})

test('E6b quien ve y no cotiza no tiene «Nueva cotización»', async ({ page }) => {
  await irAlListado(page, t.soloVer)
  await expect(page.getByRole('link', { name: 'Nueva cotización' })).toHaveCount(0)
})

test('E7 ?vehiculo= muestra sólo las del vehículo con su aviso; «Ver todas» lo quita y conserva Clase; sin cotizaciones, el vacío del vehículo', async ({
  page,
}) => {
  await irAlListado(page, t.duena, `&vehiculo=${t.vehiculos.uno}`)
  // Cinco: tres de la dueña y dos de Ana; las del otro vehículo y las sin vehículo no entran.
  await expect(filas(page)).toHaveCount(5)
  await expect(page.getByText(`Cotizaciones de ${TITULO_UNO}.`)).toBeVisible()
  await expect(page.getByText(TITULO_DOS)).toHaveCount(0)

  // Un filtro del esquema no pierde el vehículo.
  await elegir(page, 'Clase', 'Preventa')
  await expect(page).toHaveURL(/vehiculo=/)
  await expect(page).toHaveURL(/clase=preventa/)
  await expect(filas(page)).toHaveCount(5)

  await page.getByRole('link', { name: 'Ver todas' }).click()
  await expect(page).not.toHaveURL(/vehiculo=/)
  await expect(page).toHaveURL(/clase=preventa/)
  await expect(page.getByText(`Cotizaciones de ${TITULO_UNO}.`)).toHaveCount(0)

  // Un vehículo sin cotizaciones, sin otros filtros: lo dice y ofrece «Ver todas».
  const sinCotizar = crearVehiculoEn(t.origen.id, 'Listado sin cotizaciones')
  await page.goto(`/cotizaciones?vehiculo=${sinCotizar}`)
  await expect(page.getByText('Sin cotizaciones de este vehículo que puedas ver.')).toBeVisible()
  // El aviso de arriba y el vacío traen cada uno su «Ver todas»: el del vacío es el último.
  await page.getByRole('link', { name: 'Ver todas' }).last().click()
  await expect(page).not.toHaveURL(/vehiculo=/)
  await expect(filas(page).first()).toBeVisible()
})
