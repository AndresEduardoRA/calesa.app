import type { Locator, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { borrarRolesDePrueba } from './soporte/base'
import { guardarPorLaHoja, numeroDeLaCotizacion } from './soporte/cotizar-guardada'
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
// Live esté encendido; en una guardada, lo guardado.
test.describe.configure({ mode: 'serial' })

let origen = { id: '', nombre: '' }
let duena = ''
let leadDeLaDuena = ''
let asesora = { email: '', nombre: '' }
let leadDeLaAsesora = ''
let subasta = ''
let vehiculo = ''
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

// Una guardada de la dueña en el origen sin plantilla: 1.200 de la celda y 5 de la constante.
async function unaGuardada(page: Page): Promise<string> {
  await entrar(page, duena, { fresco: true })
  return guardarPorLaHoja(page, { origenId: origen.id, lead: leadDeLaDuena, pub: '1200' })
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

test('E2E E4 en una guardada con cambios sin guardar, lo copiado es lo guardado', async ({
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
})
