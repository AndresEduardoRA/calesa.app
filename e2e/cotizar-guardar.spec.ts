import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { vigilarRecalculos } from './soporte/cotizar'
import {
  cotizacionGuardada,
  escribirEnLaHoja,
  formulaVigente,
  guardarConElAtajo,
  limpiarGuardado,
  prepararGuardado,
  tarjetaGuardada,
  tipearEnLaHoja,
  totalDeLaHoja,
  vigilarGuardados,
} from './soporte/cotizar-guardar'
import { idDe } from './soporte/leads'
import { formatearMonto } from '../src/shared/lib/formato'

// Guardar la hoja de cotizar (paso 4.13-3b, `docs/UX.md` › «Cotizar»): `Ctrl/Cmd+S` o «Guardar» crean la cotización con `cotizacion_crear`, con la misma hoja abierta que el
// último recálculo, y la pantalla muestra lo guardado. Una celda abierta se confirma antes; con lo que no es un número no se guarda. Sin lead no se guarda.
test.describe.configure({ mode: 'serial' })

let origen = { id: '', nombre: '' }
let duena = ''
let lead = ''

test.beforeAll(async ({}, info) => {
  ;({ origen, duena, lead } = await prepararGuardado(info.project.name, 'guardar'))
})

test.afterAll(async () => {
  await limpiarGuardado()
})

const sinEspacios = (texto: string | null) => (texto ?? '').replace(/\s/g, '')

test('Ctrl+S guarda la hoja: una fila con quien guardó, la versión vigente y el total que se ve', async ({
  page,
}) => {
  const recalculos = await vigilarRecalculos(page)
  const guardados = await vigilarGuardados(page)
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${origen.id}&lead=${lead}`)
  await tipearEnLaHoja(page, 'pub', '1200')
  await expect(totalDeLaHoja(page)).toContainText('1.205,00')
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toContainText(/Cotización n\.º \d+ guardada/)
  const [pedido] = guardados.pedidos
  expect(guardados.pedidos).toHaveLength(1)
  expect(pedido?.abierta).toBe(recalculos.pedidos.at(-1)?.p_abierta)
  expect(pedido?.leadId).toBe(lead)
  const fila = cotizacionGuardada(pedido?.intento ?? '')
  expect(fila.filas).toBe(1)
  expect(fila.creadoPor).toBe(await idDe(duena))
  expect(fila.formulaId).toBe(formulaVigente(origen.id))
  const esperado = formatearMonto(Number(fila.totalBase), { moneda: 'USD', locale: 'es-BO' })
  expect(
    sinEspacios(await tarjetaGuardada(page).locator('[data-total-guardado]').textContent()),
  ).toContain(sinEspacios(esperado))
})

test('una celda abierta se confirma al guardar; con «abc» y un clic en «Guardar» no se guarda y la celda sigue abierta', async ({
  page,
}) => {
  const guardados = await vigilarGuardados(page)
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${origen.id}&lead=${lead}`)
  await escribirEnLaHoja(page, 'pub', '700')
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  expect(guardados.pedidos[0]?.entradas.inputs).toEqual({ pub: 700 })
  await page.getByRole('button', { name: 'Cotizar otra' }).click()
  const entrada = await escribirEnLaHoja(page, 'pub', 'abc')
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(entrada).toHaveAttribute('aria-invalid', 'true')
  await expect(entrada).toBeFocused()
  expect(guardados.pedidos).toHaveLength(1)
})

test('sin lead, «Guardar» está apagado con su motivo y Ctrl+S no manda nada', async ({ page }) => {
  const guardados = await vigilarGuardados(page)
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${origen.id}`)
  await expect(page.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  await expect(page.getByText('Para guardar, abre la hoja desde un lead.')).toBeVisible()
  await tipearEnLaHoja(page, 'pub', '5')
  await guardarConElAtajo(page)
  await expect(totalDeLaHoja(page)).toContainText('10,00')
  expect(guardados.pedidos).toHaveLength(0)
})
