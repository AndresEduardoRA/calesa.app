import { entrar } from './soporte/alta'
import {
  comprobantesDe,
  guardarSerie,
  limpiarSeriesDePrueba,
  ponerSerie,
  restaurarSerie,
  type SerieGuardada,
} from './soporte/cotizaciones-comprobantes'
import {
  limpiarPapelera,
  prepararPapelera,
  sembrarFinal,
  type TerrenoDeLaPapelera,
} from './soporte/cotizaciones-papelera'
import { expect, test, type Page } from './soporte/prueba'

// Comprobantes en una cotización guardada (paso 4.26-2, `docs/UX.md` › «Cotización guardada»): en una final activa sin vigente, quien tiene
// `cotizaciones.comprobantes.emitir` ve «Emitir comprobante» en la cabecera, que abre un `<Confirmar>` en `?panel=emitir-comprobante`. Al entrar, el aviso nombra
// el número que puso la base, la sección «Comprobantes» lo muestra «Vigente» y el botón ya no está. «Anular» abre un modal con motivo en
// `?panel=anular-comprobante`; al entrar, la fila dice «Anulado» con el motivo y el botón vuelve. Los permisos, la versión, el vigente y la numeración bajo
// carrera los prueban `supabase/tests/areas/comprobantes/` y sus carreras. La serie vigente es una fila única: se guarda, se pone `E2E-CMP` y se devuelve.
test.describe.configure({ mode: 'serial' })

const SERIE = 'E2E-CMP'

let t: TerrenoDeLaPapelera
let antes: SerieGuardada

test.beforeAll(async ({}, info) => {
  // Lo de una corrida que cayó a la mitad, antes que nada: un comprobante frena el borrado de las cotizaciones y personas de prueba.
  limpiarSeriesDePrueba([SERIE])
  t = await prepararPapelera(info.project.name)
  antes = guardarSerie()
  ponerSerie(SERIE)
})

test.afterAll(async () => {
  restaurarSerie(antes, [SERIE])
  await limpiarPapelera()
})

const botonEmitir = (page: Page) => page.getByRole('button', { name: 'Emitir comprobante' })
const dialogo = (page: Page) => page.getByRole('dialog')
const seccion = (page: Page) => page.getByRole('region', { name: 'Comprobantes' })

test('E1 la dueña emite el comprobante de una final y lo anula con un motivo', async ({ page }) => {
  const id = sembrarFinal({ origenId: t.origen.id, creadoPor: t.duena, titulo: 'Comprobante E1' })
  await entrar(page, t.duena, { fresco: true })
  await page.goto(`/cotizaciones/${id}`)
  await expect(seccion(page)).toContainText('Todavía no tiene comprobantes.')

  await botonEmitir(page).click()
  await expect(page).toHaveURL(/panel=emitir-comprobante/)
  await expect(dialogo(page)).toContainText('Emitir un comprobante de la cotización n.º')
  await dialogo(page).getByRole('button', { name: 'Emitir comprobante' }).click()
  await expect(page.getByText(`Emitiste el comprobante ${SERIE}-1.`)).toBeVisible()
  await expect(page).not.toHaveURL(/panel=/)
  await expect(botonEmitir(page)).toHaveCount(0)
  const fila = seccion(page).locator(`[data-comprobante="${SERIE}-1"]`)
  await expect(fila).toContainText('Vigente')
  await expect(fila).toContainText('Emitido el')
  expect(comprobantesDe(id)).toEqual([`${SERIE}-1|false|`])

  await fila.getByRole('button', { name: 'Anular' }).click()
  await expect(page).toHaveURL(/panel=anular-comprobante/)
  await expect(dialogo(page)).toContainText(`Anular el comprobante ${SERIE}-1`)
  await dialogo(page).getByLabel('Motivo').fill('Se cargó mal el precio')
  await dialogo(page).getByRole('button', { name: 'Anular comprobante' }).click()
  await expect(page.getByText(`Anulaste el comprobante ${SERIE}-1.`)).toBeVisible()
  await expect(fila).toContainText('Anulado')
  await expect(fila).toContainText('Se cargó mal el precio')
  await expect(fila.getByRole('button', { name: 'Anular' })).toHaveCount(0)
  await expect(botonEmitir(page)).toBeVisible()
  expect(comprobantesDe(id)).toEqual([`${SERIE}-1|true|Se cargó mal el precio`])
})
