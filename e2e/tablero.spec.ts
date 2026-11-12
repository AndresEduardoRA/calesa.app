import { entrar } from './soporte/alta'
import {
  limpiarFinal,
  prepararFinal,
  sembrarParaMarcar,
  type TerrenoDeLaFinal,
} from './soporte/cotizaciones-final'
import { borrarDineroDeEsteOrigen, sembrarDinero } from './soporte/dinero'
import { expect, test, type Page } from './soporte/prueba'

// El tablero de métricas (9.08-1, fila del tablero en `docs/UX.md`): la dueña ve las cinco cifras; al marcar final una cotización, «Convertidos» sube en uno
// (se compara el aumento, no un valor fijo: otros specs también convierten leads este mes); el período vive en la URL y uno desconocido cae en «Este mes».
// Una persona sin `tablero.metricas.ver` no tiene la entrada en el menú y la ruta le dice que no tiene permiso. T7 (9.11-2): al confirmar un pago en la unidad,
// «Margen del mes» sube exactamente ese pago (se compara la diferencia: otros specs confirman pagos este mes) y el nombre del grupo no lleva el monto.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDeLaFinal

test.beforeAll(async ({}, info) => {
  t = await prepararFinal(info.project.name)
})

test.afterAll(async () => {
  // Primero el terreno de dinero de T7 (sus pagos apuntan a la dueña, que borra `limpiarFinal`), sin barrer el origen de la final.
  await borrarDineroDeEsteOrigen(t.proyecto)
  await limpiarFinal()
})

const cifra = (page: Page, titulo: string) =>
  page.getByRole('group', { name: new RegExp(`^${titulo}: `) })

async function leerCifra(page: Page, titulo: string): Promise<number> {
  const nombre = (await cifra(page, titulo).getAttribute('aria-label')) ?? ''
  return Number(nombre.replace(/\D/g, ''))
}

test('T1 la dueña ve las cinco cifras y «Convertidos» sube al marcar final', async ({ page }) => {
  await page.context().clearCookies()
  await entrar(page, t.duena, { fresco: true })
  await page.goto('/tablero')
  await expect(page.getByRole('heading', { name: 'Tablero', level: 1 })).toBeVisible()
  for (const titulo of [
    'Leads creados',
    'Convertidos',
    'Tasa de conversión',
    'Cotizaciones',
    'Finales',
  ]) {
    await expect(cifra(page, titulo)).toBeVisible()
  }
  const antes = await leerCifra(page, 'Convertidos')

  const { ids } = await sembrarParaMarcar(t, 'T1')
  await page.goto(`/cotizaciones/${ids[0] ?? ''}`)
  await expect(page.getByRole('button', { name: 'Revisiones' })).toBeVisible()
  await page.getByRole('button', { name: 'Marcar final' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Marcar final' }).click()
  await expect(page.getByText(/Marcaste la n\.º \d+ como final\./)).toBeVisible()

  await page.goto('/tablero')
  await expect(cifra(page, 'Convertidos')).toBeVisible()
  expect(await leerCifra(page, 'Convertidos')).toBe(antes + 1)
})

test('T2 el período vive en la URL: «Mes anterior» queda marcado y uno desconocido cae en «Este mes»', async ({
  page,
}) => {
  await page.context().clearCookies()
  await entrar(page, t.duena, { fresco: true })
  await page.goto('/tablero?periodo=mes-anterior')
  await expect(page.getByRole('link', { name: 'Mes anterior' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(page.getByText(/^Mes anterior: del /)).toBeVisible()

  await page.goto('/tablero?periodo=cualquier-cosa')
  await expect(page.getByRole('link', { name: 'Este mes' })).toHaveAttribute('aria-current', 'page')
  await expect(cifra(page, 'Leads creados')).toBeVisible()
})

test('T3 Ana, sin el permiso, no tiene «Tablero» en el menú y la ruta se lo dice', async ({
  page,
}) => {
  await page.context().clearCookies()
  await entrar(page, t.ana, { fresco: true })
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Ver el tablero' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Tablero', exact: true })).toHaveCount(0)

  await page.goto('/tablero')
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
  await expect(page.getByRole('group')).toHaveCount(0)
})

test('T4 la dueña llega al tablero desde Inicio', async ({ page }) => {
  await page.context().clearCookies()
  await entrar(page, t.duena, { fresco: true })
  await page.goto('/')
  await page.getByRole('link', { name: 'Ver el tablero' }).click()
  await expect(page).toHaveURL(/\/tablero$/)
  await expect(cifra(page, 'Leads creados')).toBeVisible()
})

test('T5 la dueña ve las cinco gráficas y «Ver como tabla» abre los números', async ({ page }) => {
  // Un lead y una cotización de hoy: así las gráficas de este mes tienen movimiento sin depender de otros specs.
  await sembrarParaMarcar(t, 'T5')
  await page.context().clearCookies()
  await entrar(page, t.duena, { fresco: true })
  await page.goto('/tablero')
  for (const titulo of [
    'Leads por día',
    'Cotizaciones por día',
    'Leads por origen',
    'Leads por persona',
    'Cotizaciones por origen',
  ]) {
    await expect(page.getByRole('heading', { name: titulo, level: 2 })).toBeVisible()
  }
  const seccion = page.getByRole('region', { name: 'Leads por día' })
  await expect(seccion.getByRole('img', { name: /^Leads por día: / })).toBeVisible()
  await expect(seccion.getByRole('columnheader', { name: 'Día' })).toBeHidden()

  await seccion.getByText('Ver como tabla').click()
  await expect(seccion.getByRole('columnheader', { name: 'Día' })).toBeVisible()
  await expect(seccion.getByRole('columnheader', { name: 'Creados' })).toBeVisible()
})

test('T6 la dueña oculta y ordena widgets en «Personalizar» y, tras recargar, sigue igual; «Restablecer» los devuelve', async ({
  page,
}) => {
  await page.context().clearCookies()
  await entrar(page, t.duena, { fresco: true })
  await page.goto('/tablero?periodo=90d')
  const titulo = (nombre: string) => page.getByRole('heading', { name: nombre, level: 2 })
  const panel = page.getByRole('dialog', { name: 'Personalizar el tablero' })
  // Con el panel abierto, lo de atrás queda fuera del árbol de accesibilidad: se cierra para mirar el tablero y se abre para cambiarlo.
  const abrir = async () => {
    await page.getByRole('button', { name: 'Personalizar' }).click()
    await expect(panel).toBeVisible()
  }
  const cerrar = async () => {
    await page.keyboard.press('Escape')
    await expect(panel).toBeHidden()
  }
  await expect(titulo('Leads por origen')).toBeVisible()

  await abrir()
  await expect(page).toHaveURL(/panel=personalizar/)
  // Abrir el panel no pierde el período.
  await expect(page).toHaveURL(/periodo=90d/)
  const interruptor = panel.getByRole('switch', { name: 'Mostrar Leads por origen' })
  await interruptor.click()
  await expect(interruptor).not.toBeChecked()
  await expect(interruptor).toBeEnabled()
  await cerrar()
  await expect(titulo('Leads por origen')).toHaveCount(0)

  await page.reload()
  await expect(titulo('Leads por día')).toBeVisible()
  await expect(titulo('Leads por origen')).toHaveCount(0)
  await abrir()
  await expect(panel.getByRole('switch', { name: 'Mostrar Leads por origen' })).not.toBeChecked()

  // El orden: «Cotizaciones por día» sube sobre «Leads por día».
  const subir = panel.getByRole('button', { name: 'Subir Cotizaciones por día' })
  await subir.click()
  await expect(subir).toBeEnabled()
  await cerrar()
  await page.reload()
  await expect(titulo('Leads por día')).toBeVisible()
  const encabezados = await page.getByRole('heading', { level: 2 }).allTextContents()
  expect(encabezados.indexOf('Cotizaciones por día')).toBeGreaterThanOrEqual(0)
  expect(encabezados.indexOf('Cotizaciones por día')).toBeLessThan(
    encabezados.indexOf('Leads por día'),
  )

  await abrir()
  const restablecer = panel.getByRole('button', { name: 'Restablecer' })
  await restablecer.click()
  await expect(restablecer).toBeDisabled()
  await cerrar()
  await expect(titulo('Leads por origen')).toBeVisible()
})

const formato = (n: number) =>
  new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

const margenConMonto = (page: Page) =>
  page.getByRole('group', { name: 'Margen del mes', exact: true })
const margenSinVenta = (page: Page) =>
  page.getByRole('group', { name: 'Margen del mes: Sin venta registrada', exact: true })

// El margen en centavos, con su signo («Sin venta registrada» cuenta como 0). Espera a que el widget cargue: cada uno tiene su `<Suspense>`.
async function leerMargen(page: Page): Promise<number> {
  await expect(margenSinVenta(page).or(margenConMonto(page))).toBeVisible()
  if ((await margenSinVenta(page).count()) > 0) {
    return 0
  }
  const texto =
    (await margenConMonto(page)
      .locator('[data-cifra="margen"] [data-monto-valor]')
      .textContent()) ?? ''
  const centavos = Number(texto.replace(/\D/g, ''))
  return /[-−]/.test(texto) ? -centavos : centavos
}

// @sin-celular: el panel de dinero de la unidad, donde se confirma el pago, se prueba en escritorio como pide la fila 6.11
test('T7 la dueña ve subir el margen del mes al confirmar un pago', async ({ page }) => {
  await borrarDineroDeEsteOrigen(t.proyecto)
  const terreno = await sembrarDinero(t.proyecto)
  await page.context().clearCookies()
  await entrar(page, t.duena, { fresco: true })
  await page.goto('/tablero')
  await expect(page.getByRole('heading', { name: 'Margen del mes', level: 2 })).toBeVisible()
  const antes = await leerMargen(page)

  await page.goto(`/logistica/vehiculo/${terreno.enFase.id}`)
  await page.getByText('Pagos', { exact: true }).click()
  await page.getByRole('button', { name: 'Registrar pago' }).click()
  const formulario = page.getByRole('dialog', { name: 'Registrar pago' })
  await expect(formulario).toBeVisible()
  await formulario.getByLabel('Concepto').fill('Venta T7')
  await formulario.getByLabel('Monto').fill(formato(1500))
  await formulario.getByRole('button', { name: 'Registrar pago' }).click()
  await expect(formulario).toBeHidden()
  const pagos = page.getByRole('list', { name: 'Pagos de la unidad' })
  await expect(pagos.getByText('Sin confirmar')).toBeVisible()

  await page.getByRole('button', { name: 'Confirmar pago' }).click()
  const confirmar = page.getByRole('dialog', { name: 'Confirmar el pago «Venta T7»' })
  await expect(confirmar).toBeVisible()
  await confirmar.getByRole('button', { name: 'Confirmar pago' }).click()
  await expect(confirmar).toBeHidden()
  await expect(pagos.getByText('Sin confirmar')).toHaveCount(0)

  await page.goto('/tablero')
  await expect(margenConMonto(page)).toBeVisible()
  expect((await leerMargen(page)) - antes).toBe(150000)
  const nombre = (await margenConMonto(page).getAttribute('aria-label')) ?? ''
  expect(nombre).not.toMatch(/\d/)
})
