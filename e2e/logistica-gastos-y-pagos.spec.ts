// @sin-celular-archivo: el camino feliz del dinero de la unidad va en escritorio, como pide la fila 6.11; en el celular el panel de la unidad es el mismo drawer con tarjetas (6.01).
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import {
  borrarDinero,
  sembrarDinero,
  tipoDeCambioPorDefecto,
  type TerrenoDeDinero,
} from './soporte/dinero'

// Gastos, pagos y margen en el panel de la unidad (6.11). Tramo 1: con `logistica.gastos.ver` y `editar` se registra un gasto en otra moneda con el tipo de cambio por defecto y la lista muestra
// el equivalente que devolvió la base; el hueco «Margen» dice «Sin cotización final» y «Sin venta registrada» (nunca 0) y su real es el gasto. Quien no tiene `logistica.gastos.ver` ni
// `logistica.margen.ver` no ve ninguno de los dos bloques. El tramo 2 (pagos y confirmar) llega con la parte 2.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let terreno: TerrenoDeDinero

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarDinero(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-dinero-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dalia Dinero',
  })
  terreno = await sembrarDinero(proyecto)
})

test.afterAll(async () => {
  await borrarDinero(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const formato = (n: number) =>
  new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

test('E2E sin los permisos de dinero la unidad no dibuja «Gastos» ni «Margen»', async ({
  page,
}) => {
  await entrar(page, terreno.conLogistica, { fresco: true })
  await page.goto(`/logistica/vehiculo/${terreno.enFase.id}`)
  await expect(page.getByRole('heading', { name: terreno.enFase.titulo })).toBeVisible()
  await expect(page.getByText('Gastos', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Margen', { exact: true })).toHaveCount(0)
})

test('E2E registrar un gasto en otra moneda muestra su equivalente y el margen sin venta', async ({
  page,
}) => {
  const tipo = await tipoDeCambioPorDefecto()
  // Un monto que da un equivalente redondo con el valor de la base: 100 de la moneda base.
  const monto = Math.round(tipo.monedaPorBase * 100 * 100) / 100
  const equivalente = formato(Math.round((monto / tipo.monedaPorBase) * 100) / 100)

  await entrar(page, terreno.conDinero, { fresco: true })
  await page.goto(`/logistica/vehiculo/${terreno.enFase.id}`)
  await page.getByText('Gastos', { exact: true }).click()
  await expect(page.getByText('Esta unidad no tiene gastos registrados.')).toBeVisible()

  await page.getByRole('button', { name: 'Registrar gasto' }).click()
  const formulario = page.getByRole('dialog', { name: 'Registrar gasto' })
  await expect(formulario).toBeVisible()
  await formulario.getByLabel('Categoría').selectOption({ label: 'Flete marítimo' })
  await formulario.getByLabel('Moneda').selectOption(tipo.moneda)
  await formulario.getByLabel('Monto').fill(formato(monto))
  // El tipo por defecto de la empresa queda elegido; quien carga puede cambiarlo.
  await expect(formulario.getByLabel('Tipo de cambio')).toContainText(tipo.nombre)
  await formulario.getByRole('button', { name: 'Registrar gasto' }).click()
  await expect(formulario).toBeHidden()

  const lista = page.getByRole('list', { name: 'Gastos de la unidad' })
  await expect(lista.getByText('Flete marítimo')).toBeVisible()
  await expect(lista.getByText(/Equivale a/)).toContainText(equivalente)

  await page.getByText('Margen', { exact: true }).click()
  const margen = page.locator('[data-hueco="margen"]')
  await expect(margen.locator('[data-cifra="cotizado"]')).toContainText('Sin cotización final')
  await expect(margen.locator('[data-cifra="desviacion"]')).toContainText('Sin cotización final')
  await expect(margen.locator('[data-cifra="venta"]')).toContainText('Sin venta registrada')
  await expect(margen.locator('[data-cifra="margen"]')).toContainText('Sin venta registrada')
  await expect(margen.locator('[data-cifra="real"]')).toContainText(equivalente)
  await expect(margen.getByRole('region', { name: 'Real por categoría' })).toContainText(
    'Flete marítimo',
  )
})
