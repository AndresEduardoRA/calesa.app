import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import {
  borrarLoDePrevia,
  claveDeVolumen,
  definicionConTablas,
  sembrarBorradorDeLaDefinicion,
  sembrarTablaDeVolumen,
} from './soporte/formula-editor-previa'

// La vista previa con volumen (4.21-3a-2, C1 y C8): lo de prueba son pocos pedidos, constantes en el tiempo y no por fila, aunque la fórmula tenga 600 filas; y PostgREST
// no da más de 1.000 filas por pedido (`max_rows`), así que una tabla se lee si cabe: 999 sí, 1.000 y 1.001 no (con su aviso), y dos de 600 se leen enteras en dos pedidos.
test.describe.configure({ mode: 'serial' })

// Lo medido en escritorio con 600 filas (4.21-3a-2: 4.990 nodos con 500 filas, con la cifra de cada fila; el tope del 3a-1, sin cifras, era de 3.992), más un 5 %.
const TOPE_DE_NODOS_CON_500 = 5_250

let proyecto = ''
let duena = ''
let grande = { id: '', nombre: '' }
let enormes = { id: '', nombre: '' }
let dosDeSeiscientas = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  borrarOrigenesDeCotizar()
  borrarLoDePrevia()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-previa-vol-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Vera Volumen' })
  const claves = { v999: '999', v1000: '1000', v1001: '1001', a600: 'a600', b600: 'b600' }
  for (const [sufijo, n] of [
    ['999', 999],
    ['1000', 1000],
    ['1001', 1001],
    ['a600', 600],
    ['b600', 600],
  ] as const) {
    sembrarTablaDeVolumen(claveDeVolumen(proyecto, sufijo), n)
  }
  const de = (...s: string[]) => s.map((x) => claveDeVolumen(proyecto, x))
  grande = await crearOrigenDeCotizar(proyecto, 'pvgrande', false)
  sembrarBorradorDeLaDefinicion(grande.id, definicionConTablas(600, de(claves.v999)), duena)
  enormes = await crearOrigenDeCotizar(proyecto, 'pvenorm', false)
  sembrarBorradorDeLaDefinicion(
    enormes.id,
    definicionConTablas(1, de(claves.v999, claves.v1000, claves.v1001)),
    duena,
  )
  dosDeSeiscientas = await crearOrigenDeCotizar(proyecto, 'pvdos600', false)
  sembrarBorradorDeLaDefinicion(
    dosDeSeiscientas.id,
    definicionConTablas(1, de(claves.a600, claves.b600)),
    duena,
  )
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  borrarLoDePrevia()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const filas = (page: Page) => page.getByRole('list', { name: 'Filas de la fórmula' })
const fila = (page: Page, id: string) => filas(page).locator(`li[data-fila="${id}"]`)
const previa = (page: Page) => page.getByRole('region', { name: 'Vista previa' })

// Cuenta los pedidos de lo de prueba por tabla de la base.
function contar(page: Page) {
  const cuenta = { tipos: 0, tablas: 0, filas: 0 }
  page.on('request', (r) => {
    const url = r.url()
    if (/\/rest\/v1\/tipos_cambio\?/.test(url)) cuenta.tipos += 1
    else if (/\/rest\/v1\/tablas_referencia_filas\?/.test(url)) cuenta.filas += 1
    else if (/\/rest\/v1\/tablas_referencia\?/.test(url)) cuenta.tablas += 1
  })
  return cuenta
}

async function abrirEditor(page: Page, origenId: string) {
  await page.goto(`/configuracion/cotizacion?seccion=formula&origen=${origenId}`)
  await expect(page.getByRole('heading', { name: 'Fórmula', level: 2 })).toBeVisible()
  await page
    .getByRole('region', { name: 'Borrador' })
    .getByRole('button', { name: 'Editar', exact: true })
    .click()
  await expect(filas(page)).toBeVisible()
}

test('E6: con 600 filas, abrir hace 3 pedidos de lo de prueba y ninguno más al filtrar ni al aplicar', async ({
  page,
}, info) => {
  await entrar(page, duena, { fresco: true })
  const cuenta = contar(page)
  const desde = Date.now()
  await abrirEditor(page, grande.id)
  await expect(fila(page, 'fila_495')).toBeVisible()
  await expect(fila(page, 't_1').locator('[data-cifra]')).toHaveText('1')
  const ms = Date.now() - desde
  expect(cuenta).toEqual({ tipos: 1, tablas: 1, filas: 1 })
  await expect(filas(page).locator('li[data-fila]')).toHaveCount(500)
  const nodos = await filas(page).evaluate((lista) => lista.querySelectorAll('*').length + 1)
  info.annotations.push({
    type: 'medida',
    description: `${String(nodos)} nodos con 500 filas, ${String(ms)} ms hasta la fila 495`,
  })
  expect(nodos).toBeLessThanOrEqual(TOPE_DE_NODOS_CON_500)

  await page.getByRole('searchbox', { name: 'Buscar fila' }).fill('fila_599')
  await expect(fila(page, 'fila_599')).toBeVisible()
  await fila(page, 'fila_599').getByRole('button', { name: 'Editar Fila 599' }).click()
  await page.getByRole('textbox', { name: 'Texto de Fila 599' }).fill('=remate*2')
  await fila(page, 'fila_599').getByRole('button', { name: 'Aplicar', exact: true }).click()
  await expect(previa(page).getByText('Total en dólares')).toBeVisible()
  expect(cuenta).toEqual({ tipos: 1, tablas: 1, filas: 1 })
})

test('E6: una tabla de 999 filas se usa; las de 1.000 y 1.001 dan su aviso y no se usan', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirEditor(page, enormes.id)
  await expect(fila(page, 't_1').locator('[data-cifra]')).toHaveText('1')
  for (const sufijo of ['1000', '1001']) {
    await expect(previa(page)).toContainText(
      `La tabla «${claveDeVolumen(proyecto, sufijo)}» tiene 1.000 filas o más: la vista previa no la lee.`,
    )
  }
  await expect(fila(page, 't_2')).toContainText('La tabla de referencia no tiene filas.')
  await expect(fila(page, 't_3')).toContainText('La tabla de referencia no tiene filas.')
})

test('E6: dos tablas de 600 filas se leen enteras, en dos pedidos de filas', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  const cuenta = contar(page)
  await abrirEditor(page, dosDeSeiscientas.id)
  await expect(fila(page, 't_1').locator('[data-cifra]')).toHaveText('1')
  await expect(fila(page, 't_2').locator('[data-cifra]')).toHaveText('1')
  await expect(previa(page)).not.toContainText('no se pudo leer entera')
  expect(cuenta).toEqual({ tipos: 1, tablas: 1, filas: 2 })
})
