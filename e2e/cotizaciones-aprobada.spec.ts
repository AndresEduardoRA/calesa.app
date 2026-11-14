import { entrar } from './soporte/alta'
import {
  limpiarFinal,
  prepararFinal,
  sembrarParaMarcar,
  type TerrenoDeLaFinal,
} from './soporte/cotizaciones-final'
import { expect, test, type Page } from './soporte/prueba'
import { literal, sql } from './soporte/sql'

// La cotización aprobada de un vehículo (B4, `docs/UX.md` › «Cotización guardada», «Vehículos» y «Cotizaciones»): la primera activa nace aprobada y su primer
// resultado sale en la columna «Cotización aprobada» de `/vehiculos` (en el celular, en la tarjeta), enlazado a ella. Quien aprueba en el origen elige la segunda desde
// su guardada («Aprobar» pasa a la insignia «Aprobada»), y la lista de vehículos pasa a mostrar su monto y su enlace; el listado de cotizaciones la marca. Quien no aprueba
// ve la insignia y no el botón. El terreno lo arma `soporte/cotizaciones-final.ts`; la siembra escribe sin triggers (como el resto), así que el relleno de la aprobada se
// llama a mano, como lo hace la siembra de volumen.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDeLaFinal

test.beforeAll(async ({}, info) => {
  t = await prepararFinal(info.project.name)
})

test.afterAll(async () => {
  await limpiarFinal()
})

const filas = (page: Page) => page.locator('tbody tr, li article')
const cabecera = (page: Page) => page.locator('[data-cabecera-de-la-guardada]')

async function abrir(page: Page, correo: string, ruta: string): Promise<void> {
  await page.context().clearCookies()
  await entrar(page, correo, { fresco: true })
  await page.goto(ruta)
}

type Sembrada = { vehiculoId: string; titulo: string; primera: string; segunda: string }

// Dos preventas de un vehículo con totales distintos (1.111 la más antigua, 2.222 la otra) y la aprobada puesta como la pone la base: la más antigua.
async function sembrarDos(nombre: string, creadoPor?: string): Promise<Sembrada> {
  const { ids, vehiculoId } = await sembrarParaMarcar(t, nombre, {
    cuantas: 2,
    ...(creadoPor === undefined ? {} : { creadoPor }),
  })
  const v = vehiculoId ?? ''
  const [primera = ''] = sql(
    `select id from public.cotizaciones where vehiculo_id = ${literal(v)}::uuid order by creado_en, id limit 1`,
  ).split('\n')
  const segunda = ids.find((id) => id !== primera) ?? ''
  sql(`
    begin;
    set local session_replication_role = replica;
    update public.cotizaciones set totales = '{"usd": 1111}' where id = ${literal(primera)}::uuid;
    update public.cotizaciones set totales = '{"usd": 2222}' where id = ${literal(segunda)}::uuid;
    commit;
    select public._cotizaciones_aprobadas_rellenar();`)
  return {
    vehiculoId: v,
    titulo: sql(`select titulo from public.vehiculos where id = ${literal(v)}::uuid`),
    primera,
    segunda,
  }
}

const aprobadaDe = (vehiculoId: string): string =>
  sql(
    `select coalesce((select cotizacion_id::text from public.cotizaciones_aprobadas where vehiculo_id = ${literal(vehiculoId)}::uuid), '')`,
  )

const rutaDelInventario = (titulo: string): string =>
  `/vehiculos?origen=${t.origen.id}&q=${encodeURIComponent(titulo)}`

test('E2E aprobar la segunda cotización cambia la columna de la lista de vehículos', async ({
  page,
}) => {
  const s = await sembrarDos('Aprobada E1')
  expect(aprobadaDe(s.vehiculoId)).toBe(s.primera)

  // La lista de vehículos muestra el primer resultado de la primera, enlazado a ella.
  await abrir(page, t.duena, rutaDelInventario(s.titulo))
  const fila = filas(page).filter({ hasText: s.titulo })
  await expect(fila).toHaveCount(1)
  await expect(fila.getByRole('link', { name: /1\D?111/ })).toHaveAttribute(
    'href',
    `/cotizaciones/${s.primera}`,
  )

  // La segunda: «Aprobar» en su guardada pasa a la insignia, sin refrescar la página.
  await page.goto(`/cotizaciones/${s.segunda}`)
  await expect(page.getByRole('button', { name: 'Revisiones' })).toBeVisible()
  await expect(cabecera(page).locator('[data-aprobada]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Aprobar', exact: true }).click()
  await expect(cabecera(page).locator('[data-aprobada]')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Aprobar', exact: true })).toHaveCount(0)
  await expect.poll(() => aprobadaDe(s.vehiculoId)).toBe(s.segunda)

  // La lista pasa a mostrar la segunda.
  await page.goto(rutaDelInventario(s.titulo))
  await expect(
    filas(page)
      .filter({ hasText: s.titulo })
      .getByRole('link', { name: /2\D?222/ }),
  ).toHaveAttribute('href', `/cotizaciones/${s.segunda}`)

  // El listado de cotizaciones la marca, sólo a ella.
  await page.goto(`/cotizaciones?vehiculo=${s.vehiculoId}`)
  const numero = sql(
    `select numero from public.cotizaciones where id = ${literal(s.segunda)}::uuid`,
  )
  await expect(filas(page).first()).toBeVisible()
  // La insignia es un texto exacto: el título del vehículo («Aprobada E1…») no cuenta.
  const marcadas = filas(page).filter({ has: page.getByText('Aprobada', { exact: true }) })
  await expect(marcadas).toHaveCount(1)
  await expect(marcadas).toContainText(numero)
})

test('E2E Ana, sin aprobar, ve la insignia «Aprobada» de la suya y no el botón', async ({
  page,
}) => {
  const s = await sembrarDos('Aprobada E2', t.ana)
  await abrir(page, t.ana, `/cotizaciones/${s.primera}`)
  await expect(page.getByRole('button', { name: 'Revisiones' })).toBeVisible()
  await expect(cabecera(page).locator('[data-aprobada]')).toBeVisible()
  await abrirOtra(page, s.segunda)
  await expect(cabecera(page).locator('[data-aprobada]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Aprobar', exact: true })).toHaveCount(0)
})

async function abrirOtra(page: Page, id: string): Promise<void> {
  await page.goto(`/cotizaciones/${id}`)
  await expect(page.getByRole('button', { name: 'Revisiones' })).toBeVisible()
}
