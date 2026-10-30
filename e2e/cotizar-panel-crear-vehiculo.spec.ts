import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { limpiarGuardado, prepararGuardado } from './soporte/cotizar-guardar'
import { crearOrigenDeSubastaDeCotizar } from './soporte/cotizar-formula'
import { literal, sql } from './soporte/sql'

// Buscar, traer y crear el vehículo desde el panel de la hoja de cotizar (paso 4.14-2c1, `docs/UX.md` › «Cotizar»): un campo arriba del panel busca por nombre, VIN o
// lote entre los vehículos del origen (desde 3 letras o números, sin pestañas mientras hay resultados) y elegir un resultado es elegir el vehículo de la hoja.
test.describe.configure({ mode: 'serial' })

let subasta = { id: '', nombre: '' }
let duena = ''
let lead = ''

// 25 vehículos «Crea busca 01» a «25», del más nuevo (01) al más viejo, para recorrer una página de 20 y otra de 5.
function sembrar(origenId: string): void {
  const o = `${literal(origenId)}::uuid`
  sql(`
    insert into public.vehiculos (origen_id, titulo, creado_en)
      select ${o}, 'Crea busca ' || lpad(g::text, 2, '0'), now() - g * interval '1 minute'
        from generate_series(1, 25) g;`)
}

test.beforeAll(async ({}, info) => {
  ;({ duena, lead } = await prepararGuardado(info.project.name, 'creaveh'))
  subasta = await crearOrigenDeSubastaDeCotizar(info.project.name, 'creasub')
  sembrar(subasta.id)
})

test.afterAll(async () => {
  await limpiarGuardado()
})

const barra = (page: Page): Locator => page.getByRole('button', { name: /^Vehículo:/ })
const panel = (page: Page): Locator => page.getByRole('dialog', { name: 'Vehículo' })
const campo = (page: Page): Locator => panel(page).getByRole('searchbox')
const tarjetas = (page: Page): Locator =>
  panel(page).getByRole('list', { name: 'Vehículos' }).getByRole('listitem')

async function abrirElPanel(page: Page, origenId: string): Promise<void> {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${origenId}&lead=${lead}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
  await barra(page).click()
  await expect(panel(page)).toBeVisible()
}

test('E2E B1 buscar por nombre: sin pestañas, de a 20, el vacío y el mínimo', async ({ page }) => {
  await abrirElPanel(page, subasta.id)
  await expect(panel(page).getByRole('tab', { name: 'Últ. cotización' })).toBeVisible()
  await campo(page).fill('Crea busca')
  await expect(panel(page).getByRole('heading', { name: 'Resultados' })).toBeVisible()
  await expect(panel(page).getByRole('tab')).toHaveCount(0)
  await expect(tarjetas(page)).toHaveCount(20)
  await expect(tarjetas(page).first()).toContainText('Crea busca 01')
  await expect(page).toHaveURL(/buscar=Crea\+busca|buscar=Crea%20busca/)
  await panel(page).getByRole('button', { name: 'Siguiente' }).click()
  await expect(tarjetas(page)).toHaveCount(5)
  await expect(tarjetas(page).last()).toContainText('Crea busca 25')

  await campo(page).fill('zzq')
  await expect(
    panel(page).getByText(
      'Ningún vehículo de este origen tiene «zzq» en el título, el VIN o el lote.',
    ),
  ).toBeVisible()
  await expect(page).not.toHaveURL(/cursor=/)

  await campo(page).fill('Cr')
  await expect(panel(page).getByText('Escribe al menos 3 letras o números.')).toBeVisible()
  await expect(panel(page).getByRole('tab', { name: 'Últ. cotización' })).toBeVisible()
  await expect(panel(page).getByRole('heading', { name: 'Resultados' })).toHaveCount(0)
})

test('E2E B1 elegir un resultado pone el vehículo en la barra y cierra el panel', async ({
  page,
}) => {
  await abrirElPanel(page, subasta.id)
  await campo(page).fill('Crea busca 07')
  await expect(tarjetas(page)).toHaveCount(1)
  await tarjetas(page).first().getByRole('button').click()
  await expect(panel(page)).toBeHidden()
  await expect(barra(page)).toContainText('Crea busca 07')
  await expect(page).toHaveURL(/vehiculo=/)
  await expect(page).not.toHaveURL(/buscar=/)
})
