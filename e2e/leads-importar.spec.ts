import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { formatearNumero } from '../src/shared/lib/formato'
import { admin } from './soporte/base'
import { aLaVista } from './soporte/inventario'
import { borrarLeadsDePrueba, camposDeLead, exigir } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'

// Importar leads desde un CSV (parte 8) contra la app compilada y el Supabase local: el archivo de
// ejemplo, un archivo con filas buenas y malas (las válidas entran, las demás se explican), descargar los
// errores y volver a subirlos, importar dos veces el mismo archivo y una red que se corta a mitad.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
// Lo que bajó «Descargar errores» en el test de las filas buenas y malas, para corregirlo en el siguiente.
let erroresDescargados = ''

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await limpiarListado(t)
})

const csv = (lineas: string[]) => Buffer.from(`﻿${lineas.join('\r\n')}\r\n`, 'utf8')

async function subir(page: Page, nombre: string, contenido: Buffer): Promise<void> {
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: nombre, mimeType: 'text/csv', buffer: contenido })
}

const nacional = () => telefonoAlAzar()
const leadsDeLaPrueba = async (patron: string) => {
  const { data, error } = await admin()
    .from('leads')
    .select('id, nombre')
    .like('nombre', patron)
    .is('eliminado_en', null)
  exigir(error, 'leer lo importado')
  return data ?? []
}

async function irAImportar(page: Page): Promise<void> {
  await page.goto('/leads/importar')
  await expect(page.getByRole('heading', { name: 'Importar leads', level: 1 })).toBeVisible()
}

const resumen = (page: Page, texto: string | RegExp) => aLaVista(page.getByText(texto))

test('sin leads.crear no se ofrece importar y la pantalla lo dice', async ({ page }) => {
  await entrar(page, t.personas.sinCrear)
  await page.goto('/leads')
  await expect(page.getByRole('link', { name: 'Importar' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'CSV' })).toHaveCount(0)
  await page.goto('/leads/importar')
  await expect(page.getByText('No tienes permiso para importar leads.')).toBeVisible()
})

test('el archivo de ejemplo trae las columnas del layout de hoy', async ({ page }) => {
  await entrar(page, t.personas.duena)
  await irAImportar(page)
  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Descargar archivo de ejemplo' }).click(),
  ])
  expect(descarga.suggestedFilename()).toBe('plantilla-de-leads.csv')
  const texto = readFileSync(await descarga.path(), 'utf8')
  expect(texto.startsWith('﻿Nombre;Teléfono;Tipo;Origen;')).toBe(true)
  const activos = (await camposDeLead()).filter((c) => c.activo).map((c) => c.etiqueta)
  const encabezado = (texto.split('\r\n')[0] ?? '').replace('﻿', '').split(';')
  expect([...encabezado.slice(4)].sort()).toEqual([...activos].sort())
})

test('filas buenas y malas: las válidas entran y las demás se explican; los errores se corrigen y se vuelven a subir', async ({
  page,
}) => {
  const bueno1 = nacional()
  const bueno2 = nacional()
  const repetido = nacional()
  const existente = `+${t.telefonoDeCarlos}`
  await entrar(page, t.personas.duena)
  await irAImportar(page)
  await subir(
    page,
    'leads.csv',
    csv([
      'Nombre;Teléfono;Tipo;Color E2E;Ciudad de nacimiento E2E',
      `E2E Importada Uno;${bueno1};Prospecto;rojo;`,
      `E2E Importada Dos;${bueno2};Cliente;azul;`,
      `;${nacional()};Prospecto;;`,
      'E2E Con Notación;5.917E+10;Prospecto;;',
      `E2E Repetida;${bueno1};Prospecto;;`,
      `E2E Con Opción;${repetido};Prospecto;;Atlantis`,
      `E2E Ya Existía;${existente};Prospecto;;`,
    ]),
  )

  // Las columnas: todas emparejadas por nombre.
  await expect(page.getByRole('combobox', { name: 'Columna «Nombre»' })).toHaveValue('nombre')
  await expect(page.getByRole('combobox', { name: 'Columna «Teléfono»' })).toHaveValue(
    'telefono_principal',
  )
  await page.getByRole('button', { name: 'Ver la vista previa' }).click()

  // La vista previa: cada fila con su estado.
  await expect(resumen(page, '7 filas')).toBeVisible()
  await expect(page.getByText('3 listas y 4 con errores.')).toBeVisible()
  // Con más errores que filas listas, arranca mostrando sólo los errores.
  const soloErrores = page.getByRole('button', { name: 'Solo con errores' })
  await expect(soloErrores).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Escribe el nombre.')).toBeVisible()
  await expect(page.getByText(/notación científica/)).toBeVisible()
  await expect(page.getByText(/ya está en la fila 2 del archivo/)).toBeVisible()
  await expect(page.getByText(/«Atlantis» no es una de las opciones/)).toBeVisible()
  await expect(page.getByText('E2E Importada Uno')).toHaveCount(0)
  await soloErrores.click()
  await expect(page.getByText('E2E Importada Uno')).toBeVisible()

  await page.getByRole('button', { name: 'Importar 3 leads' }).click()
  await expect(page.getByText('Entraron 2 leads a tu cartera.')).toBeVisible()
  await expect(page.getByText('2 importados')).toBeVisible()
  await expect(page.getByText('1 ya existían')).toBeVisible()
  await expect(page.getByText('4 rechazados')).toBeVisible()
  expect((await leadsDeLaPrueba('E2E Importada %')).map((l) => l.nombre).sort()).toEqual([
    'E2E Importada Dos',
    'E2E Importada Uno',
  ])

  // Los errores: un CSV con la fila y el motivo, que se corrige y se vuelve a subir.
  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Descargar errores' }).click(),
  ])
  expect(descarga.suggestedFilename()).toBe('leads-rechazados.csv')
  erroresDescargados = readFileSync(await descarga.path(), 'utf8').replace('\uFEFF', '')
  const lineas = erroresDescargados.split('\r\n').filter((l) => l !== '')
  expect(lineas[0]).toBe('Fila;Motivo;Nombre;Teléfono;Tipo;Color E2E;Ciudad de nacimiento E2E')
  expect(erroresDescargados).toContain('Nombre: Escribe el nombre.')
  expect(erroresDescargados).toContain('Ese teléfono ya existe.')
  expect(lineas).toHaveLength(6)
})

test('los errores se corrigen y se vuelven a subir; el mismo archivo otra vez no duplica', async ({
  page,
}) => {
  const lineas = erroresDescargados.split('\r\n').filter((l) => l !== '')
  const corregido = [
    'Fila;Motivo;Nombre;Teléfono;Tipo;Color E2E;Ciudad de nacimiento E2E',
    ...lineas.slice(1).map((linea, i) => {
      const celdas = linea.split(';')
      return [celdas[0], '', `E2E Corregida ${String(i)}`, nacional(), 'Prospecto', '', ''].join(
        ';',
      )
    }),
  ]
  await entrar(page, t.personas.duena)
  await irAImportar(page)
  await subir(page, 'corregidos.csv', csv(corregido))
  // «Fila» y «Motivo» no son datos: se ignoran y se dice.
  await expect(page.getByText(/La columna «Motivo» no corresponde a ningún dato/)).toBeVisible()
  await page.getByRole('button', { name: 'Ver la vista previa' }).click()
  await page.getByRole('button', { name: 'Importar 5 leads' }).click()
  await expect(page.getByText('Entraron 5 leads a tu cartera.')).toBeVisible()
  expect(await leadsDeLaPrueba('E2E Corregida %')).toHaveLength(5)

  // El mismo archivo otra vez: todo «ya existe» y nada se duplica.
  await page.getByRole('button', { name: 'Importar otro archivo' }).click()
  await expect(page.getByRole('button', { name: 'Elegir archivo CSV' })).toBeVisible()
  await subir(page, 'corregidos.csv', csv(corregido))
  await page.getByRole('button', { name: 'Ver la vista previa' }).click()
  await page.getByRole('button', { name: 'Importar 5 leads' }).click()
  await expect(page.getByText('No entró ningún lead.')).toBeVisible()
  await expect(page.getByText('5 ya existían')).toBeVisible()
  expect(await leadsDeLaPrueba('E2E Corregida %')).toHaveLength(5)
})

test('un archivo que no es un CSV de texto se rechaza diciendo cómo guardarlo', async ({
  page,
}) => {
  await entrar(page, t.personas.duena)
  await irAImportar(page)
  await subir(
    page,
    'leads.csv',
    Buffer.from([0x4e, 0x6f, 0x6d, 0x62, 0x72, 0x65, 0x3b, 0x54, 0xe9, 0x6c]),
  )
  await expect(page.getByText(/CSV UTF-8/)).toBeVisible()
  await subir(page, 'vacio.csv', Buffer.from('Nombre;Teléfono\r\n', 'utf8'))
  await expect(
    page.getByText('el archivo tiene los encabezados pero ninguna fila', { exact: false }),
  ).toBeVisible()
  await subir(page, 'raro.csv', csv(['__proto__;Teléfono', 'x;70011002']))
  await expect(page.getByText(/Falta una columna para: Nombre/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ver la vista previa' })).toBeDisabled()
})

test('se pierde la respuesta de un lote: reintentar no duplica', async ({ page }) => {
  test.setTimeout(120_000)
  const filas = Array.from(
    { length: 60 },
    (_, i) => `E2E Masa ${String(i)};${nacional()};Prospecto;;`,
  )
  await entrar(page, t.personas.duena)
  await irAImportar(page)
  await subir(
    page,
    'masa.csv',
    csv(['Nombre;Teléfono;Tipo;Color E2E;Ciudad de nacimiento E2E', ...filas]),
  )
  await page.getByRole('button', { name: 'Ver la vista previa' }).click()

  // El segundo lote llega a la base, pero la respuesta se pierde.
  let lotes = 0
  await page.route('**/leads/importar', async (ruta) => {
    const peticion = ruta.request()
    if (peticion.method() === 'POST' && peticion.headers()['next-action']) {
      lotes += 1
      if (lotes === 2) {
        await ruta.fetch()
        await ruta.abort('failed')
        return
      }
    }
    await ruta.continue()
  })
  await page.getByRole('button', { name: 'Importar 60 leads' }).click()
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible()
  expect(await leadsDeLaPrueba('E2E Masa %')).toHaveLength(60)

  await page.unroute('**/leads/importar')
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(page.getByText('Entraron 60 leads a tu cartera.')).toBeVisible()
  expect(await leadsDeLaPrueba('E2E Masa %')).toHaveLength(60)
})

test('lo que pesa: el asistente trae poco y papaparse espera a que se elija un archivo', async ({
  page,
}, info) => {
  await entrar(page, t.personas.duena)
  const kb = (bytes: number) => formatearNumero(bytes / 1024, { decimales: 1 })
  const largo = async (ruta: string) => (await (await page.goto(ruta))?.body())?.length ?? 0
  const perfil = await largo('/perfil')
  const importar = await largo('/leads/importar')
  const listado = await largo('/leads')
  const resumen = `importar +${kb(importar - perfil)} KB sobre /perfil · listado ${kb(listado - perfil)} KB sobre /perfil`
  console.warn(`[peso] ${info.project.name}: ${resumen}`)
  info.annotations.push({ type: 'KB de importar', description: resumen })
  expect(importar - perfil).toBeLessThan(40 * 1024)

  // papaparse no viaja con la pantalla: se pide recién al elegir un archivo.
  const scripts: string[] = []
  page.on('response', (respuesta) => {
    if (respuesta.url().includes('/_next/static/') && respuesta.url().endsWith('.js')) {
      scripts.push(respuesta.url())
    }
  })
  await irAImportar(page)
  const alAbrir = scripts.length
  await subir(page, 'a.csv', csv(['Nombre;Teléfono', `E2E Peso;${nacional()}`]))
  await expect(page.getByRole('button', { name: 'Ver la vista previa' })).toBeVisible()
  expect(scripts.length).toBeGreaterThan(alAbrir)
})
