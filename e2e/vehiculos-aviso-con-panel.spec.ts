import { expect, test, type Page } from './soporte/prueba'
import { entrar, limpiarInventario, prepararInventario, type Terreno } from './soporte/inventario'
import { avisoNoTapaElPie } from './soporte/recorrido'

// «Abrir ficha» del aviso de un vehículo recién creado, con el siguiente a medio escribir en el panel (cierre 2): pregunta en el
// pie del panel antes de irse; «Seguir editando» no tira nada y «Descartar» sigue a la ficha y deja el formulario vacío.
test.describe.configure({ mode: 'serial' })

let duena = ''
let corea: Terreno['corea'] = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  ;({ duena, corea } = await prepararInventario(info.project.name))
})

test.afterAll(limpiarInventario)

async function crearUnoYEscribirOtro(page: Page, titulo: string) {
  await entrar(page, duena)
  await page.goto(`/vehiculos?origen=${corea.id}&panel=nuevo`)
  const panel = page.getByRole('dialog', { name: 'Nuevo vehículo' })
  const campo = panel.getByLabel('Título (obligatorio)')
  await campo.fill(titulo)
  await page.keyboard.press('Control+Enter')
  const aviso = page.locator('[data-sonner-toast]').filter({ hasText: /Vehículo #\d+ creado/ })
  await expect(aviso.getByRole('button', { name: 'Abrir ficha' })).toBeVisible()
  await expect(campo).toHaveValue('')
  await campo.fill(`${titulo} siguiente`)
  return { panel, campo, abrirFicha: aviso.getByRole('button', { name: 'Abrir ficha' }) }
}

test('con el siguiente escrito, «Abrir ficha» pregunta en el pie y «Seguir editando» no tira nada', async ({
  page,
}) => {
  const { panel, campo, abrirFicha } = await crearUnoYEscribirOtro(page, 'Aviso panel uno')
  const antes = page.url()
  await abrirFicha.click()
  await expect(panel.getByText('Tienes cambios sin guardar.')).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Seguir editando' })).toBeFocused()
  expect(page.url()).toBe(antes)
  await panel.getByRole('button', { name: 'Seguir editando' }).click()
  await expect(panel.getByText('Tienes cambios sin guardar.')).toHaveCount(0)
  await expect(campo).toHaveValue('Aviso panel uno siguiente')
})

test('«Abrir ficha» y «Descartar» siguen a la ficha y el panel queda vacío', async ({ page }) => {
  const { panel, abrirFicha } = await crearUnoYEscribirOtro(page, 'Aviso panel dos')
  await abrirFicha.click()
  await panel.getByRole('button', { name: 'Descartar' }).click()
  await expect(page).toHaveURL(/\/vehiculos\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('heading', { name: 'Aviso panel dos', level: 1 })).toBeVisible()
  await page.goto(`/vehiculos?origen=${corea.id}&panel=nuevo`)
  await expect(
    page.getByRole('dialog', { name: 'Nuevo vehículo' }).getByLabel('Título (obligatorio)'),
  ).toHaveValue('')
})

// El aviso con «Abrir ficha» no tapa los botones del pie del panel (cierre 3): con el pie dentro del cuerpo, pegado abajo, y con el
// texto normal y al 200 %.
for (const texto of ['normal', 'al 200 %']) {
  test(`el aviso no tapa «Cancelar» ni «Guardar» del panel de vehículo, con el texto ${texto}`, async ({
    page,
  }) => {
    await entrar(page, duena)
    await page.goto(`/vehiculos?origen=${corea.id}&panel=nuevo`)
    if (texto === 'al 200 %') {
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%'
      })
    }
    const panel = page.getByRole('dialog', { name: 'Nuevo vehículo' })
    await panel.getByLabel('Título (obligatorio)').fill(`Aviso pie ${texto}`)
    await page.keyboard.press('Control+Enter')
    const aviso = page.locator('[data-sonner-toast]').filter({ hasText: /Vehículo #\d+ creado/ })
    await expect(aviso.getByRole('button', { name: 'Abrir ficha' })).toBeVisible()
    await avisoNoTapaElPie(aviso, panel.locator('[data-pie-de-panel]'))
  })
}
