import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { guardarPorLaHoja } from './soporte/cotizar-guardada'
import {
  celdaDeLaHoja,
  guardarConElAtajo,
  limpiarGuardado,
  prepararGuardado,
  tarjetaGuardada,
  tipearEnLaHoja,
} from './soporte/cotizar-guardar'
import { literal, sql } from './soporte/sql'

// El ⚙ de una celda de tipo de cambio en la hoja (paso 4.20-3d, `docs/UX.md` › «Cotizar»): en la hoja nueva, «Tipo de cambio de <celda>» lee la fila que nombra el nodo
// (`formula_tipo_cambio_del_nodo()`) y la cambia para toda la empresa con `guardarTipoCambio`; la action revalida y la hoja se vuelve a abrir con el valor nuevo, lo tipeado
// vuelve con el borrador y guardar no avisa de un tipo de cambio cambiado. En una guardada dice que conserva el suyo. El spec crea su propio tipo de cambio y le da su clave
// al nodo `tc` de la fórmula de su origen: nunca toca `oficial`, que miran los demás specs.
test.describe.configure({ mode: 'serial' })

// La respuesta de la lectura del tipo de cambio del nodo (una fila: id, clave, nombre, monedas, valor, activo y su versión): medida en 235 B en escritorio y 224 B en
// movil (4.20-3d; la clave y el nombre llevan el proyecto); lo medido más un 5 %.
const TOPE_DE_BYTES_DE_LA_LECTURA = 247

let proyecto = ''
let origen = { id: '', nombre: '' }
let duena = ''
let lead = ''
let clave = ''
let nombre = ''

const valorDe = (): string =>
  sql(`select valor::float8 from public.tipos_cambio where clave = ${literal(clave)}`)
const historialDe = (): string =>
  sql(`
    select coalesce(string_agg(h.valor_anterior::float8 || '>' || h.valor_nuevo::float8, ',' order by h.id), '')
    from public.tipos_cambio_historial h join public.tipos_cambio t on t.id = h.tipo_cambio_id
    where t.clave = ${literal(clave)}`)

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  ;({ origen, duena, lead } = await prepararGuardado(proyecto, 'ajtc'))
  clave = `e2e_3d_${proyecto}`
  nombre = `E2E 3d ${proyecto}`
  sql(`delete from public.tipos_cambio where clave = ${literal(clave)}`)
  sql(`
    insert into public.tipos_cambio (clave, nombre, moneda_de, moneda_a, valor, activo, es_default, orden)
    values (${literal(clave)}, ${literal(nombre)}, 'USD', 'BOB', 7.5, true, false, 90)`)
  // El nodo `tc` (el primero de la fórmula de prueba) nombra el tipo de cambio propio, antes de abrir ninguna hoja.
  sql(`
    update public.formulas set definicion = jsonb_set(definicion, '{nodos,0,clave}', to_jsonb(${literal(clave)}::text))
    where origen_id = ${literal(origen.id)}::uuid and estado = 'publicada'`)
})

test.afterAll(async () => {
  await limpiarGuardado()
  // Su historial cae en cascada.
  sql(`delete from public.tipos_cambio where clave = ${literal(clave)}`)
})

const url = () => `/cotizaciones/nuevo?origen=${origen.id}&lead=${lead}`
const engranaje = (page: Page) =>
  page.getByRole('button', { name: 'Cambiar el valor por defecto de TC', exact: true })
const panel = (page: Page) => page.getByRole('dialog', { name: 'Tipo de cambio de TC' })
const aviso = (page: Page, texto: string | RegExp) =>
  page.locator('[data-sonner-toast]').filter({ hasText: texto })
const esLaLectura = (url: string) => url.includes('/rest/v1/rpc/formula_tipo_cambio_del_nodo')

async function abrir(page: Page): Promise<void> {
  await entrar(page, duena, { fresco: true })
  await page.goto(url())
  await expect(page.locator('[data-hoja]')).toBeVisible()
}

async function abrirElPanel(page: Page) {
  await engranaje(page).click()
  const abierto = panel(page)
  await expect(abierto.getByRole('button', { name: 'Cerrar' })).toBeFocused()
  await expect(abierto.getByLabel('Cargando el tipo de cambio')).toHaveCount(0)
  return abierto
}

test('E1: cambia el tipo de cambio para toda la empresa; la hoja se vuelve a abrir con el valor nuevo y guarda sin aviso', async ({
  page,
}) => {
  let lecturas = 0
  page.on('response', (r) => {
    if (esLaLectura(r.url())) {
      lecturas += 1
    }
  })
  await abrir(page)
  await tipearEnLaHoja(page, 'pub', '3')
  const lectura = page.waitForResponse((r) => esLaLectura(r.url()))
  const abierto = await abrirElPanel(page)
  const bytes = (await (await lectura).body()).length
  console.warn(
    `[bytes] el tipo de cambio de un nodo: ${String(bytes)} B (tope ${String(TOPE_DE_BYTES_DE_LA_LECTURA)})`,
  )
  expect(bytes).toBeLessThanOrEqual(TOPE_DE_BYTES_DE_LA_LECTURA)
  await expect(abierto.getByText(/Valor de hoy:/)).toContainText('1 USD = Bs 7,50')
  const campo = abierto.getByLabel('Valor nuevo')
  await expect(campo).toHaveValue('7,5')
  await campo.fill('7,8')
  await abierto.getByRole('button', { name: 'Cambiar el tipo de cambio' }).click()
  await expect(abierto).toBeHidden()
  await expect(
    aviso(page, `Cambiaste el tipo de cambio ${nombre} para toda la empresa.`),
  ).toBeVisible()
  expect(valorDe()).toBe('7.8')
  expect(historialDe()).toBe('7.5>7.8')
  // La hoja se vuelve a abrir con el valor nuevo; lo tipeado vuelve con el borrador (P2 del 4.20-3d).
  await expect(celdaDeLaHoja(page, 'tc')).toContainText('7,8')
  await expect(aviso(page, 'Recuperamos lo que habías escrito y no guardaste.')).toBeVisible()
  await expect(celdaDeLaHoja(page, 'pub')).toContainText('3,00')
  // El panel sigue cerrado tras el remonte.
  await expect(panel(page)).toHaveCount(0)
  expect(page.url()).not.toContain('ajuste=')
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  await expect(
    page.getByText('Cambió un tipo de cambio de la hoja mientras cotizabas.'),
  ).toHaveCount(0)
  console.warn(`[lecturas] del tipo de cambio en E1: ${String(lecturas)}`)
})

test('E2: si otra persona lo cambió con el panel abierto, dice el PT409 y, releído, cambia con lo tipeado', async ({
  page,
}) => {
  await abrir(page)
  const abierto = await abrirElPanel(page)
  sql(`update public.tipos_cambio set valor = 7.9 where clave = ${literal(clave)}`)
  const campo = abierto.getByLabel('Valor nuevo')
  await campo.fill('8')
  await abierto.getByRole('button', { name: 'Cambiar el tipo de cambio' }).click()
  await expect(
    abierto.getByText('Otra persona cambió este tipo de cambio mientras lo editabas.'),
  ).toBeVisible()
  await abierto.getByRole('button', { name: 'Volver a leer' }).click()
  await expect(abierto.getByText(/Valor de hoy:/)).toContainText('Bs 7,90')
  await expect(campo).toHaveValue('8')
  await abierto.getByRole('button', { name: 'Cambiar el tipo de cambio' }).click()
  await expect(abierto).toBeHidden()
  expect(valorDe()).toBe('8')
})

test('E3: el valor de hoy no se pide; con algo tipeado, Esc pregunta', async ({ page }) => {
  await abrir(page)
  const abierto = await abrirElPanel(page)
  const campo = abierto.getByLabel('Valor nuevo')
  await expect(campo).toHaveValue('8')
  await abierto.getByRole('button', { name: 'Cambiar el tipo de cambio' }).click()
  await expect(abierto.getByText('El tipo de cambio ya tiene ese valor.')).toBeVisible()
  expect(historialDe()).toBe('7.5>7.8,7.8>7.9,7.9>8')
  await campo.fill('9')
  await page.keyboard.press('Escape')
  await expect(abierto.getByText('Tienes cambios sin guardar.')).toBeVisible()
  await expect(abierto).toBeVisible()
  expect(valorDe()).toBe('8')
})

test('E4: en una guardada dice que la cotización conserva su tipo de cambio, sin formulario', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  const id = await guardarPorLaHoja(page, { origenId: origen.id, lead, pub: '4' })
  await page.goto(`/cotizaciones/${id}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
  await engranaje(page).click()
  const abierto = panel(page)
  await expect(
    abierto.getByText('Esta cotización conserva el tipo de cambio con que se guardó.'),
  ).toBeVisible()
  await expect(abierto.getByText(/se cambian en Configuración › Empresa › Monedas/)).toBeVisible()
  await expect(abierto.getByRole('link', { name: 'Ir a Monedas' })).toHaveAttribute(
    'href',
    '/configuracion/empresa?seccion=monedas',
  )
  await expect(abierto.getByLabel('Valor nuevo')).toHaveCount(0)
})
