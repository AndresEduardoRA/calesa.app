// Los lectores de pantalla que el recorrido de la Fase 9 (`e2e/fase-9-recorrido.spec.ts`) necesita y que viven **privados** en el spec de
// cada pieza: se copian acá, con la cita de dónde salieron, en vez de abrir esos specs verdes en un cierre de fase.
import { entrar } from './alta'
import { abrirEdicion, irAFicha } from './leads-ficha'
import { expect, type Locator, type Page } from './prueba'

// El recorrido cambia de cuenta **dentro** de una prueba: `/ingreso` con una sesión viva no dibuja el formulario (lleva a Inicio), así que
// primero se sueltan las cookies, como hace `e2e/tablero.spec.ts:37-38`.
export async function cambiarDeCuenta(page: Page, correo: string): Promise<void> {
  await page.context().clearCookies()
  await entrar(page, correo, { fresco: true })
}

// De `e2e/soporte/cotizar-recorrido.ts:22-24` (privados de ese archivo).
export const barraDelCliente = (page: Page): Locator =>
  page.getByRole('button', { name: /^Cliente:/ })
export const panelDelCliente = (page: Page): Locator =>
  page.getByRole('dialog', { name: 'Cliente', exact: true })

// De `e2e/tablero.spec.ts:29-35` y `:191-211` (privados de ese archivo). Cada cifra del tablero es un `role="group"` con nombre
// «Título: valor» (`cifra-del-widget.tsx`); la de dinero deja el monto fuera del nombre, por `<Monto>`.
// `donde` es la página o la región de un widget ancho: la cola de la web tiene sus propias cifras dentro.
export const cifra = (donde: Page | Locator, titulo: string): Locator =>
  donde.getByRole('group', { name: new RegExp(`^${titulo}: `) })

export async function leerCifra(donde: Page | Locator, titulo: string): Promise<number> {
  const nombre = (await cifra(donde, titulo).getAttribute('aria-label')) ?? ''
  return Number(nombre.replace(/\D/g, ''))
}

export const margenConMonto = (page: Page): Locator =>
  page.getByRole('group', { name: 'Margen del mes', exact: true })
const margenSinVenta = (page: Page): Locator =>
  page.getByRole('group', { name: 'Margen del mes: Sin venta registrada', exact: true })

// El margen en centavos, con su signo («Sin venta registrada» cuenta como 0). Espera a que el widget cargue: cada uno tiene su `<Suspense>`.
export async function leerMargen(page: Page): Promise<number> {
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

// Cómo se tipea un monto en el formulario de pagos. De `e2e/logistica-gastos-y-pagos.spec.ts:46-47`.
export const formatoDeMonto = (n: number): string =>
  new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

// De `e2e/pwa.spec.ts:22-37` (privada de ese archivo): el navegador avisa que puede instalar. Devuelve cuántas veces se llamó a `prompt()`.
export async function avisarQuePuedeInstalar(page: Page): Promise<() => Promise<number>> {
  await page.evaluate(() => {
    const w = window as unknown as { __prompts: number }
    w.__prompts = 0
    const evento = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt: () => {
        w.__prompts += 1
        return Promise.resolve()
      },
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    })
    window.dispatchEvent(evento)
  })
  return () => page.evaluate(() => (window as unknown as { __prompts: number }).__prompts)
}

// Las líneas del CSV exportado (sin el BOM) y una columna por su encabezado. De `e2e/datos-exportar.spec.ts:45-51`, ampliada a cualquier
// columna: el recorrido mira «Nombre», «Teléfono» y «Dueño». Ninguna fila del terreno lleva `;` ni comillas.
export function leerCsv(texto: string): {
  encabezado: string
  lineas: string[]
  columna: (linea: string, titulo: string) => string
} {
  const [encabezado = '', ...lineas] = texto.replace(/^﻿/, '').split(/\r?\n/)
  const titulos = encabezado.split(';')
  return {
    encabezado,
    lineas,
    columna: (linea, titulo) => {
      const n = titulos.indexOf(titulo)
      expect(n, `la columna «${titulo}» del CSV`).toBeGreaterThanOrEqual(0)
      return linea.split(';')[n] ?? ''
    },
  }
}

// Los dos tramos del pago de la unidad (R4), con los selectores de `e2e/logistica-gastos-y-pagos.spec.ts:101-152`: quien lo carga no lo
// confirma (`logistica.pagos.editar` y `logistica.pagos.confirmar` son claves distintas), así que el sello prueba que fueron dos personas.
export const pagosDeLaUnidad = (page: Page): Locator =>
  page.getByRole('list', { name: 'Pagos de la unidad' })

export async function registrarElPago(
  page: Page,
  pago: { concepto: string; monto: number },
): Promise<void> {
  await page.getByText('Pagos', { exact: true }).click()
  await page.getByRole('button', { name: 'Registrar pago' }).click()
  const formulario = page.getByRole('dialog', { name: 'Registrar pago' })
  await expect(formulario).toBeVisible()
  await formulario.getByLabel('Concepto').fill(pago.concepto)
  await formulario.getByLabel('Monto').fill(formatoDeMonto(pago.monto))
  await formulario.getByRole('button', { name: 'Registrar pago' }).click()
  await expect(formulario).toBeHidden()
  await expect(pagosDeLaUnidad(page).getByText(pago.concepto)).toBeVisible()
  await expect(pagosDeLaUnidad(page).getByText('Sin confirmar')).toBeVisible()
}

export async function confirmarElPago(page: Page, concepto: string): Promise<void> {
  await page.getByText('Pagos', { exact: true }).click()
  await page.getByRole('button', { name: 'Confirmar pago' }).click()
  const confirmar = page.getByRole('dialog', { name: `Confirmar el pago «${concepto}»` })
  await expect(confirmar).toBeVisible()
  await confirmar.getByRole('button', { name: 'Confirmar pago' }).click()
  await expect(confirmar).toBeHidden()
}

// Importar un lead desde `/datos` para una persona, con los pasos de `e2e/datos-importar.spec.ts:72-97`: destino, archivo en memoria con los
// encabezados del CSV exportado, vista previa e importación. Espera el resultado leído de la base (hasta 90 s).
export async function importarUnLead(
  page: Page,
  lo: { destino: string; nombre: string; telefono: string },
): Promise<void> {
  await page.goto('/datos?seccion=importar&entidad=leads')
  await page.getByLabel('Destino').selectOption({ label: lo.destino })
  await page.locator('input[type="file"]').setInputFiles({
    name: 'leads.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(`Nombre;Teléfono\n${lo.nombre};${lo.telefono}\n`, 'utf8'),
  })
  await page.getByRole('button', { name: 'Ver la vista previa' }).click()
  await page.getByRole('button', { name: 'Importar 1 fila' }).click()
  const resumen = page.getByRole('region', { name: 'Importación en curso' })
  await expect(resumen.getByText(/^1 creado, /)).toBeVisible({ timeout: 90_000 })
}

// Cambiar el nombre de un lead desde su ficha, con los pasos de `e2e/actividad.spec.ts:48-51`. Lo hace quien está en su cartera: editar un
// lead exige `puede_actuar_lead` › `en_cartera`, no alcanza con `leads.editar` de todos.
export async function cambiarElNombre(page: Page, leadId: string, nuevo: string): Promise<void> {
  await irAFicha(page, leadId)
  const panel = await abrirEdicion(page)
  await panel.getByLabel('Nombre').fill(nuevo)
  await page.keyboard.press('Control+s')
  await expect(page.getByText('Cambios guardados')).toBeVisible()
}

// «Instalar la app» del menú del usuario, con los pasos de `e2e/pwa.spec.ts:72-90`: con el aviso del navegador llama a `prompt()` una sola
// vez y la entrada desaparece. Instalar de verdad no se puede en el Chromium de pruebas.
export async function instalarLaApp(page: Page, nombre: string): Promise<void> {
  const entrada = page.getByRole('menuitem', { name: 'Instalar la app' })
  const menu = page.getByRole('button', { name: `Menú de ${nombre}` })
  let prompts: () => Promise<number> = () => Promise.resolve(0)
  // El navegador avisa una sola vez y puede llegar antes de que el shell hidrate: se repite hasta que la entrada aparece.
  await expect(async () => {
    prompts = await avisarQuePuedeInstalar(page)
    if (!(await entrada.isVisible())) await menu.click()
    await expect(entrada).toBeVisible({ timeout: 1_000 })
  }).toPass()
  await entrada.click()
  await expect.poll(prompts).toBe(1)
  await menu.click()
  await expect(page.getByRole('menuitem', { name: 'Cerrar sesión' })).toBeVisible()
  await expect(entrada).toHaveCount(0)
}
