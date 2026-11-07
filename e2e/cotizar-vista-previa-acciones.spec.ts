import type { Locator, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { CONTRASENA } from './soporte/alta'
import {
  borrarRolesDePrueba,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
  PREFIJO_ROL_E2E,
} from './soporte/base'
import { guardarPorLaHoja, numeroDeLaCotizacion } from './soporte/cotizar-guardada'
import { leerLaDescarga, mandarALaPapelera } from './soporte/cotizar-pdf'
import { limpiarGuardado, prepararGuardado, tipearEnLaHoja } from './soporte/cotizar-guardar'
import { borrarLeadsDePrueba, crearLead } from './soporte/leads'
import { telefonoAlAzar } from './soporte/leads-alta'
import { crearAsesoraDeLaSemilla } from './soporte/recorrido'
import {
  abrirLaVistaPrevia,
  alDia,
  cotizarEnLaSubasta,
  dialogo,
  hoja,
  textoDe,
  total,
  urlDeLaSubasta,
} from './soporte/cotizar-vista-previa'
import { literal, sql } from './soporte/sql'
import { cargarVehiculos, vehiculoPorTitulo } from './soporte/vehiculos'

// Las acciones del pie de «Vista previa» (paso 4.18-3b, P5–P7 del 4.18-3): «Copiar texto» deja en el portapapeles la tarjeta que dibuja el modal como texto, con cifras aunque
// Live esté encendido; en una guardada, lo guardado. «Descargar PDF», sólo en una guardada, pide el PDF de lo guardado desde el navegador y lo baja; si falla, lo dice en el modal.
test.describe.configure({ mode: 'serial' })

let origen = { id: '', nombre: '' }
let duena = ''
let leadDeLaDuena = ''
let asesora = { email: '', nombre: '' }
let leadDeLaAsesora = ''
let subasta = ''
let vehiculo = ''
let vera = ''
const TITULO_DEL_VEHICULO = 'Acciones Hilux'

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarRolesDePrueba()
  ;({ origen, duena, lead: leadDeLaDuena } = await prepararGuardado(proyecto, 'vpacciones'))
  asesora = await crearAsesoraDeLaSemilla(`vpacciones-${proyecto}`)
  leadDeLaAsesora = await crearLead({
    nombre: `acciones ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: asesora.email,
  })
  subasta = sql("select id from public.origenes where clave = 'subasta_usa'")
  await cargarVehiculos(subasta, [
    {
      titulo: `${TITULO_DEL_VEHICULO} ${proyecto}`,
      anio: 2020,
      atributos: { tipo_vehiculo: 'autos' },
    },
  ])
  vehiculo = (await vehiculoPorTitulo(`${TITULO_DEL_VEHICULO} ${proyecto}`))?.id ?? ''
  expect(vehiculo, 'el vehículo de la subasta').not.toBe('')
  vera = correoDePrueba(`vera-vpacciones-${proyecto}`)
  await crearPersona({
    email: vera,
    contrasena: CONTRASENA,
    nombre: 'Vera Solover',
    invitada: true,
  })
  await darRolDePrueba({
    email: vera,
    rol: { nombre: `${PREFIJO_ROL_E2E}Sólo ver acciones`, clave: 'e2e_solo_ver_acciones' },
    permisos: ['vehiculos.ver', 'cotizaciones.ver'],
  })
})

test.afterAll(async () => {
  if (vehiculo !== '') {
    sql(`delete from public.cotizaciones where vehiculo_id = ${literal(vehiculo)}::uuid`)
    sql(`delete from public.vehiculos where id = ${literal(vehiculo)}::uuid`)
  }
  await limpiarGuardado()
  await borrarLeadsDePrueba()
  await borrarRolesDePrueba()
})

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
})

const copiar = (page: Page) => dialogo(page).getByRole('button', { name: 'Copiar texto' })

// Copia y devuelve lo que quedó en el portapapeles.
async function copiarElTexto(page: Page): Promise<string> {
  await page.evaluate(() => navigator.clipboard.writeText(''))
  await copiar(page).click()
  await expect(dialogo(page).getByRole('button', { name: 'Copiado' })).toBeVisible()
  return page.evaluate(() => navigator.clipboard.readText())
}

const sinBlancos = (texto: string) => texto.replace(/\s/g, '')
// El monto del total de la tarjeta, sin la máscara de Live.
const totalDe = (t: Locator) => textoDe(total(t).locator('[data-monto-valor]'))
const descargar = (page: Page) => dialogo(page).getByRole('button', { name: 'Descargar PDF' })
const alertaDelPie = (page: Page) => dialogo(page).getByRole('alert')

// Una guardada de la dueña en el origen sin plantilla: 1.200 de la celda y 5 de la constante.
async function unaGuardada(page: Page): Promise<string> {
  await entrar(page, duena, { fresco: true })
  return guardarPorLaHoja(page, { origenId: origen.id, lead: leadDeLaDuena, pub: '1200' })
}

async function abrirLaGuardada(page: Page, id: string) {
  await page.goto(`/cotizaciones/${id}`)
  await expect(hoja(page)).toBeVisible()
  return abrirLaVistaPrevia(page)
}

test('E2E E1 en la hoja nueva «Copiar texto» deja la tarjeta como texto, con el total que dibuja', async ({
  page,
}, info) => {
  await cotizarEnLaSubasta(page, asesora.email, urlDeLaSubasta(subasta, leadDeLaAsesora, vehiculo))
  const t = await abrirLaVistaPrevia(page)
  const totalDeLaTarjeta = await totalDe(t)
  expect(totalDeLaTarjeta).toMatch(/\d/)
  const texto = await copiarElTexto(page)
  const lineas = texto.split('\n')
  expect(lineas[0]).toBe('COTIZACIÓN VEHÍCULOS A GASOLINA EEUU - BOL')
  expect(lineas).toContain(`Asesor: ${asesora.nombre}`)
  expect(lineas).toContain(`${TITULO_DEL_VEHICULO} ${info.project.name}`)
  expect(lineas).toContain('Compra')
  const lineaDelTotal = lineas.find((l) => l.startsWith('TOTAL DÓLARES: ')) ?? ''
  expect(sinBlancos(lineaDelTotal)).toBe(`TOTALDÓLARES:${totalDeLaTarjeta}`)
  expect(texto).toContain('cotización referencial')
  expect(texto).not.toMatch(/\n\n\n/)
  // La hoja nueva no tiene un PDF que bajar.
  await expect(descargar(page)).toHaveCount(0)
})

test('E2E E2 en una guardada «Descargar PDF» baja su PDF, con el total de la tarjeta y del texto copiado', async ({
  page,
}) => {
  const id = await unaGuardada(page)
  const t = await abrirLaGuardada(page, id)
  const totalDeLaTarjeta = await totalDe(t)
  const texto = await copiarElTexto(page)
  const bajada = page.waitForEvent('download')
  await descargar(page).click()
  const pdf = await leerLaDescarga(await bajada)
  expect(pdf.nombre).toBe(`cotizacion-${numeroDeLaCotizacion(id)}.pdf`)
  const lineaDelPdf = pdf.lineas.find((l) => l.startsWith('Total ')) ?? ''
  expect(sinBlancos(lineaDelPdf)).toBe(`Total${totalDeLaTarjeta}`)
  expect(sinBlancos(texto)).toContain(`Total:${totalDeLaTarjeta}`)
  await expect(descargar(page)).toBeEnabled()
  await expect(alertaDelPie(page)).toHaveCount(0)
})

test('E2E E3 con Live encendido lo copiado lleva las cifras', async ({ page }) => {
  await cotizarEnLaSubasta(page, asesora.email, urlDeLaSubasta(subasta, leadDeLaAsesora, vehiculo))
  const t = await abrirLaVistaPrevia(page)
  const totalDeLaTarjeta = await totalDe(t)
  await dialogo(page).getByRole('button', { name: 'Modo Live: ocultar los montos' }).click()
  await expect(page.locator('html')).toHaveClass(/live/)
  await expect(total(t).locator('[data-monto-valor]')).toBeHidden()
  const texto = await copiarElTexto(page)
  expect(sinBlancos(texto)).toContain(`TOTALDÓLARES:${totalDeLaTarjeta}`)
})

test('E2E E4 en una guardada con cambios sin guardar, lo copiado y el PDF son lo guardado', async ({
  page,
}) => {
  const id = await unaGuardada(page)
  await page.goto(`/cotizaciones/${id}`)
  await expect(hoja(page)).toBeVisible()
  await tipearEnLaHoja(page, 'pub', '300')
  await alDia(page)
  const t = await abrirLaVistaPrevia(page)
  await expect(total(t)).toContainText('1.205,00')
  const texto = await copiarElTexto(page)
  expect(texto.split('\n')[0]).toContain(`Cotización n.º ${numeroDeLaCotizacion(id)}`)
  expect(sinBlancos(texto)).toContain(`Total:${await totalDe(t)}`)
  expect(texto).not.toContain('305,00')
  const bajada = page.waitForEvent('download')
  await descargar(page).click()
  const pdf = await leerLaDescarga(await bajada)
  expect(pdf.lineas.some((l) => l.includes('1.205,00'))).toBe(true)
  expect(pdf.lineas.some((l) => l.includes('305,00'))).toBe(false)
})

test('E2E E5 si la cotización se va a la papelera con el modal abierto, «Descargar PDF» lo dice y no baja nada', async ({
  page,
}) => {
  const id = await unaGuardada(page)
  await abrirLaGuardada(page, id)
  mandarALaPapelera(id)
  let bajo = false
  page.on('download', () => {
    bajo = true
  })
  await descargar(page).click()
  await expect(alertaDelPie(page)).toHaveText('Esta cotización ya no está disponible.')
  await expect(dialogo(page).getByRole('button', { name: 'Reintentar' })).toBeEnabled()
  expect(bajo).toBe(false)
})

test('E2E E6 sin sesión, «Descargar PDF» pide volver a entrar y no baja la página de ingreso', async ({
  page,
}) => {
  const id = await unaGuardada(page)
  await abrirLaGuardada(page, id)
  await page.context().clearCookies()
  let bajo = false
  page.on('download', () => {
    bajo = true
  })
  await descargar(page).click()
  await expect(alertaDelPie(page)).toHaveText('Tu sesión ya no vale: vuelve a entrar.')
  expect(bajo).toBe(false)
})

test('E2E E7 quien sólo ve la cotización también la copia y baja su PDF', async ({ page }) => {
  const id = await unaGuardada(page)
  await page.context().clearCookies()
  await entrar(page, vera, { fresco: true })
  const t = await abrirLaGuardada(page, id)
  await expect(page.getByText('Sólo lectura: no puedes guardar esta cotización.')).toBeVisible()
  const totalDeLaTarjeta = await totalDe(t)
  expect(sinBlancos(await copiarElTexto(page))).toContain(`Total:${totalDeLaTarjeta}`)
  const bajada = page.waitForEvent('download')
  await descargar(page).click()
  const pdf = await leerLaDescarga(await bajada)
  expect(pdf.nombre).toBe(`cotizacion-${numeroDeLaCotizacion(id)}.pdf`)
})
