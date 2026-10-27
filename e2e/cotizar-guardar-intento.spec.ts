import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import {
  cotizacionGuardada,
  guardarConElAtajo,
  limpiarGuardado,
  prepararGuardado,
  tarjetaGuardada,
  tipearEnLaHoja,
  totalDeLaHoja,
  vigilarGuardados,
} from './soporte/cotizar-guardar'
import { formatearMonto } from '../src/shared/lib/formato'

// El intento de un guardado (4-21): si la respuesta se pierde, el próximo guardado reenvía ESE pedido con ese intento —también tras recargar— y la base devuelve lo que guardó
// la primera vez (`repetido`): una sola cotización, y la pantalla muestra lo guardado y no lo tipeado después.
test.describe.configure({ mode: 'serial' })

let origen = { id: '', nombre: '' }
let duena = ''
let lead = ''

test.beforeAll(async ({}, info) => {
  ;({ origen, duena, lead } = await prepararGuardado(info.project.name, 'intento'))
})

test.afterAll(async () => {
  await limpiarGuardado()
})

const sinEspacios = (texto: string | null) => (texto ?? '').replace(/\s/g, '')

test('con la respuesta perdida, el próximo guardado manda el pedido viejo y se ve lo guardado', async ({
  page,
}) => {
  const guardados = await vigilarGuardados(page)
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${origen.id}&lead=${lead}`)
  await tipearEnLaHoja(page, 'pub', '100')
  await expect(totalDeLaHoja(page)).toContainText('105,00')
  guardados.perderLaProxima()
  await guardarConElAtajo(page)
  await expect(page.getByText('El último guardado no se confirmó.', { exact: false })).toBeVisible()
  await tipearEnLaHoja(page, 'pub', '999')
  await expect(totalDeLaHoja(page)).toContainText('1.004,00')
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toContainText(
    'ya se había guardado antes de que se cortara la conexión',
  )
  const [primero, segundo] = guardados.pedidos
  expect(segundo?.intento).toBe(primero?.intento)
  expect(segundo?.entradas.inputs).toEqual({ pub: 100 })
  const fila = cotizacionGuardada(primero?.intento ?? '')
  expect(fila.filas).toBe(1)
  const esperado = formatearMonto(Number(fila.totalBase), { moneda: 'USD', locale: 'es-BO' })
  expect(
    sinEspacios(await tarjetaGuardada(page).locator('[data-total-guardado]').textContent()),
  ).toContain(sinEspacios(esperado))
  expect(esperado).toContain('105,00')
})

test('tras recargar, el pendiente sigue en la pestaña y se reenvía con el mismo intento', async ({
  page,
}) => {
  const guardados = await vigilarGuardados(page)
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${origen.id}&lead=${lead}`)
  await tipearEnLaHoja(page, 'pub', '40')
  await expect(totalDeLaHoja(page)).toContainText('45,00')
  guardados.perderLaProxima()
  await guardarConElAtajo(page)
  await expect(page.getByText('El último guardado no se confirmó.', { exact: false })).toBeVisible()
  await page.reload()
  await expect(page.getByText('El último guardado no se confirmó.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Guardar' }).click()
  await expect(tarjetaGuardada(page)).toContainText('ya se había guardado')
  const [primero, segundo] = guardados.pedidos
  expect(segundo?.intento).toBe(primero?.intento)
  expect(cotizacionGuardada(primero?.intento ?? '').filas).toBe(1)
})
