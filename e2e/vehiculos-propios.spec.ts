import { expect, test, type Page } from './soporte/prueba'
import { aLaVista, entrar } from './soporte/inventario'
import {
  limpiarInventarioPostgrest,
  prepararInventarioPostgrest,
  type TerrenoPostgrest,
} from './soporte/inventario-postgrest'
import { filasDelListado } from './soporte/listas-por-pagina'
import { literal, sql } from './soporte/sql'
import { VENTANA_DE_AVISO_DIAS } from '../src/modules/vehiculos/entities/limpieza'

// El inventario de quien ve «propios» en la pantalla (4.16-2b): `/vehiculos` lee por `vehiculos_inventario()` (4-23). Pía Inv, con
// «propios» en Corea y en la subasta, ve 12 vehículos en Corea (9 suyos y 3 de otros por sus leads, uno sin creador) y su subasta.
// Lo esperado sale de la base como `postgres` (la misma lectura de la tabla, ordenada como el listado), no se escribe a mano.
// E4 mide que la página llama a la función: `workers: 1`, así que ningún otro spec llama mientras tanto.
test.describe.configure({ mode: 'serial' })

const POR_PAGINA = 10
const VISIBLES = 'tbody tr, li article'

let terreno: TerrenoPostgrest | undefined
const t = (): TerrenoPostgrest => {
  if (!terreno) {
    throw new Error('No hay terreno.')
  }
  return terreno
}

test.beforeAll(async ({}, info) => {
  info.setTimeout(180_000)
  terreno = await prepararInventarioPostgrest(info.project.name)
})

test.afterAll(async ({}, info) => {
  info.setTimeout(120_000)
  await limpiarInventarioPostgrest(terreno?.ajustesAntes)
})

// Los títulos que Pía ve en Corea, en el orden del listado (lo más nuevo primero, el id desempata).
function titulosDePia(extra = ''): string[] {
  return sql(
    `select v.titulo from public.vehiculos v where v.origen_id = ${literal(t().corea)} and v.eliminado_en is null
       and (v.creado_por = ${literal(piaId())} or v.lead_id is not null) ${extra}
     order by v.creado_en desc, v.id desc`,
  )
    .split('\n')
    .filter(Boolean)
}

const piaId = (): string =>
  sql(`select id from auth.users where email = ${literal(t().pia)}`).split('\n')[0] ?? ''

// Las llamadas que ha recibido la base con ese texto (sin contar esta consulta). Cada carga se mide alrededor de su `goto`.
function llamadas(...patrones: string[]): number {
  const donde = patrones.map((p) => `query ilike ${literal(p)}`).join(' and ')
  return Number(
    sql(
      `select coalesce(sum(calls), 0) from extensions.pg_stat_statements
       where ${donde} and query not ilike '%pg_stat_statements%'`,
    ),
  )
}
const DE_LA_FUNCION = ['%vehiculos_inventario%']
// PostgREST lee la tabla con `SELECT "public"."vehiculos"."id", …` (los borrados de la limpieza del terreno también dicen `FROM`).
const DE_LA_TABLA = ['%select "public"."vehiculos"."id"%']

// Carga una pantalla y devuelve lo que sumaron las llamadas a la función y las lecturas de la tabla mientras tanto. `listo` espera a que la
// pantalla esté dibujada (por defecto, la primera fila; una lista vacía espera otra cosa). Con la fuente por la tabla, una carga que cae a
// ella tras llamar a la función suma las dos: por eso se pide `tabla` = 0 y no sólo `funcion` ≥ 1.
async function cargar(
  page: Page,
  url: string,
  listo: () => Promise<void> = () => expect(filasDelListado(page).first()).toBeVisible(),
): Promise<{ funcion: number; tabla: number }> {
  const f0 = llamadas(...DE_LA_FUNCION)
  const t0 = llamadas(...DE_LA_TABLA)
  await page.goto(url)
  await listo()
  return { funcion: llamadas(...DE_LA_FUNCION) - f0, tabla: llamadas(...DE_LA_TABLA) - t0 }
}

const fila = (page: Page, titulo: string) =>
  aLaVista(page.locator(VISIBLES).filter({ hasText: titulo }))

test('E1 · dos páginas de a 10, «Siguiente» y «Anterior», sin lo ajeno y con la portada', async ({
  page,
}) => {
  const { pia, corea } = t()
  const todos = titulosDePia()
  expect(todos).toHaveLength(12)
  await entrar(page, pia)
  const medida = await cargar(page, `/vehiculos?origen=${corea}&por=${POR_PAGINA}`)
  const filas = filasDelListado(page)
  await expect(filas).toHaveCount(POR_PAGINA)
  for (const [i, titulo] of todos.slice(0, POR_PAGINA).entries()) {
    await expect(filas.nth(i)).toContainText(titulo)
  }
  // «Kia coma, y punto.» es de la dueña, en un lead de Pía y con foto.
  const ruta = sql(
    `select i.ruta_miniatura from public.vehiculos_imagenes i join public.vehiculos v on v.id = i.vehiculo_id
     where v.titulo = 'Kia coma, y punto.' and v.origen_id = ${literal(corea)} and i.es_portada limit 1`,
  )
  expect(ruta).not.toBe('')

  await page.getByRole('link', { name: 'Siguiente' }).click()
  await expect(page).toHaveURL(/cursor=/)
  await expect(filas).toHaveCount(todos.length - POR_PAGINA)
  for (const [i, titulo] of todos.slice(POR_PAGINA).entries()) {
    await expect(filas.nth(i)).toContainText(titulo)
  }
  await page.getByRole('link', { name: 'Anterior' }).click()
  await expect(filas).toHaveCount(POR_PAGINA)
  await expect(filas.first()).toContainText(todos[0] ?? '')

  for (const ajeno of ['TOYOTA HILUX 4x4', 'Suzuki sin nada', 'BMW X1 toyota en la papelera']) {
    await expect(fila(page, ajeno)).toHaveCount(0)
  }
  // La portada llega con la fila: el `img` de «Kia coma, y punto.» apunta a su miniatura.
  await page.goto(`/vehiculos?origen=${corea}&por=100`)
  const src = await fila(page, 'Kia coma, y punto.').locator('img').first().getAttribute('src')
  expect(decodeURIComponent(src ?? '')).toContain(ruta)
  // E4: la primera carga fue por la función.
  expect(
    medida.funcion,
    'E4 · E1: la página llama a vehiculos_inventario()',
  ).toBeGreaterThanOrEqual(1)
  expect(medida.tabla, 'E4 · E1: la página no lee la tabla').toBe(0)
})

test('E2 · la búsqueda deja una sola fila, y se lee por la función', async ({ page }) => {
  const { pia, corea } = t()
  await entrar(page, pia)
  const medida = await cargar(page, `/vehiculos?origen=${corea}&q=toyota`)
  await expect(filasDelListado(page)).toHaveCount(1)
  await expect(fila(page, 'Toyota 50% off')).toBeVisible()
  expect(
    medida.funcion,
    'E4 · E2: la búsqueda llama a vehiculos_inventario()',
  ).toBeGreaterThanOrEqual(1)
  expect(medida.tabla, 'E4 · E2: la búsqueda no cae a la tabla').toBe(0)
})

test('E3 · la limpieza en la subasta, sí y no, por la función', async ({ page }) => {
  const { pia, subasta, hasta } = t()
  const dias = sql(
    `select (public.limpieza_el(v) - current_date)::int from public.vehiculos v
     where v.origen_id = ${literal(subasta)} and v.titulo = 'Subasta de Pía'`,
  )
  expect(
    Number(dias),
    `La limpieza de «Subasta de Pía» cae a ${dias} días: fuera de la ventana de ${VENTANA_DE_AVISO_DIAS}`,
  ).toBeLessThanOrEqual(VENTANA_DE_AVISO_DIAS)
  expect(hasta).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  await entrar(page, pia)
  const si = await cargar(page, `/vehiculos?origen=${subasta}&limpieza=si`)
  await expect(fila(page, 'Subasta de Pía')).toBeVisible()
  const no = await cargar(page, `/vehiculos?origen=${subasta}&limpieza=no`, () =>
    expect(page.getByText('Se limpiará pronto: no').first()).toBeVisible(),
  )
  await expect(fila(page, 'Subasta de Pía')).toHaveCount(0)
  expect(si.funcion, 'E4 · E3 sí').toBeGreaterThanOrEqual(1)
  expect(no.funcion, 'E4 · E3 no').toBeGreaterThanOrEqual(1)
  expect(si.tabla, 'E4 · E3 sí: no cae a la tabla').toBe(0)
  expect(no.tabla, 'E4 · E3 no: no cae a la tabla').toBe(0)
})

test('E4 · con la dueña en Corea no se llama a la función y se lee la tabla', async ({ page }) => {
  const { duena, corea } = t()
  await entrar(page, duena)
  const medida = await cargar(page, `/vehiculos?origen=${corea}&por=${POR_PAGINA}`)
  expect(medida.funcion, 'la dueña no llama a la función').toBe(0)
  // Y el patrón de la tabla ve su lectura: sin esto, un `tabla` = 0 de arriba no probaría nada.
  expect(medida.tabla, 'la dueña lee por la tabla').toBeGreaterThanOrEqual(1)
})
