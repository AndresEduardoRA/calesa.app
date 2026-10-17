import { expect, test } from './soporte/prueba'
import {
  entrar,
  esMovil,
  limpiarInventario,
  prepararInventario,
  type Terreno,
} from './soporte/inventario'
import { sinScrollHorizontal } from './soporte/recorrido'
import { cargarVehiculos } from './soporte/vehiculos'

// Las tarjetas del inventario de vehículos en el celular con el texto al 200 % (cierre 3): la lista comparte la forma de la de
// leads, y un título largo no ensancha la página. Va aparte del de leads: preparar el inventario borra las cuentas de prueba.
test.describe.configure({ mode: 'serial' })

let terreno: Terreno
const MARCA = 'Tarjeta200'

test.beforeAll(async ({}, info) => {
  terreno = await prepararInventario(info.project.name, [])
  await cargarVehiculos(terreno.corea.id, [
    { titulo: `${MARCA} vehículo con un título de ochenta caracteres que se parte en líneas` },
    ...Array.from({ length: 9 }, (_, i) => ({ titulo: `${MARCA} V${String(i + 1)}` })),
  ])
})

test.afterAll(async () => {
  await limpiarInventario()
})

test('las tarjetas del inventario no ensanchan la página con el texto al 200 %', async ({
  page,
}) => {
  test.skip(!esMovil(page), 'Las tarjetas son del celular: el escritorio dibuja la tabla.')
  await entrar(page, terreno.duena)
  await page.goto(`/vehiculos?q=${MARCA}&origen=${terreno.corea.id}`)
  await expect(page.getByText(`${MARCA} vehículo con un título`)).toBeVisible()
  await sinScrollHorizontal(page)
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await sinScrollHorizontal(page)
})
