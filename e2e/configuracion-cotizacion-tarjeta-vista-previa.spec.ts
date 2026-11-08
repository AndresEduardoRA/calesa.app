import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { borrarOrigenesDeCotizar } from './soporte/cotizar-formula'
import {
  borradorGuardado,
  borrarLasPlantillasDelOrigen,
  crearConfiguradoraDeTarjeta,
  limpiarTerrenoDePlantilla,
  plantillaValida,
  prepararTerrenoDePlantilla,
  sembrarBorradorDePlantilla,
  type TerrenoDePlantilla,
} from './soporte/plantilla'
import { sinScrollHorizontal } from './soporte/recorrido'

// La vista previa en vivo de la tarjeta (4.19-4): sigue a lo que se tipea, sin guardar, con cifras de ejemplo dichas; escritorio al costado, móvil tras el cuerpo.
test.describe.configure({ mode: 'serial' })

let terreno: TerrenoDePlantilla | undefined
let configuradora = ''

const origenId = () => {
  if (!terreno) throw new Error('No hay terreno.')
  return terreno.origenId
}

test.beforeAll(async ({}, info) => {
  info.setTimeout(180_000)
  terreno = await prepararTerrenoDePlantilla(info.project.name, 'tarjvp')
  configuradora = await crearConfiguradoraDeTarjeta(info.project.name, 'tarjvp', [origenId()])
})

test.afterAll(async ({}, info) => {
  info.setTimeout(120_000)
  await limpiarTerrenoDePlantilla()
  borrarOrigenesDeCotizar()
})

test.beforeEach(() => {
  borrarLasPlantillasDelOrigen(origenId())
})

const vista = (page: Page) => page.getByRole('region', { name: 'Vista previa de la tarjeta' })

test('E1: la vista previa sigue a la plantilla sin guardar, con cifras de ejemplo', async ({
  page,
}) => {
  const semilla = { ...plantillaValida('vista'), logo: true }
  const esperada = sembrarBorradorDePlantilla(origenId(), semilla)
  await entrar(page, configuradora, { fresco: true })
  await page.goto(`/configuracion/cotizacion?seccion=tarjeta&origen=${origenId()}`)
  await expect(page.getByRole('heading', { name: /^Tarjeta de / })).toBeVisible()
  await expect(vista(page)).toBeVisible()
  await expect(vista(page).getByText('Cifras de ejemplo.')).toBeVisible()
  await expect(vista(page).locator('[data-fila-de-la-tarjeta]').first()).toBeVisible()
  await expect(vista(page).locator('[data-total-de-la-tarjeta]')).toContainText('Total')

  // Tipear: la tarjeta lo dice sin guardar.
  await page.getByLabel('Etiqueta del total').fill('TOTAL EN DÓLARES')
  await expect(vista(page).locator('[data-total-de-la-tarjeta]')).toContainText('TOTAL EN DÓLARES')
  // Un tono distinto del que trae «Compra» (el de su grupo en la fórmula).
  const primero = vista(page).locator('[data-grupo-de-la-tarjeta]').first()
  const antes = await primero.getAttribute('data-tono')
  const opciones = await page
    .getByLabel('Tono de «Compra»')
    .locator('option')
    .evaluateAll((o) => o.map((x) => (x as HTMLOptionElement).value).filter(Boolean))
  const otro = opciones.find((v) => v !== antes)
  if (!otro) throw new Error('El catálogo no trae otro tono.')
  await page.getByLabel('Tono de «Compra»').selectOption(otro)
  await expect(primero).toHaveAttribute('data-tono', otro)

  // Columnas y logo, en «Pie y columnas».
  await page.getByText('Pie y columnas', { exact: true }).first().click()
  await page.getByRole('switch', { name: 'Plazo' }).click()
  await expect(vista(page).locator('[data-plazo]').first()).toContainText('2 días')
  await expect(
    vista(page)
      .locator('[data-tarjeta-de-cotizacion] svg, [data-tarjeta-de-cotizacion] img')
      .first(),
  ).toBeVisible()
  await page.getByRole('switch', { name: 'Logo' }).click()
  await expect(vista(page).getByText('Tu empresa')).toHaveCount(0)

  // No se pulsó «Guardar»: la base sigue con lo sembrado.
  const guardado = borradorGuardado(origenId())
  expect(guardado?.actualizadoEn).toBeTruthy()
  expect(guardado?.definicion.total.etiqueta).toBe(semilla.total.etiqueta)
  expect(guardado?.definicion.logo).toBe(true)
  expect(esperada).toBeTruthy()

  // La sección va tras el cuerpo del editor y antes de «Guardar» (en móvil, en una columna).
  const cajas = await Promise.all([
    page.getByLabel('Etiqueta del total').boundingBox(),
    vista(page).boundingBox(),
    page.getByRole('button', { name: 'Guardar' }).boundingBox(),
  ])
  const [campo, previa, guardar] = cajas
  if (!campo || !previa || !guardar) throw new Error('Falta una caja.')
  if ((page.viewportSize()?.width ?? 0) < 1280) {
    expect(previa.y).toBeGreaterThan(campo.y)
    expect(guardar.y).toBeGreaterThan(previa.y)
  } else {
    expect(previa.x).toBeGreaterThan(campo.x)
  }
  await sinScrollHorizontal(page)
})
