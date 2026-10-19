import type { Locator, Page, TestInfo } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrarConSesion } from './soporte/pasos'
import { aLaVista } from './soporte/inventario'
import { capturar, quieto, sinScrollHorizontal } from './soporte/recorrido'
import { sql } from './soporte/sql'

// El recorrido de la IA con VOLUMEN (9e): la dueña y Ana, con 50.000 leads, 10.000 vehículos, una columna de
// 8.000 oportunidades y 60 lotes en cada papelera (`pnpm db:sembrar-volumen`), en escritorio y celular, y con
// capturas para mirar (`E2E_CAPTURAS=e2e-capturas/9e`). No entra en `pnpm test:e2e` ni en el completo
// (`playwright.config.ts`): sólo con `E2E_VOLUMEN=1`, y la base se resetea al terminar (`pnpm db:reset`).
// Lo que se afirma es determinista (nodos del DOM, pedidos, el aviso del tope); lo que se juzga se mira.
test.describe.configure({ mode: 'serial' })

const CLAVE = 'Volumen-9e-clave'
const DUENA = 'duena-volumen@ejemplo.com'
const ANA = 'ana-volumen@ejemplo.com'

// Cuántos nodos del DOM aguanta cada pantalla en el celular (menos que en el escritorio).
// Una página de papelera (5 lotes, 20 filas de cada uno a la vista): lo medido con margen.
const NODOS_DE_LA_PAPELERA = 3_000
const NODOS_MAXIMOS = { escritorio: 12_000, movil: 9_000 }

const nodos = (page: Page) => page.evaluate(() => document.querySelectorAll('*').length)

function notas(info: TestInfo, tipo: string, descripcion: string) {
  info.annotations.push({ type: tipo, description: descripcion })
}

test.beforeAll(() => {
  const leads = Number(sql("select count(*) from public.leads where nombre like 'Volumen %'"))
  test.skip(leads < 50_000, 'Sin volumen: corre pnpm db:sembrar-volumen.')
})

async function entrarComo(page: Page, correo: string) {
  await entrarConSesion(page, correo, CLAVE)
}

const filasDelListado = (page: Page): Locator => aLaVista(page.locator('tbody tr, li article'))

async function paginar(page: Page, veces: number) {
  for (let i = 0; i < veces; i += 1) {
    const siguiente = page.getByRole('link', { name: 'Siguiente' })
    // Los enlaces de página hidratan un momento después de las filas.
    const hay = await siguiente.waitFor({ state: 'visible', timeout: 10_000 }).then(
      () => true,
      () => false,
    )
    if (!hay) {
      return i
    }
    const antes = page.url()
    await siguiente.click()
    await expect.poll(() => page.url()).not.toBe(antes)
    await expect(filasDelListado(page).first()).toBeVisible()
  }
  return veces
}

// Un nombre que sólo coincide con una fila de hace meses de cada una.
for (const [quien, correo, antiguo] of [
  ['la dueña', DUENA, 'Volumen 12345 '],
  ['Ana', ANA, 'Volumen 21500 '],
] as const) {
  test(`listado de ${quien}: muchas páginas, «atrás» y llegar a lo antiguo`, async ({
    page,
  }, info) => {
    test.setTimeout(180_000)
    await entrarComo(page, correo)
    await page.goto('/leads')
    await expect(page).toHaveURL(/\/leads/)
    await expect(filasDelListado(page).first()).toBeVisible({ timeout: 30_000 })
    await capturar(page, info, `${quien}-listado-inicio`)
    const hechas = await paginar(page, 10)
    expect(hechas).toBe(10)
    await capturar(page, info, `${quien}-listado-pagina-${String(hechas + 1)}`)
    // Lo que queda al pie de la página: dónde se pagina.
    await page.getByRole('navigation', { name: 'Páginas' }).scrollIntoViewIfNeeded()
    await capturar(page, info, `${quien}-listado-pie-de-pagina`)
    const enPantalla = await filasDelListado(page).count()
    notas(
      info,
      'nodos del listado',
      `${quien}: ${String(await nodos(page))} nodos, ${String(enPantalla)} filas`,
    )
    // Una página dibuja 50 filas (la tabla y las tarjetas están las dos en el DOM): el DOM no crece con las páginas.
    expect(await nodos(page)).toBeLessThan(
      NODOS_MAXIMOS[info.project.name as 'escritorio' | 'movil'],
    )
    await sinScrollHorizontal(page)
    // «Atrás» vuelve a la página anterior, no al principio.
    const url = page.url()
    await page.goBack()
    notas(info, 'url tras atrás', `${url} → ${page.url()}`)
    await expect(filasDelListado(page).first()).toBeVisible()
    expect(page.url()).not.toBe(url)
    await capturar(page, info, `${quien}-listado-atras`)
  })

  test(`listado de ${quien}: un filtro sin resultados y una búsqueda de algo antiguo`, async ({
    page,
  }, info) => {
    test.setTimeout(120_000)
    await entrarComo(page, correo)
    const inicio = Date.now()
    await page.goto('/leads?q=zzzzqxw')
    await expect(page.getByText('Nada coincide con los filtros')).toBeVisible({ timeout: 60_000 })
    notas(info, 'búsqueda sin resultados', `${quien}: ${String(Date.now() - inicio)} ms`)
    await capturar(page, info, `${quien}-sin-resultados`)
    // Un nombre que sólo coincide con una fila de hace meses.
    await page.goto(`/leads?q=${encodeURIComponent(antiguo)}`)
    await expect(filasDelListado(page).first()).toBeVisible({ timeout: 60_000 })
    await capturar(page, info, `${quien}-busqueda-antigua`)
  })
}

test('el kanban de la dueña con una columna de 8.000: «Ver más» hasta el tope', async ({
  page,
}, info) => {
  test.setTimeout(180_000)
  await entrarComo(page, DUENA)
  await page.goto('/leads?vista=embudo')
  await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible()
  await capturar(page, info, 'kanban-inicio')
  // La pestaña (celular) o la columna (escritorio) con miles.
  if (info.project.name === 'movil') {
    await aLaVista(page.getByRole('tab').filter({ hasText: '500+' }))
      .first()
      .click()
  }
  const columna = aLaVista(page.locator('section[aria-label*="más de 500"]')).first()
  await expect(columna).toBeVisible()
  for (let i = 0; i < 12; i += 1) {
    const verMas = columna.getByRole('button', { name: /^Ver más/ })
    if ((await verMas.count()) === 0) {
      break
    }
    const antes = await columna.getByRole('article').count()
    await verMas.click()
    await expect(columna.getByRole('article')).not.toHaveCount(antes)
  }
  await expect(columna.getByText(/Mostrando las 500 con actividad más reciente/)).toBeVisible()
  notas(info, 'nodos del kanban', `${String(await nodos(page))} nodos`)
  expect(await nodos(page)).toBeLessThan(
    NODOS_MAXIMOS[info.project.name as 'escritorio' | 'movil'] * 2,
  )
  await columna.getByText(/Mostrando las 500 con actividad más reciente/).scrollIntoViewIfNeeded()
  await capturar(page, info, 'kanban-tope')
})

test('las papeleras, vehículos e importación de la dueña', async ({ page }, info) => {
  test.setTimeout(180_000)
  await entrarComo(page, DUENA)
  await page.goto('/leads/papelera')
  await expect(page.getByRole('heading', { name: 'Papelera de leads' })).toBeVisible()
  await capturar(page, info, 'papelera-leads')
  // Cinco lotes de 200 de la siembra: cada uno muestra sus primeros 20 (cierre 1). Antes, 1.000 filas y ~8.200 nodos.
  const enLaPapelera = await nodos(page)
  notas(info, 'nodos de la papelera de leads', String(enLaPapelera))
  expect(enLaPapelera).toBeLessThan(NODOS_DE_LA_PAPELERA)
  await page.getByRole('link', { name: 'Siguiente' }).click()
  await capturar(page, info, 'papelera-leads-2')
  await page.goto('/vehiculos/papelera')
  await expect(page.getByRole('heading', { name: 'Papelera de vehículos' })).toBeVisible()
  await capturar(page, info, 'papelera-vehiculos')
  await page.goto('/vehiculos')
  await expect(page.getByPlaceholder('Título, VIN o lote')).toBeVisible()
  await capturar(page, info, 'vehiculos')
  await paginar(page, 5)
  await capturar(page, info, 'vehiculos-pagina-6')
  await page.goto('/leads/importar')
  await expect(page.getByText('Tus importaciones recientes')).toBeVisible()
  await capturar(page, info, 'importar')
})

test('«Quién lo tiene» de un lead compartido y agendar desde el drawer', async ({ page }, info) => {
  test.setTimeout(120_000)
  await entrarComo(page, DUENA)
  const compartido = sql(
    "select l.id from public.leads l join public.leads_asesores a on a.lead_id = l.id and a.tipo_acceso = 'compartido' where l.nombre like 'Volumen %' order by l.creado_en desc limit 1",
  )
  await page.goto(`/leads/${compartido}`)
  await expect(page.getByText('Quién lo tiene')).toBeVisible()
  await capturar(page, info, 'quien-lo-tiene')
  await page.goto(`/leads?lead=${compartido}&pestana=recordatorios`)
  const drawer = page.getByRole('dialog').first()
  await expect(drawer).toBeVisible()
  await quieto(drawer)
  await page.getByRole('button', { name: 'Agendar recordatorio' }).first().click()
  const modal = page.getByRole('dialog', { name: /recordatorio/i }).last()
  await expect(modal).toBeVisible()
  await quieto(modal)
  await capturar(page, info, 'agendar-desde-el-drawer')
})

test('paginar el listado sin red', async ({ page }, info) => {
  test.setTimeout(90_000)
  await entrarComo(page, ANA)
  await page.goto('/leads')
  await expect(filasDelListado(page).first()).toBeVisible()
  await page.context().setOffline(true)
  await page.getByRole('link', { name: 'Siguiente' }).click()
  await expect(page.getByText(/Sin conexión: no se puede cambiar de página/)).toBeVisible()
  await expect(filasDelListado(page).first()).toBeVisible()
  await capturar(page, info, 'paginar-sin-red')
  notas(info, 'paginar sin red', `URL: ${page.url()}`)
  await page.context().setOffline(false)
})
