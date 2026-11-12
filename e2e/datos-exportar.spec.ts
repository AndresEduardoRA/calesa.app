// @sin-celular-archivo: pantalla nueva con un solo camino feliz en escritorio (.claude/rules/e2e.md › «Pruebas: sólo lo clave»); las tarjetas y el menú no cambian con el ancho
import { readFileSync } from 'node:fs'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { borrarLeadsDePrueba, crearLead, idDe } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import {
  AJENO_CARLOS,
  CI_DE_CARLOS,
  limpiarListado,
  nombre,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { sql } from './soporte/sql'

// Exportar todo desde `/datos` (9.05) contra la app compilada y el Supabase local: la dueña llega por el menú, descarga los leads y el
// archivo trae lo ajeno con el teléfono enmascarado y sin lo privado (lo suyo, completo); una asesora sin `datos.exportar.todo` ve sólo
// «Mis leads». El permiso, el cupo por hora y las filas los prueban `supabase/tests/areas/datos/` y `route.test.ts`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
let propia: { corto: string; nacional: string }

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  // Un lead de la cartera de esta dueña con un nombre de este proyecto: el otro proyecto corre a la vez y lo suyo es ajeno para ella.
  const nacional = telefonoAlAzar()
  propia = { corto: `Propia Exportar ${info.project.name}`, nacional }
  await crearLead({
    nombre: propia.corto,
    telefono: `${t.codigo}${nacional}`,
    deQuien: t.personas.duena,
  })
  // El cupo es de 3 por hora y por persona: un reintento no tiene que chocar con lo que dejó la corrida anterior.
  const duena = await idDe(t.personas.duena)
  sql(`delete from public.actividad where accion = 'datos.exportado' and actor_id = '${duena}'`)
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await limpiarListado(t)
})

// Las líneas del CSV (sin el BOM) y la columna «Teléfono» por su encabezado. Ninguna fila del terreno lleva `;` ni comillas.
function leerCsv(texto: string): { lineas: string[]; telefonoDe: (linea: string) => string } {
  const [encabezado = '', ...lineas] = texto.replace(/^﻿/, '').split(/\r?\n/)
  const columna = encabezado.split(';').indexOf('Teléfono')
  expect(columna).toBeGreaterThanOrEqual(0)
  return { lineas, telefonoDe: (linea) => linea.split(';')[columna] ?? '' }
}

test('la dueña descarga los leads: lo ajeno enmascarado y sin lo privado, lo suyo completo', async ({
  page,
}) => {
  await entrar(page, t.personas.duena)
  await page.getByRole('button', { name: 'Menú de Dalia Alta' }).click()
  await page.getByRole('menuitem', { name: 'Datos' }).click()
  await expect(page).toHaveURL(/\/datos$/)
  await expect(page.getByRole('heading', { name: 'Datos', level: 1 })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Vehículos' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Cotizaciones' })).toBeVisible()

  const leads = page.getByRole('region', { name: 'Leads', exact: true })
  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    leads.getByRole('button', { name: 'Descargar' }).click(),
  ])
  expect(descarga.suggestedFilename()).toMatch(/^leads-todos-\d{4}-\d{2}-\d{2}\.csv$/)
  const texto = readFileSync(await descarga.path(), 'utf8')
  expect(texto.startsWith('﻿')).toBe(true)
  await expect(leads.getByText(/^Descargado: leads-todos-/)).toBeVisible()

  const { lineas, telefonoDe } = leerCsv(texto)
  const nacionalDeCarlos = t.telefonoDeCarlos.slice(t.codigo.length)
  const deCarlos = lineas.filter((linea) => linea.includes(nombre(AJENO_CARLOS)))
  expect(deCarlos.length).toBeGreaterThan(0)
  for (const linea of deCarlos) {
    // La máscara de la base: tres al frente, puntos y dos al final.
    expect(telefonoDe(linea)).toMatch(/^.{3}•{2,}\d{2}$/)
  }
  expect(texto).not.toContain(nacionalDeCarlos)
  expect(texto).not.toContain(CI_DE_CARLOS)

  // El control: lo de su cartera sale entero y sin máscara.
  const suya = lineas.find((linea) => linea.includes(nombre(propia.corto)))
  expect(suya).toBeDefined()
  expect(telefonoDe(suya ?? '')).toBe(propia.nacional)
  expect(suya).not.toContain('•')
})

test('una asesora sin exportar todo ve sólo «Mis leads», apagada con su motivo', async ({
  page,
}) => {
  await entrar(page, t.personas.berta)
  await page.goto('/datos')
  const misLeads = page.getByRole('region', { name: 'Mis leads' })
  await expect(misLeads).toBeVisible()
  await expect(misLeads.getByText('Tu rol no exporta leads.')).toBeVisible()
  await expect(misLeads.getByRole('link', { name: 'Ir a Leads' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Todo' })).toHaveCount(0)
  for (const titulo of ['Leads', 'Vehículos', 'Cotizaciones']) {
    await expect(page.getByRole('region', { name: titulo, exact: true })).toHaveCount(0)
  }
})
