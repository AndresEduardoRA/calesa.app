import { expect, test } from './soporte/prueba'
import {
  entrar,
  esMovil,
  limpiarInventario,
  prepararInventario,
  type Terreno,
} from './soporte/inventario'
import {
  elegirTamano,
  esperarHidratado,
  filasDelListado,
  fijarPreferencia,
  parametrosDe,
  preferenciaDe,
  selectorDeTamano,
  vistasDelHtml,
} from './soporte/listas-por-pagina'
import { tactil } from './soporte/recorrido'
import { cargarVehiculos } from './soporte/vehiculos'

// «Ítems por página» (9g) en el inventario de vehículos, con la dueña del inventario: cada valor, lo que se recuerda
// (la misma preferencia que el listado de leads), un valor manipulado, la página 3 con búsqueda y qué pasa con las filas
// marcadas para la papelera al cambiar el tamaño. Con volumen y a 100 va `listas-por-pagina-volumen.spec.ts`.
test.describe.configure({ mode: 'serial' })

let terreno: Terreno
const MARCA = 'PorPagVeh'
const consulta = (extra = '') => `?q=${MARCA}${extra}`
const irAlInventario = async (page: Parameters<typeof entrar>[0], extra = '') => {
  await page.goto(`/vehiculos${consulta(`&origen=${terreno.corea.id}${extra}`)}`)
  await expect(selectorDeTamano(page)).toBeVisible()
}

test.beforeAll(async ({}, info) => {
  test.setTimeout(120_000)
  terreno = await prepararInventario(info.project.name, ['vehiculos.eliminar'])
  await cargarVehiculos(
    terreno.corea.id,
    Array.from({ length: 130 }, (_, i) => ({
      titulo: `${MARCA} ${String(i + 1).padStart(3, '0')}`,
    })),
  )
})

test.afterAll(async () => {
  await fijarPreferencia(terreno.duena, null)
  await limpiarInventario()
})

test('cada tamaño trae esa cantidad de filas, vuelve a la primera y se recuerda', async ({
  page,
}) => {
  await fijarPreferencia(terreno.duena, null)
  await entrar(page, terreno.duena)
  await irAlInventario(page)
  await expect(filasDelListado(page)).toHaveCount(50)
  await expect(selectorDeTamano(page)).toHaveValue('50')
  await tactil(page, selectorDeTamano(page))
  for (const tamano of [10, 25, 100]) {
    await elegirTamano(page, tamano)
    await expect(filasDelListado(page)).toHaveCount(tamano)
    expect(parametrosDe(page).get('por')).toBe(String(tamano))
    expect(parametrosDe(page).has('cursor')).toBe(false)
    expect(parametrosDe(page).get('origen')).toBe(terreno.corea.id)
  }
  await elegirTamano(page, 25)
  await expect(filasDelListado(page)).toHaveCount(25)
  await expect.poll(() => preferenciaDe(terreno.duena)).toBe(25)
  await irAlInventario(page)
  await expect(filasDelListado(page)).toHaveCount(25)
  expect(parametrosDe(page).has('por')).toBe(false)
})

// Con 100 filas el inventario dibuja una sola vista (cierre 1): la tabla en escritorio, las tarjetas en el celular, ya en el
// HTML del servidor. Con volumen, ~4.900 nodos en escritorio y ~3.300 en el celular (eran ~7.900: las dos vistas).
const NODOS_CON_100 = 6_000

test('con 100 por página dibuja una sola vista y cabe en su presupuesto de nodos', async ({
  page,
}, info) => {
  await fijarPreferencia(terreno.duena, null)
  await entrar(page, terreno.duena)
  const respuesta = await page.goto(`/vehiculos${consulta(`&origen=${terreno.corea.id}&por=100`)}`)
  await expect(filasDelListado(page)).toHaveCount(100)
  const movil = esMovil(page)
  expect(vistasDelHtml((await respuesta?.text()) ?? '')).toEqual({ tabla: !movil, tarjetas: movil })
  const nodos = await page.evaluate(() => document.querySelectorAll('*').length)
  info.annotations.push({ type: 'nodos con 100 filas', description: String(nodos) })
  expect(nodos).toBeLessThan(NODOS_CON_100)
})

test('un valor manipulado se ignora; cambiar en la página 3 vuelve a la primera y conserva la búsqueda', async ({
  page,
}) => {
  await fijarPreferencia(terreno.duena, 10)
  await entrar(page, terreno.duena)
  for (const malo of ['7', '100000', 'abc', '-5', '0']) {
    await irAlInventario(page, `&por=${malo}`)
    await expect(filasDelListado(page)).toHaveCount(10)
  }
  await irAlInventario(page)
  for (let n = 0; n < 2; n++) {
    await page.getByRole('link', { name: 'Siguiente' }).click()
    await expect(page).toHaveURL(/cursor=/)
    await expect(filasDelListado(page)).toHaveCount(10)
  }
  await elegirTamano(page, 50)
  await expect(filasDelListado(page)).toHaveCount(50)
  const url = parametrosDe(page)
  expect(url.has('cursor')).toBe(false)
  expect(url.get('q')).toBe(MARCA)
  expect(url.get('origen')).toBe(terreno.corea.id)
})

test('las filas marcadas para la papelera no sobreviven al cambio: «Selección» cuenta sólo lo que se ve', async ({
  page,
}) => {
  test.skip(
    esMovil(page),
    'las casillas se prueban en escritorio; el celular usa las mismas piezas',
  )
  await fijarPreferencia(terreno.duena, 25)
  await entrar(page, terreno.duena)
  await irAlInventario(page)
  await esperarHidratado(page)
  const casillas = page.getByRole('checkbox', { name: new RegExp(`^Seleccionar ${MARCA}`) })
  await casillas.nth(0).click()
  await casillas.nth(1).click()
  await expect(page.getByLabel('Selección')).toContainText('2')
  await elegirTamano(page, 10)
  await expect(filasDelListado(page)).toHaveCount(10)
  // Las dos primeras siguen en la página (es la primera de nuevo): quedan marcadas; las que ya no se ven, no cuentan.
  await expect(page.getByLabel('Selección')).toContainText('2')
  await page.getByRole('link', { name: 'Siguiente' }).click()
  await expect(filasDelListado(page)).toHaveCount(10)
  await expect(page.getByLabel('Selección')).toHaveCount(0)
})
