import { expect, type Download, type Locator, type Page } from './prueba'
import type { Teclado } from './alta'
import {
  celdaDeLaHoja,
  cotizacionGuardada,
  formulaVigente,
  tarjetaGuardada,
  totalDeLaHoja,
} from './cotizar-guardar'
import { leerLaDescarga } from './cotizar-pdf'
import { idDe } from './leads'
import { literal, sql } from './sql'
import { formatearMonto } from '../../src/shared/lib/formato'

// Los tramos de la tarea de oro 2 entera (`e2e/cotizar-tarea-de-oro-recorrido.spec.ts`, el cierre de la Fase 4): del listado a la hoja, el cliente, remate y grúa
// hasta el PDF y lo que se comprueba de lo guardado. Todo con el `Teclado`, que cuenta lo pulsado.

export const barraDelVehiculo = (page: Page): Locator =>
  page.getByRole('button', { name: /^Vehículo:/ })
export const panelDelVehiculo = (page: Page): Locator =>
  page.getByRole('dialog', { name: 'Vehículo' })
const barraDelCliente = (page: Page): Locator => page.getByRole('button', { name: /^Cliente:/ })
const panelDelCliente = (page: Page): Locator =>
  page.getByRole('dialog', { name: 'Cliente', exact: true })
const valor = (page: Page, nodo: string) => celdaDeLaHoja(page, nodo).locator('[data-parada="0"]')
export const sinEspacios = (texto: string | null) => (texto ?? '').replace(/\s/g, '')
export const totalEnDolares = (total: string) =>
  formatearMonto(Number(total), { moneda: 'USD', locale: 'es-BO' })
export const nuevaCotizacion = (page: Page): Locator =>
  page.getByRole('link', { name: 'Nueva cotización' }).filter({ visible: true })

// Del listado del origen (ya abierto) a la hoja vacía, por «Saltar al contenido» y «Nueva cotización».
export async function abrirLaHojaDesdeElListado(
  page: Page,
  teclado: Teclado,
  origen: string,
): Promise<void> {
  await teclado.pulsar('Tab')
  await expect(page.getByRole('link', { name: 'Saltar al contenido' })).toBeFocused()
  await teclado.pulsar('Enter')
  await teclado.tabularHasta(nuevaCotizacion(page))
  await teclado.pulsar('Enter')
  await expect(page).toHaveURL(new RegExp(`/cotizaciones/nuevo\\?origen=${origen}`))
  await expect(page.locator('[data-hoja]')).toBeVisible()
}

// La barra del cliente: su panel, el lead buscado por su nombre y elegido.
export async function elegirElCliente(
  page: Page,
  teclado: Teclado,
  lead: { nombre: string; id: string },
): Promise<void> {
  await teclado.tabularHasta(barraDelCliente(page))
  await teclado.pulsar('Enter')
  await expect(panelDelCliente(page).getByRole('searchbox')).toBeFocused()
  await teclado.escribir(lead.nombre)
  const fila = panelDelCliente(page)
    .getByRole('list', { name: 'Leads' })
    .getByRole('listitem')
    .filter({ hasText: lead.nombre })
    .getByRole('button')
  await expect(panelDelCliente(page).getByRole('heading', { name: 'Resultados' })).toBeVisible()
  await expect(fila).toHaveCount(1)
  await teclado.tabularHasta(fila)
  await teclado.pulsar('Enter')
  await expect(panelDelCliente(page)).toBeHidden()
  await expect(page).toHaveURL(new RegExp(`lead=${lead.id}`))
  await expect(barraDelCliente(page)).toBeFocused()
}

// Remate y grúa, Ctrl+S y «Descargar PDF» de la tarjeta de lo guardado.
export async function cotizarYBajar(page: Page, teclado: Teclado): Promise<Download> {
  await teclado.tabularHasta(valor(page, 'remate'))
  await teclado.escribir('9500')
  await teclado.pulsar('Enter')
  await expect(valor(page, 'remate')).toBeFocused()
  await teclado.tabularHasta(valor(page, 'grua'))
  await teclado.escribir('450')
  await teclado.pulsar('Enter')
  await expect(page.getByLabel('Resumen')).toHaveAttribute('aria-busy', 'false')
  await expect(totalDeLaHoja(page)).toContainText(/\d/)
  await teclado.pulsar('ControlOrMeta+s')
  await expect(tarjetaGuardada(page)).toContainText(/Cotización n\.º \d+ guardada/)
  await teclado.tabularHasta(tarjetaGuardada(page).getByRole('link', { name: 'Descargar PDF' }))
  const bajada = page.waitForEvent('download')
  await teclado.pulsar('Enter')
  return bajada
}

// Lo guardado es lo que se ve y lo que se baja: una sola cotización (la que lleva `intento`), de quien la hizo, con su lead, su vehículo y la fórmula vigente del
// origen; el total de la base es el de la tarjeta y el de la línea «TOTAL DÓLARES» del PDF. Devuelve su id.
export async function comprobarLoGuardado(
  page: Page,
  pedidos: { intento?: string }[],
  descarga: Download,
  esperado: { quien: string; lead: string; vehiculo: string; origen: string },
): Promise<string> {
  const deLaHoja = pedidos.filter((visto) => Object.hasOwn(visto, 'intento'))
  expect(deLaHoja).toHaveLength(1)
  const id = deLaHoja[0]?.intento ?? ''
  const fila = cotizacionGuardada(id)
  expect(fila.filas).toBe(1)
  expect(fila.creadoPor).toBe(await idDe(esperado.quien))
  expect(fila.formulaId).toBe(formulaVigente(esperado.origen))
  expect(
    sql(
      `select lead_id || '|' || vehiculo_id from public.cotizaciones where id = ${literal(id)}::uuid`,
    ),
  ).toBe(`${esperado.lead}|${esperado.vehiculo}`)
  const total = totalEnDolares(fila.totalBase)
  expect(
    sinEspacios(await tarjetaGuardada(page).locator('[data-total-guardado]').textContent()),
  ).toContain(sinEspacios(total))
  const pdf = await leerLaDescarga(descarga)
  const lineaDelTotal = pdf.lineas.find((l) => l.startsWith('TOTAL DÓLARES')) ?? ''
  expect(sinEspacios(lineaDelTotal)).toBe(`TOTALDÓLARES${sinEspacios(total)}`)
  return id
}
