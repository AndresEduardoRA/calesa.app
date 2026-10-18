import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { borrarLeadsDePrueba, exigir } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import {
  PREFIJO_DE_TIPO_E2E,
  borrarTiposDePrueba,
  sembrarTipo,
  tipoDeFabrica,
  tiposEnLaBase,
  type TipoEnLaBase,
} from './soporte/tipos-de-lead'

// El tipo en un CSV (9j): una celda con el nombre o la clave de un tipo activo lo pone; uno que no existe o está desactivado
// rechaza esa fila y dice cuáles hay; nunca se crea un tipo por una errata. Una celda vacía toma el que se elige para todo el
// archivo (el de por defecto, el primero activo de la clase prospecto).
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
let mayorista: TipoEnLaBase
let apagado: TipoEnLaBase

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  mayorista = await sembrarTipo(
    `${PREFIJO_DE_TIPO_E2E} Mayorista CSV ${info.project.name}`,
    'cliente',
  )
  apagado = await sembrarTipo(
    `${PREFIJO_DE_TIPO_E2E} Apagado CSV ${info.project.name}`,
    'cliente',
    false,
  )
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await borrarTiposDePrueba()
  await limpiarListado(t)
})

const csv = (lineas: string[]) => Buffer.from(`﻿${lineas.join('\r\n')}\r\n`, 'utf8')

async function subir(page: Page, contenido: Buffer): Promise<void> {
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'tipos.csv', mimeType: 'text/csv', buffer: contenido })
}

test('un tipo que no existe o está desactivado rechaza la fila, y no se crea ninguno', async ({
  page,
}) => {
  const antes = await tiposEnLaBase()
  const activos = antes.filter((tipo) => tipo.activo)
  const porDefecto = await tipoDeFabrica('prospecto')

  await entrar(page, t.personas.duena)
  await page.goto('/leads/importar')
  await subir(
    page,
    csv([
      'Nombre;Teléfono;Tipo',
      `E2E Tipo Uno;${telefonoAlAzar()};${mayorista.nombre}`,
      `E2E Tipo Dos;${telefonoAlAzar()};Mayorista inventado`,
      `E2E Tipo Tres;${telefonoAlAzar()};${apagado.nombre}`,
      `E2E Tipo Cuatro;${telefonoAlAzar()};`,
      `E2E Tipo Cinco;${telefonoAlAzar()};${mayorista.clave}`,
    ]),
  )
  await expect(page.getByRole('combobox', { name: 'Columna «Tipo»' })).toHaveValue('tipo_lead_id')
  // El que se elige para las filas sin tipo arranca en el de por defecto.
  await expect(page.getByLabel('Tipo para las filas sin tipo')).toHaveValue(porDefecto.id)
  await page.getByRole('button', { name: 'Ver la vista previa' }).click()

  const nombres = activos.map((tipo) => tipo.nombre)
  const lista = `Los activos: ${nombres.slice(0, 10).join(', ')}${nombres.length > 10 ? ` y ${String(nombres.length - 10)} más` : ''}.`
  await expect(
    page.getByText(`El tipo «Mayorista inventado» no existe o está desactivado. ${lista}`),
  ).toBeVisible()
  await expect(
    page.getByText(`El tipo «${apagado.nombre}» no existe o está desactivado. ${lista}`),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Importar 3 leads' }).click()
  await expect(page.getByText('Entraron 3 leads a tu cartera.')).toBeVisible()
  const { data, error } = await admin()
    .from('leads')
    .select('nombre, tipo_lead_id')
    .like('nombre', 'E2E Tipo %')
    .is('eliminado_en', null)
    .order('nombre')
    .returns<{ nombre: string; tipo_lead_id: string }[]>()
  exigir(error, 'leer lo importado')
  expect(data).toEqual([
    { nombre: 'E2E Tipo Cinco', tipo_lead_id: mayorista.id },
    { nombre: 'E2E Tipo Cuatro', tipo_lead_id: porDefecto.id },
    { nombre: 'E2E Tipo Uno', tipo_lead_id: mayorista.id },
  ])
  // Ninguna errata creó un tipo.
  expect((await tiposEnLaBase()).map((tipo) => tipo.id).sort()).toEqual(
    antes.map((tipo) => tipo.id).sort(),
  )
})
