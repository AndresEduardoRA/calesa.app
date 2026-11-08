import { entrar } from './soporte/alta'
import {
  estadoDeLaFinal,
  limpiarFinal,
  prepararFinal,
  sembrarParaMarcar,
  vincularAOtroLead,
  type TerrenoDeLaFinal,
} from './soporte/cotizaciones-final'
import { expect, test, type Page } from './soporte/prueba'

// «Marcar final» en una cotización guardada (paso 4.25-2, `docs/UX.md` › «Cotización guardada»): el botón de la cabecera lo ve, en una preventa, quien gestiona
// finales en su origen; abre un `<Confirmar>` en `?panel=marcar-final` que dice qué pasa. Al entrar la cabecera dice «Final», el botón ya no está, sale el aviso
// y la URL queda sin panel; en la base, el vehículo queda con el lead, el lead pasa a cliente y la otra preventa va a la papelera. Si la base lo rechaza, el
// diálogo lo dice y sigue abierto. Sin vehículo, el botón está apagado con su motivo. El terreno lo arma `soporte/cotizaciones-final.ts`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDeLaFinal

test.beforeAll(async ({}, info) => {
  t = await prepararFinal(info.project.name)
})

test.afterAll(async () => {
  await limpiarFinal()
})

const botonMarcar = (page: Page) => page.getByRole('button', { name: 'Marcar final' })
const dialogo = (page: Page) => page.getByRole('dialog')
const cabecera = (page: Page) => page.locator('[data-cabecera-de-la-guardada]')

// Abre la guardada como esa persona y espera la cabecera («Revisiones» la ve todo el que la abre).
async function abrir(page: Page, correo: string, id: string, consulta = ''): Promise<void> {
  await page.context().clearCookies()
  await entrar(page, correo, { fresco: true })
  await page.goto(`/cotizaciones/${id}${consulta}`)
  await expect(page.getByRole('button', { name: 'Revisiones' })).toBeVisible()
}

test('E1 la dueña la marca: la cabecera dice «Final» y la base quedó como marcar', async ({
  page,
}) => {
  const { ids, vehiculoId } = await sembrarParaMarcar(t, 'E1', { cuantas: 2 })
  const [id = '', otra = ''] = ids
  await abrir(page, t.duena, id)
  await botonMarcar(page).click()
  await expect(page).toHaveURL(/panel=marcar-final/)
  await expect(dialogo(page)).toContainText('Marcar como final la cotización n.º')
  await expect(dialogo(page)).toContainText(
    'el vehículo queda vinculado a su lead, el lead pasa a cliente',
  )
  await dialogo(page).getByRole('button', { name: 'Marcar final' }).click()
  await expect(page.getByText(/Marcaste la n\.º \d+ como final\./)).toBeVisible()
  await expect(cabecera(page).getByText('Final', { exact: true })).toBeVisible()
  await expect(botonMarcar(page)).toHaveCount(0)
  await expect(page).not.toHaveURL(/panel=/)
  const estado = estadoDeLaFinal({ id, otra, vehiculoId: vehiculoId ?? '' })
  expect(estado.clase).toBe('final')
  expect(estado.otraEnPapelera).toBe(true)
  expect(estado.leadClase).toBe('cliente')
  expect(estado.vehiculoLead).not.toBe('')
})

test('E2 Ana, sin gestionar finales, no ve «Marcar final»', async ({ page }) => {
  const { ids } = await sembrarParaMarcar(t, 'E2', { creadoPor: t.ana })
  await abrir(page, t.ana, ids[0] ?? '')
  await expect(page.getByRole('button', { name: 'Enviar a la papelera' })).toBeVisible()
  await expect(botonMarcar(page)).toHaveCount(0)
})

test('E3 el vehículo de otro lead: el diálogo lo dice, sigue abierto y no cambia nada', async ({
  page,
}) => {
  const { ids, vehiculoId } = await sembrarParaMarcar(t, 'E3')
  const id = ids[0] ?? ''
  const otro = await vincularAOtroLead(t, vehiculoId ?? '')
  await abrir(page, t.duena, id)
  await botonMarcar(page).click()
  await dialogo(page).getByRole('button', { name: 'Marcar final' }).click()
  await expect(dialogo(page)).toContainText(
    'Este vehículo está vinculado a otro lead. Desvincúlalo antes de marcar la final.',
  )
  await expect(dialogo(page)).toBeVisible()
  const estado = estadoDeLaFinal({ id, vehiculoId: vehiculoId ?? '' })
  expect(estado.clase).toBe('preventa')
  expect(estado.vehiculoLead).toBe(otro)
  await dialogo(page).getByRole('button', { name: 'Cancelar' }).click()
  await expect(dialogo(page)).toBeHidden()
  await expect(page).not.toHaveURL(/panel=/)
})

test('E4 sin vehículo el botón está apagado y dice por qué', async ({ page }) => {
  const { ids } = await sembrarParaMarcar(t, 'E4', { sinVehiculo: true })
  await abrir(page, t.duena, ids[0] ?? '')
  await expect(botonMarcar(page)).toBeDisabled()
  await expect(botonMarcar(page)).toHaveAccessibleDescription(
    'Para marcarla final, elige el vehículo y guarda.',
  )
})

test('E5 recargar con la URL abre el diálogo y «atrás» lo cierra sin marcar', async ({ page }) => {
  const { ids, vehiculoId } = await sembrarParaMarcar(t, 'E5')
  const id = ids[0] ?? ''
  await abrir(page, t.duena, id)
  await botonMarcar(page).click()
  await expect(dialogo(page)).toBeVisible()
  await page.reload()
  await expect(dialogo(page)).toContainText('Marcar como final la cotización n.º')
  await page.goBack()
  await expect(dialogo(page)).toBeHidden()
  await expect(page).not.toHaveURL(/panel=/)
  expect(estadoDeLaFinal({ id, vehiculoId: vehiculoId ?? '' }).clase).toBe('preventa')
})
