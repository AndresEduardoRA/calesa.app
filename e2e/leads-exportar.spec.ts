import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  admin,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
  type PermisoDePrueba,
} from './soporte/base'
import { aLaVista } from './soporte/inventario'
import { borrarLeadsDePrueba, camposDeLead, crearLead, exigir, idDe } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import {
  AJENO_CARLOS,
  CI_DE_CARLOS,
  PROPIO_BERTA,
  PROPIO_DALIA,
  irALeads,
  limpiarListado,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'

// Exportar leads a CSV (parte 8) contra la app compilada y el Supabase local: qué entra en el archivo
// (sólo la cartera, aunque se vea «todos» o se fuerce la URL), cómo se escribe (BOM, columnas del
// layout, celdas que empiezan por una fórmula), quién ve el botón y los topes (por hora y 5.000).
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
let exporta: string
let masivo: string

// Lo que `exporta` tiene en su cartera con una celda peligrosa en el campo «Color E2E».
const PELIGROSAS = [
  { nombre: 'Peligro Igual', color: "=cmd|' /C calc'!A0" },
  { nombre: 'Peligro Mas', color: '+1+1' },
  { nombre: 'Peligro Menos', color: '-2+3' },
  { nombre: 'Peligro Arroba', color: '@SUMA(A1)' },
  { nombre: 'Peligro Texto', color: 'Dijo "ok", luego\nsalto 😀' },
]

async function personaConPermisos(
  proyecto: string,
  clave: string,
  nombre: string,
  permisos: PermisoDePrueba[],
): Promise<string> {
  const email = correoDePrueba(`${clave}-exportar-${proyecto}`)
  await crearPersona({ email, contrasena: CONTRASENA, nombre, invitada: true })
  await darRolDePrueba({
    email,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Exportar ${clave} ${proyecto}`,
      clave: `e2e_exportar_${clave}_${proyecto.replaceAll(/[^a-z0-9]/g, '_')}`,
    },
    permisos,
  })
  return email
}

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  const proyecto = info.project.name
  // Ve y exporta lo propio, y crea.
  exporta = await personaConPermisos(proyecto, 'exporta', 'Exporta Prueba', [
    'leads.crear',
    'leads.exportar',
    { clave: 'leads.ver', alcance: 'propios' },
  ])
  masivo = await personaConPermisos(proyecto, 'masivo', 'Masivo Prueba', [
    'leads.exportar',
    { clave: 'leads.ver', alcance: 'propios' },
  ])
  for (const peligrosa of PELIGROSAS) {
    await crearLead({
      nombre: peligrosa.nombre,
      telefono: `${t.codigo}${telefonoAlAzar()}`,
      deQuien: exporta,
      atributos: { e2e_color: peligrosa.color },
    })
  }
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await limpiarListado(t)
})

const botonExportar = (page: Page) =>
  aLaVista(page.getByRole('button', { name: 'Exportar', exact: true }))
const dialogoDeExportar = (page: Page) => page.getByRole('dialog', { name: 'Exportar leads' })

// Abre el diálogo, descarga y devuelve el archivo leído como texto (con su BOM, sin decodificar).
async function descargar(page: Page): Promise<string> {
  await botonExportar(page).click()
  const dialogo = dialogoDeExportar(page)
  await expect(dialogo).toBeVisible()
  const [descarga] = await Promise.all([
    page.waitForEvent('download'),
    dialogo.getByRole('button', { name: 'Descargar' }).click(),
  ])
  expect(descarga.suggestedFilename()).toMatch(/^leads-\d{4}-\d{2}-\d{2}\.csv$/)
  const ruta = await descarga.path()
  return readFileSync(ruta, 'utf8')
}

test('sin leads.exportar el botón no se dibuja y el pedido directo es 403', async ({ page }) => {
  await entrar(page, t.personas.berta)
  await irALeads(page)
  await expect(botonExportar(page)).toHaveCount(0)
  const directo = await page.request.post('/leads/exportar', {
    data: { consulta: '', delimitador: ';' },
  })
  expect(directo.status()).toBe(403)
})

test('ver «todos» sin el permiso tampoco exporta: el pedido directo es 403', async ({ page }) => {
  await entrar(page, t.personas.veTodos)
  await irALeads(page, '?alcance=todos')
  await expect(botonExportar(page)).toHaveCount(0)
  const directo = await page.request.post('/leads/exportar', {
    data: { consulta: 'alcance=todos', delimitador: ';' },
  })
  expect(directo.status()).toBe(403)
})

test('el pedido sale de esta aplicación: un origen ajeno o un GET se rechazan', async ({
  page,
}) => {
  await entrar(page, t.personas.duena)
  const ajeno = await page.request.post('/leads/exportar', {
    data: { consulta: '', delimitador: ';' },
    headers: { origin: 'https://otro-sitio.example' },
  })
  expect(ajeno.status()).toBe(403)
  const mal = await page.request.post('/leads/exportar', {
    data: { consulta: 5, delimitador: '|' },
  })
  expect(mal.status()).toBe(400)
  const lectura = await page.request.get('/leads/exportar')
  expect(lectura.status()).toBe(405)
})

test('«todos» exporta sólo su cartera: ni los leads ajenos ni sus privados salen', async ({
  page,
}) => {
  await entrar(page, t.personas.duena)
  await irALeads(page, '?alcance=todos')
  // Con «todos» se ve el lead de Carlos en pantalla…
  await expect(aLaVista(page.getByText(`E2E ${AJENO_CARLOS}`, { exact: true }))).toBeVisible()
  const csv = await descargar(page)
  // …pero el archivo es de la cartera: UTF-8 con BOM, las columnas del layout en su orden.
  expect(csv.startsWith('﻿Nombre;Teléfono;Tipo;Origen;')).toBe(true)
  // Las columnas fijas y después los campos activos del layout, con su etiqueta y en su orden (los
  // que comparten orden salen como los muestra la app).
  const columnas = (csv.split('\r\n')[0] ?? '').replace('\uFEFF', '').split(';')
  expect(columnas.slice(0, 4)).toEqual(['Nombre', 'Teléfono', 'Tipo', 'Origen'])
  const activos = (await camposDeLead()).filter((campo) => campo.activo)
  const ordenes = columnas
    .slice(4)
    .map((etiqueta) => activos.find((c) => c.etiqueta === etiqueta)?.orden)
  expect([...columnas.slice(4)].sort()).toEqual(activos.map((c) => c.etiqueta).sort())
  expect(ordenes).toEqual([...ordenes].sort((a, b) => (a ?? 0) - (b ?? 0)))
  expect(columnas).toContain('Cédula E2E')
  expect(csv).toContain(`E2E ${PROPIO_DALIA};`)
  // El teléfono de la empresa sale nacional (sin «+» ni código) y el tipo con su nombre.
  expect(csv).toMatch(new RegExp(`^E2E ${PROPIO_DALIA};\\d{7,9};Prospecto;`, 'm'))
  expect(csv).not.toContain(`E2E ${AJENO_CARLOS}`)
  expect(csv).not.toContain(CI_DE_CARLOS)
  expect(csv).not.toContain(`E2E ${PROPIO_BERTA}`)
  // Forzar la consulta con «todos» a mano tampoco amplía nada.
  const forzado = await page.request.post('/leads/exportar', {
    data: { consulta: 'alcance=todos&q=E2E', delimitador: ',' },
  })
  expect(forzado.status()).toBe(200)
  const texto = await forzado.text()
  expect(texto).toContain(`E2E ${PROPIO_DALIA}`)
  expect(texto).not.toContain(`E2E ${AJENO_CARLOS}`)
  expect(texto).not.toContain(CI_DE_CARLOS)
})

test('una celda que empieza por una fórmula sale con apóstrofo y el resto queda entero', async ({
  page,
}) => {
  // `exporta` tiene su cartera: lo mira con su propia sesión.
  await entrar(page, exporta)
  await irALeads(page)
  const csv = await descargar(page)
  expect(csv).toContain(";'=cmd|' /C calc'!A0")
  expect(csv).toContain(";'+1+1")
  expect(csv).toContain(";'-2+3")
  expect(csv).toContain(";'@SUMA(A1)")
  // Comillas, coma y salto de línea: entre comillas, con las comillas duplicadas, y el emoji intacto.
  expect(csv).toContain('"Dijo ""ok"", luego\nsalto 😀"')
  // Ninguna celda arranca por un carácter de fórmula sin el apóstrofo.
  const peligrosas = csv.split('\r\n').flatMap((linea) => linea.split(';'))
  expect(peligrosas.filter((celda) => /^[=+\-@]/.test(celda))).toEqual([])
})

test('los filtros del listado viajan: se exporta lo que se ve', async ({ page }) => {
  await entrar(page, exporta)
  await irALeads(page, `?${new URLSearchParams({ q: 'Peligro Mas' }).toString()}`)
  const csv = await descargar(page)
  expect(csv).toContain('Peligro Mas')
  expect(csv).not.toContain('Peligro Igual')
  expect(csv).not.toContain('Peligro Menos')
})

test('«ver como» un rol sin el permiso: el botón no se dibuja', async ({ page }) => {
  await entrar(page, t.personas.duena)
  await irALeads(page)
  await expect(botonExportar(page)).toBeVisible()
  await page.getByRole('button', { name: 'Menú de Dalia Alta' }).click()
  await page
    .getByRole('menuitemradio', { name: new RegExp(`Alta berta`) })
    .first()
    .click()
  await expect(page.getByText('Viendo como')).toBeVisible()
  await irALeads(page)
  await expect(botonExportar(page)).toHaveCount(0)
})

test('el límite por hora: la sexta se dice con la hora y no se descarga', async ({ page }) => {
  const id = await idDe(exporta)
  // Las que ya hizo en la última hora (tal como las deja la base).
  const filas = Array.from({ length: 5 }, () => ({
    accion: 'leads.exportado',
    actor_id: id,
    tabla: 'leads',
    detalle: { filas: 1, filtros: [] },
  }))
  const { error } = await admin().from('actividad').insert(filas)
  exigir(error, 'sembrar las exportaciones de la hora')

  await entrar(page, exporta)
  await irALeads(page)
  await botonExportar(page).click()
  const dialogo = dialogoDeExportar(page)
  await dialogo.getByRole('button', { name: 'Descargar' }).click()
  await expect(dialogo).toContainText('Ya exportaste 5 veces en la última hora')
  await expect(dialogo).toContainText(/a las \d{2}:\d{2}/)
  // Sigue abierto y se puede cerrar.
  await dialogo.getByRole('button', { name: 'Cancelar' }).click()
  await expect(dialogo).toBeHidden()
})

test('más de 5.000 leads: no se exporta nada a medias y se dice cuántos hay', async ({ page }) => {
  test.setTimeout(180_000)
  const id = await idDe(masivo)
  const base = Array.from({ length: 5001 }, (_, i) => ({
    nombre: `E2E Masivo ${String(i)}`,
    telefono_principal: `5917999${String(i).padStart(5, '0')}`,
    creado_por: id,
  }))
  for (let desde = 0; desde < base.length; desde += 1000) {
    const { error } = await admin()
      .from('leads')
      .insert(base.slice(desde, desde + 1000))
    exigir(error, 'sembrar los leads masivos')
  }
  await entrar(page, masivo)
  await irALeads(page)
  await botonExportar(page).click()
  const dialogo = dialogoDeExportar(page)
  await dialogo.getByRole('button', { name: 'Descargar' }).click()
  await expect(dialogo).toContainText(/Hay 5\.001 leads con estos filtros/)
  await expect(dialogo).toContainText('Filtra un poco más')
})
