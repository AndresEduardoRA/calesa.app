import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { borrarPersonasDePrueba, correoDePrueba, crearDuenaDePrueba } from './soporte/base'
import { sql } from './soporte/sql'

// La pestaña «Pagos» de `/repuestos/[id]` (8.13-5): la dueña registra el pago del cliente en el Drawer; la fila queda en la base con el proyecto y el monto en base; al
// confirmarlo queda sellada (sin «Editar» ni «Eliminar»: sólo «Anular pago», con un motivo, que lo saca de la lista y lo deja anulado en la base); con el proyecto cerrado
// «Registrar pago» se apaga con su motivo. Quien no tiene `repuestos.costos.ver` no ve la pestaña (`pestanas.test.ts`). La guarda de fase de anular la prueba la base.
// La etiqueta no empieza con «E2E»: la limpieza de `repuestos-proyecto.spec.ts` borra esas. Borrar el proyecto borra sus pagos en cascada.
test.describe.configure({ mode: 'serial' })

// La moneda base del seed (`ajustes_empresa.moneda_base`, `DEFAULT 'USD'`): el pago va en la base, así `monto_base = monto`.
const formato = (n: number) =>
  new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

let etiqueta = ''
let duena = ''
const limpiar = () => {
  if (etiqueta !== '') {
    sql(`delete from repuestos_proyectos where vehiculo_etiqueta = '${etiqueta}'`)
  }
}

test.beforeAll(async ({}, info) => {
  const nombre = info.project.name
  etiqueta = `Prueba pagos e2e ${nombre}`
  limpiar()
  await borrarPersonasDePrueba()
  duena = correoDePrueba(`duena-pagos-${nombre}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Rita Pagos' })
})

test.afterAll(async () => {
  limpiar()
  await borrarPersonasDePrueba()
})

test('E2E la pestaña «Pagos» registra, confirma y anula el pago del cliente; cerrado, no registra', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/repuestos?panel=nuevo-proyecto')
  const nuevo = page.getByRole('dialog', { name: 'Nuevo proyecto' })
  await nuevo.getByLabel('Vehículo', { exact: true }).fill(etiqueta)
  await nuevo.getByRole('button', { name: 'Crear proyecto' }).click()
  await expect(page).toHaveURL(/\/repuestos\/[0-9a-f-]{36}$/)
  const proyecto = new URL(page.url()).pathname.split('/').pop() ?? ''

  await page.getByRole('tab', { name: 'Pagos' }).click()
  await expect(page).toHaveURL(/[?&]pestana=pagos/)
  await expect(page.getByText('Este proyecto no tiene pagos registrados.')).toBeVisible()

  await page.getByRole('button', { name: 'Registrar pago' }).click()
  const formulario = page.getByRole('dialog', { name: 'Registrar pago' })
  await expect(formulario).toBeVisible()
  await formulario.getByLabel('Concepto').fill('Anticipo del cliente')
  await formulario.getByLabel('Monto').fill(formato(250))
  await formulario.getByRole('button', { name: 'Registrar pago' }).click()
  await expect(formulario).toBeHidden()
  await expect(page.getByText('Pago registrado.')).toBeVisible()

  const lista = page.getByRole('list', { name: 'Pagos del proyecto' })
  await expect(lista.getByText('Anticipo del cliente')).toBeVisible()
  await expect(lista.getByText('Sin confirmar')).toBeVisible()
  await page.reload()
  await expect(lista.getByText('Anticipo del cliente')).toBeVisible()
  expect(
    sql(
      `select proyecto_repuestos_id || ' ' || coalesce(vehiculo_id::text, '-') || ' ' || monto_base from pagos where proyecto_repuestos_id = '${proyecto}'`,
    ).trim(),
  ).toBe(`${proyecto} - 250.00`)

  await page.getByRole('button', { name: 'Confirmar pago' }).click()
  const confirmar = page.getByRole('dialog', { name: 'Confirmar el pago «Anticipo del cliente»' })
  await expect(confirmar).toContainText('se anula con un motivo')
  await confirmar.getByRole('button', { name: 'Confirmar pago' }).click()
  await expect(confirmar).toBeHidden()
  await expect(lista.getByText(/Confirmado por Rita Pagos/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Confirmar pago' })).toHaveCount(0)
  await page.getByRole('button', { name: /Más acciones de pago Anticipo del cliente/ }).click()
  await expect(page.getByRole('menuitem', { name: 'Editar' })).toHaveCount(0)
  await expect(page.getByRole('menuitem', { name: 'Eliminar' })).toHaveCount(0)
  await page.getByRole('menuitem', { name: 'Anular pago' }).click()
  const anular = page.getByRole('dialog', { name: 'Anular el pago «Anticipo del cliente»' })
  await expect(anular).toContainText('deja de contar como pago del cliente')
  await anular.getByLabel('Motivo').fill('Rebotó el depósito')
  await anular.getByRole('button', { name: 'Anular pago' }).click()
  await expect(anular).toBeHidden()
  await expect(page.getByText('Pago anulado.')).toBeVisible()
  await expect(page.getByText('Este proyecto no tiene pagos registrados.')).toBeVisible()
  expect(
    sql(
      `select count(*) from pagos where proyecto_repuestos_id = '${proyecto}' and eliminado_en is not null`,
    ).trim(),
  ).toBe('1')

  // Con el proyecto cerrado, «Registrar pago» sigue a la vista pero apagado, con su motivo.
  sql(`update repuestos_proyectos set cerrado_en = now() where id = '${proyecto}'`)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Registrar pago' })).toBeDisabled()
  await expect(
    page.getByText('El proyecto está cerrado: reábrelo para registrar pagos.'),
  ).toBeVisible()
})
