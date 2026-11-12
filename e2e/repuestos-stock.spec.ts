import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { sql } from './soporte/sql'

// El stock de un ítem de repuestos (8.10-2 y 8.10-3): en la hoja de `/repuestos/[id]`, la dueña abre «Stock» de un ítem de 3 unidades, pasa 2 a stock con una nota, la
// fila dice «En stock: 2» y el historial lista el movimiento; recargar con la URL del panel lo vuelve a abrir. Después, en la vista «Stock» de `/repuestos` la fila dice 2,
// reasigna 1 a otro proyecto (queda 1 y hay un ítem nuevo allá, en la base y en su hoja) y vende suelto lo que queda (la fila sale).
// La etiqueta no empieza con «E2E»: la limpieza de `repuestos-proyecto.spec.ts` borra esas (D12). Cada proyecto de Playwright usa la suya.
test.describe.configure({ mode: 'serial' })

const FILTRO = 'Filtro de aceite'
let etiqueta = ''
let destino = ''
let duena = ''
let proyecto = ''
const limpiar = () => {
  if (etiqueta !== '') {
    sql(`delete from repuestos_proyectos where vehiculo_etiqueta in ('${etiqueta}', '${destino}')`)
  }
}

test.beforeAll(async ({}, info) => {
  etiqueta = `Prueba stock e2e ${info.project.name}`
  destino = `Destino stock e2e ${info.project.name}`
  limpiar()
  duena = correoDePrueba(`duena-stock-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Rita Stock' })
})

test.afterAll(async () => {
  limpiar()
  await borrarPersonasDePrueba()
})

test('pasar 2 a stock desde la hoja: la fila dice cuántos y el historial lo lista', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/repuestos?panel=nuevo-proyecto')
  const nuevo = page.getByRole('dialog', { name: 'Nuevo proyecto' })
  await nuevo.getByLabel('Vehículo', { exact: true }).fill(etiqueta)
  await nuevo.getByRole('button', { name: 'Crear proyecto' }).click()
  await expect(page).toHaveURL(/\/repuestos\/[0-9a-f-]{36}$/)
  proyecto = new URL(page.url()).pathname.split('/').pop() ?? ''

  const nueva = page.getByLabel('Nuevo ítem: descripción')
  await nueva.fill(FILTRO)
  await nueva.press('Enter')
  await expect(page.getByLabel(`Descripción del ítem ${FILTRO}`)).toBeVisible()
  sql(`update repuestos_items set cantidad = 3 where proyecto_id = '${proyecto}'`)
  await page.reload()

  const fila = page.locator('[data-fila-de-item]').filter({
    has: page.getByLabel(`Descripción del ítem ${FILTRO}`),
  })
  await expect(fila.getByRole('button', { name: `Stock del ítem ${FILTRO}` })).toBeVisible()
  await expect(fila.getByText(/En stock/)).toHaveCount(0)

  await fila.getByRole('button', { name: `Stock del ítem ${FILTRO}` }).click()
  const panel = page.getByRole('dialog', { name: `Stock de «${FILTRO}»` })
  await expect(panel.getByText('Este ítem aún no tiene movimientos de stock.')).toBeVisible()
  await expect(panel.getByText('En stock: 0 de 3')).toBeVisible()
  await panel.getByLabel('Cantidad').fill('2')
  await panel.getByLabel('Nota').fill('Sobró del armado')
  await panel.getByRole('button', { name: 'Pasar a stock' }).click()

  const movimiento = panel.getByRole('listitem').filter({ hasText: 'Sobró del armado' })
  await expect(movimiento).toContainText('Pasar a stock')
  await expect(movimiento).toContainText('+2')
  await expect(panel.getByText('En stock: 2 de 3')).toBeVisible()
  await expect(panel.getByLabel('Cantidad')).toHaveValue('')
  await expect(fila.getByText('En stock: 2')).toBeVisible()

  const enLaBase = sql(
    `select i.stock_cantidad || ':' || m.motivo || ':' || m.cantidad from repuestos_items i join repuestos_stock_movimientos m on m.item_id = i.id where i.proyecto_id = '${proyecto}'`,
  )
  expect(enLaBase.trim()).toBe('2:sobrante:2')

  // Recargar con el panel en la URL lo vuelve a abrir con el movimiento.
  await page.reload()
  await expect(
    page
      .getByRole('dialog', { name: `Stock de «${FILTRO}»` })
      .getByRole('listitem')
      .filter({ hasText: 'Sobró del armado' }),
  ).toBeVisible()
})

test('en la vista «Stock»: reasignar 1 a otro proyecto y vender suelto lo que queda', async ({
  page,
}) => {
  await entrar(page, duena)
  await page.goto('/repuestos?panel=nuevo-proyecto')
  const nuevo = page.getByRole('dialog', { name: 'Nuevo proyecto' })
  await nuevo.getByLabel('Vehículo', { exact: true }).fill(destino)
  await nuevo.getByRole('button', { name: 'Crear proyecto' }).click()
  await expect(page).toHaveURL(/\/repuestos\/[0-9a-f-]{36}$/)
  const idDestino = new URL(page.url()).pathname.split('/').pop() ?? ''
  const numeroDe = (id: string) =>
    sql(`select numero from repuestos_proyectos where id = '${id}'`).trim()
  const nOrigen = numeroDe(proyecto)
  const nDestino = numeroDe(idDestino)

  await page.goto('/repuestos')
  await page
    .getByRole('navigation', { name: 'Qué ver' })
    .getByRole('link', { name: 'Stock' })
    .click()
  await expect(page).toHaveURL(/vista=stock/)
  const fila = page
    .locator('tr, li')
    .filter({ hasText: `#${nOrigen} ·` })
    .filter({ hasText: FILTRO })
  await expect(fila.getByText(/^(En stock: )?2$/)).toBeVisible()

  await fila.getByRole('button', { name: `Más acciones de ${FILTRO}` }).click()
  await page.getByRole('menuitem', { name: 'Reasignar a un proyecto' }).click()
  const reasignar = page.getByRole('dialog', { name: `Reasignar «${FILTRO}»` })
  await reasignar.getByLabel('Proyecto destino').fill(destino)
  await reasignar.getByRole('option', { name: new RegExp(`^#${nDestino} · `) }).click()
  await reasignar.getByLabel('Cantidad').fill('1')
  await reasignar.getByRole('button', { name: 'Reasignar' }).click()
  await expect(reasignar).toBeHidden()
  await expect(fila.getByText(/^(En stock: )?1$/)).toBeVisible()

  expect(
    sql(
      `select i.stock_cantidad || ':' || m.cantidad from repuestos_items i join repuestos_stock_movimientos m on m.item_id = i.id and m.motivo = 'reasignado' where i.proyecto_id = '${proyecto}'`,
    ).trim(),
  ).toBe('1:-1')
  expect(
    sql(
      `select descripcion || ':' || cantidad from repuestos_items where proyecto_id = '${idDestino}'`,
    ).trim(),
  ).toBe(`${FILTRO}:1`)
  await page.goto(`/repuestos/${idDestino}`)
  await expect(page.getByLabel(`Descripción del ítem ${FILTRO}`)).toBeVisible()

  await page.goto('/repuestos?vista=stock')
  await fila.getByRole('button', { name: `Más acciones de ${FILTRO}` }).click()
  await page.getByRole('menuitem', { name: 'Vender suelto' }).click()
  const vender = page.getByRole('dialog', { name: `Vender suelto «${FILTRO}»` })
  await vender.getByLabel('Cantidad').fill('1')
  await vender.getByRole('button', { name: 'Vender suelto' }).click()
  await expect(vender).toBeHidden()
  await expect(fila).toHaveCount(0)
  expect(
    sql(
      `select i.stock_cantidad || ':' || m.cantidad from repuestos_items i join repuestos_stock_movimientos m on m.item_id = i.id and m.motivo = 'vendido' where i.proyecto_id = '${proyecto}'`,
    ).trim(),
  ).toBe('0:-1')
})
