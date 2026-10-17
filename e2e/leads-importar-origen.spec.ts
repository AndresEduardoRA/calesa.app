import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { borrarLeadsDePrueba, exigir } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import {
  borrarOrigenesDePrueba,
  origenesEnLaBase,
  sembrarOrigen,
  type OrigenEnLaBase,
} from './soporte/origenes-de-lead'

// El origen en un CSV (9f-1): una celda con un origen que no existe, o que está desactivado, rechaza esa
// fila y dice cuáles hay; nunca se crea un origen por una errata. Una celda vacía toma el que se elige
// para todo el archivo.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
let apagado: OrigenEnLaBase

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  apagado = await sembrarOrigen(`E2E 9f Apagado ${info.project.name}`, false)
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await borrarOrigenesDePrueba()
  await limpiarListado(t)
})

const csv = (lineas: string[]) => Buffer.from(`﻿${lineas.join('\r\n')}\r\n`, 'utf8')

async function subir(page: Page, contenido: Buffer): Promise<void> {
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'origenes.csv', mimeType: 'text/csv', buffer: contenido })
}

test('un origen que no existe o está desactivado rechaza la fila, y no se crea ninguno', async ({
  page,
}) => {
  const antes = await origenesEnLaBase()
  const activos = antes.filter((origen) => origen.activo)
  const primero = activos[0]
  if (!primero) throw new Error('No hay orígenes activos para el caso')

  await entrar(page, t.personas.duena)
  await page.goto('/leads/importar')
  await subir(
    page,
    csv([
      'Nombre;Teléfono;Origen',
      `E2E Origen Uno;${telefonoAlAzar()};${primero.nombre}`,
      `E2E Origen Dos;${telefonoAlAzar()};Radio inventada`,
      `E2E Origen Tres;${telefonoAlAzar()};${apagado.nombre}`,
      `E2E Origen Cuatro;${telefonoAlAzar()};`,
    ]),
  )
  await expect(page.getByRole('combobox', { name: 'Columna «Origen»' })).toHaveValue(
    'origen_lead_id',
  )
  const elegido = await page.getByLabel('Origen para las filas sin origen').inputValue()
  await page.getByRole('button', { name: 'Ver la vista previa' }).click()

  const nombres = activos.map((origen) => origen.nombre)
  const lista = `Los activos: ${nombres.slice(0, 10).join(', ')}${nombres.length > 10 ? ` y ${String(nombres.length - 10)} más` : ''}.`
  await expect(
    page.getByText(`El origen «Radio inventada» no existe o está desactivado. ${lista}`),
  ).toBeVisible()
  await expect(
    page.getByText(`El origen «${apagado.nombre}» no existe o está desactivado. ${lista}`),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Importar 2 leads' }).click()
  await expect(page.getByText('Entraron 2 leads a tu cartera.')).toBeVisible()
  const { data, error } = await admin()
    .from('leads')
    .select('nombre, origen_lead_id')
    .like('nombre', 'E2E Origen %')
    .is('eliminado_en', null)
    .order('nombre')
    .returns<{ nombre: string; origen_lead_id: string | null }[]>()
  exigir(error, 'leer lo importado')
  expect(data).toEqual([
    { nombre: 'E2E Origen Cuatro', origen_lead_id: elegido },
    { nombre: 'E2E Origen Uno', origen_lead_id: primero.id },
  ])
  // Ninguna errata creó un origen.
  expect((await origenesEnLaBase()).map((origen) => origen.id).sort()).toEqual(
    antes.map((origen) => origen.id).sort(),
  )
})
