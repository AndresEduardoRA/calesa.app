import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { borrarLeadsDePrueba, exigir } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'

// El país del teléfono en la importación CSV: «País» se completa con el del número sólo donde la
// celda viene vacía, y la vista previa lo dice antes de importar.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
let paisDeLaEmpresa = ''

test.beforeAll(async ({}, info) => {
  t = await prepararListado(`${info.project.name}-pais`)
  const { data, error } = await admin()
    .from('ajustes_empresa')
    .select('pais')
    .eq('id', 1)
    .single<{ pais: string }>()
  exigir(error, 'leer el país de la empresa')
  paisDeLaEmpresa = data?.pais ?? ''
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await limpiarListado(t)
})

const csv = (lineas: string[]) => Buffer.from(`﻿${lineas.join('\r\n')}\r\n`, 'utf8')

async function subir(page: Page, contenido: Buffer): Promise<void> {
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'paises.csv', mimeType: 'text/csv', buffer: contenido })
}

test('«País» se completa con el del teléfono sólo donde viene vacío, y la vista previa lo dice', async ({
  page,
}) => {
  const [a, b, c] = [telefonoAlAzar(), telefonoAlAzar(), telefonoAlAzar()]
  await entrar(page, t.personas.duena)
  await page.goto('/leads/importar')
  await expect(page.getByRole('heading', { name: 'Importar leads', level: 1 })).toBeVisible()
  await subir(
    page,
    csv([
      'Nombre;Teléfono;País',
      `E2E País Uno;+54 9 ${a};`,
      `E2E País Dos;+56 9 ${b};Perú`,
      `E2E País Tres;${c};`,
    ]),
  )
  await page.getByRole('button', { name: 'Ver la vista previa' }).click()

  // Sólo se anuncia donde se completó: la celda con «Perú» no.
  await expect(page.getByText('País: Argentina (del teléfono)')).toBeVisible()
  await expect(page.getByText(`País: ${paisDeLaEmpresa} (del teléfono)`)).toBeVisible()
  await expect(page.getByText('(del teléfono)')).toHaveCount(2)

  await page.getByRole('button', { name: 'Importar 3 leads' }).click()
  await expect(page.getByText('Entraron 3 leads a tu cartera.').first()).toBeVisible()

  const { data, error } = await admin()
    .from('leads')
    .select('nombre, atributos')
    .like('nombre', 'E2E País %')
    .returns<{ nombre: string; atributos: Record<string, unknown> }[]>()
  exigir(error, 'leer lo importado')
  const paisDe = (nombre: string) => data?.find((l) => l.nombre === nombre)?.atributos['pais']
  expect(paisDe('E2E País Uno')).toBe('Argentina')
  expect(paisDe('E2E País Dos')).toBe('Perú')
  expect(paisDe('E2E País Tres')).toBe(paisDeLaEmpresa)
})
