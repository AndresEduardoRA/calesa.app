import { expect, test } from './soporte/prueba'
import { camposDelOrigen } from './soporte/origenes'
import {
  COREA,
  TAIWAN,
  aLaVista,
  cerrarPanelDeFiltros,
  entrar,
  esMovil,
  irAlOrigen,
  limpiarInventario,
  panelDeFiltros,
  prepararInventario,
  vehiculo,
  type Terreno,
} from './soporte/inventario'
import { vistasDe } from './soporte/vehiculos'

// El inventario contra la app compilada y el Supabase local: el listado por origen, sus filtros,
// las vistas guardadas y lo que ve cada quien. El alta y la edición van en `vehiculos-alta.spec.ts`.
test.describe.configure({ mode: 'serial' })

let duena = ''
let soloCorea = ''
let sinPermisos = ''
let corea: Terreno['corea'] = { id: '', nombre: '' }
let taiwan: Terreno['taiwan'] = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  ;({ duena, soloCorea, sinPermisos, corea, taiwan } = await prepararInventario(info.project.name))
})

test.afterAll(limpiarInventario)

test('una pestaña por origen con permiso, y el inventario del que se elige', async ({ page }) => {
  await entrar(page, duena)
  // El inventario ya está en la navegación (en el celular, dentro del menú).
  if (esMovil(page)) {
    await page.getByRole('button', { name: 'Abrir el menú' }).click()
  }
  await page.getByRole('link', { name: 'Vehículos' }).filter({ visible: true }).click()
  await expect(page).toHaveURL(/\/vehiculos/)
  const pestanas = page.getByRole('navigation', { name: 'Orígenes' })
  await expect(pestanas.getByRole('link', { name: COREA })).toBeVisible()
  await expect(pestanas.getByRole('link', { name: TAIWAN })).toBeVisible()

  await pestanas.getByRole('link', { name: COREA }).click()
  await expect(page).toHaveURL(new RegExp(`origen=${corea.id}`))
  await expect(vehiculo(page, 'Kia Sportage')).toBeVisible()
  await expect(vehiculo(page, 'Hyundai Tucson 100%')).toBeVisible()
  await expect(vehiculo(page, 'Kia Morning, base (2019)')).toBeVisible()

  // Un origen sin nada cargado lo dice con su nombre, no con un texto fijo.
  await pestanas.getByRole('link', { name: TAIWAN }).click()
  await expect(aLaVista(page.getByText('Ningún vehículo en Taiwán todavía'))).toBeVisible()
})

test('los filtros son los campos filtrables del origen y sobreviven a recargar', async ({
  page,
}) => {
  await entrar(page, duena)
  await irAlOrigen(page, corea)
  const filtrables = (await camposDelOrigen(corea.id))
    .filter((campo) => campo.activo && campo.filtrable)
    // Un campo de opciones sin opciones no tiene qué ofrecer.
    .filter((campo) => !campo.tipo.includes('opcion') || campo.opciones.length > 0)
  expect(filtrables.map((campo) => campo.clave)).toEqual(
    expect.arrayContaining(['color', 'transmision', 'tiene_llave', 'puertas']),
  )
  let panel = await panelDeFiltros(page)
  for (const campo of filtrables) {
    await expect(panel.getByText(campo.etiqueta, { exact: true })).toBeVisible()
  }
  // «Combustible» es filtrable pero no tiene opciones todavía: no aparece.
  await expect(panel.getByText('Combustible', { exact: true })).toBeHidden()

  await panel.getByRole('checkbox', { name: 'Automática' }).check()
  await cerrarPanelDeFiltros(page)
  await expect(page).toHaveURL(/a\.transmision=automatica/)
  await expect(vehiculo(page, 'Kia Morning, base (2019)')).toBeHidden()
  await expect(vehiculo(page, 'Kia Sportage')).toBeVisible()
  const chips = page.getByRole('list', { name: 'Filtros activos' })
  await expect(chips.getByText('Transmisión: Automática')).toBeVisible()

  panel = await panelDeFiltros(page)
  // «En vitrina» también es un sí o no: se elige el del campo.
  await panel.getByRole('group', { name: 'Tiene llave' }).getByRole('radio', { name: 'No' }).check()
  await cerrarPanelDeFiltros(page)
  await expect(vehiculo(page, 'Kia Sportage')).toBeHidden()
  await expect(vehiculo(page, 'Hyundai Tucson 100%')).toBeVisible()

  await page.reload()
  await expect(chips.getByText('Transmisión: Automática')).toBeVisible()
  await expect(chips.getByText('Tiene llave: no')).toBeVisible()
  await expect(vehiculo(page, 'Hyundai Tucson 100%')).toBeVisible()
  await expect(vehiculo(page, 'Kia Sportage')).toBeHidden()

  // Quitar un chip saca sólo ese filtro; «Limpiar», todos.
  await chips.getByRole('button', { name: 'Quitar el filtro Tiene llave: no' }).click()
  await expect(vehiculo(page, 'Kia Sportage')).toBeVisible()
  await chips.getByRole('button', { name: 'Limpiar' }).click()
  await expect(page.getByRole('list', { name: 'Filtros activos' })).toBeHidden()
  await expect(vehiculo(page, 'Kia Morning, base (2019)')).toBeVisible()
})

test('buscar con comas y paréntesis, filtrar por número, y un vacío por filtro', async ({
  page,
}) => {
  await entrar(page, duena)
  await irAlOrigen(page, corea)
  const busqueda = page.getByRole('searchbox', { name: 'Buscar por título, VIN o lote' })
  await busqueda.fill('morning, base (2019)')
  await expect(vehiculo(page, 'Kia Morning, base (2019)')).toBeVisible()
  await expect(vehiculo(page, 'Kia Sportage')).toBeHidden()
  // Un «%» es un carácter, no un comodín.
  await busqueda.fill('100%')
  await expect(vehiculo(page, 'Hyundai Tucson 100%')).toBeVisible()
  await expect(vehiculo(page, 'Kia Morning, base (2019)')).toBeHidden()
  await busqueda.fill('')
  await expect(vehiculo(page, 'Kia Sportage')).toBeVisible()

  const panel = await panelDeFiltros(page)
  await panel.getByRole('spinbutton', { name: 'Puertas, desde' }).fill('4')
  await cerrarPanelDeFiltros(page)
  await expect(vehiculo(page, 'Kia Sportage')).toBeHidden()
  await expect(vehiculo(page, 'Hyundai Tucson 100%')).toBeVisible()
  await expect(
    page.getByRole('list', { name: 'Filtros activos' }).getByText('Puertas: desde 4'),
  ).toBeVisible()

  await busqueda.fill('no existe ninguno así')
  await expect(aLaVista(page.getByText('Nada coincide con los filtros'))).toBeVisible()
  await page.getByRole('button', { name: 'Limpiar filtros' }).click()
  await expect(vehiculo(page, 'Kia Sportage')).toBeVisible()
})

test('lo que no corresponde en la URL se ignora sin romper', async ({ page }) => {
  await entrar(page, duena)
  await page.goto(
    `/vehiculos?origen=${corea.id}&a.transmision=inventada&anio.min=abc&anio.max=99999&a.tiene_llave=quizas&a.puertas.min=muchas&cursor=basura&a.noexiste=1`,
  )
  await expect(vehiculo(page, 'Kia Sportage')).toBeVisible()
  await expect(vehiculo(page, 'Kia Morning, base (2019)')).toBeVisible()
  await expect(page.getByRole('list', { name: 'Filtros activos' })).toBeHidden()
  // Un origen que no existe (o que no es de los suyos) cae en la primera pestaña.
  await page.goto('/vehiculos?origen=no-es-un-origen')
  await expect(page.getByRole('navigation', { name: 'Orígenes' })).toBeVisible()
  await expect(
    page.locator('[aria-current="page"]').filter({ visible: true }).first(),
  ).toBeVisible()
})

test('una vista guardada vuelve a poner sus filtros', async ({ page }) => {
  await entrar(page, duena)
  await page.goto(`/vehiculos?origen=${corea.id}&a.transmision=automatica&anio.min=2022`)
  await expect(vehiculo(page, 'Kia Sportage')).toBeVisible()
  await expect(vehiculo(page, 'Hyundai Tucson 100%')).toBeHidden()

  await page.getByRole('button', { name: 'Vistas' }).click()
  await page.getByLabel('Guardar los filtros de ahora').fill('Automáticos nuevos')
  await page.getByRole('button', { name: 'Guardar vista' }).click()
  await expect(page.getByText('Vista «Automáticos nuevos» guardada')).toBeVisible()
  expect(await vistasDe(duena)).toEqual([
    {
      nombre: 'Automáticos nuevos',
      params: { origen: corea.id, 'a.transmision': 'automatica', 'anio.min': '2022' },
    },
  ])

  // Desde otra pestaña de origen, sin filtros: aplicarla vuelve a Corea con los suyos.
  await page.goto(`/vehiculos?origen=${taiwan.id}`)
  await expect(aLaVista(page.getByText('Ningún vehículo en Taiwán todavía'))).toBeVisible()
  await page.getByRole('button', { name: 'Vistas' }).click()
  await page.getByRole('button', { name: 'Automáticos nuevos', exact: true }).click()
  await expect(page).toHaveURL(/a\.transmision=automatica/)
  await expect(page.getByRole('link', { name: COREA })).toHaveAttribute('aria-current', 'page')
  await expect(vehiculo(page, 'Kia Sportage')).toBeVisible()
  await expect(vehiculo(page, 'Hyundai Tucson 100%')).toBeHidden()
  await expect(
    page.getByRole('list', { name: 'Filtros activos' }).getByText('Año: desde 2022'),
  ).toBeVisible()
})

test('quien tiene permiso en un solo origen no ve la pestaña de los otros', async ({ page }) => {
  await entrar(page, soloCorea)
  await page.goto('/vehiculos')
  const pestanas = page.getByRole('navigation', { name: 'Orígenes' })
  await expect(pestanas.getByRole('link', { name: COREA })).toBeVisible()
  await expect(pestanas.getByRole('link')).toHaveCount(1)
  await expect(vehiculo(page, 'Kia Sportage')).toBeVisible()
  // Pedir por URL el origen que no le toca no lo muestra: cae en el suyo.
  await page.goto(`/vehiculos?origen=${taiwan.id}`)
  await expect(pestanas.getByRole('link', { name: COREA })).toHaveAttribute('aria-current', 'page')
  await expect(pestanas.getByRole('link', { name: TAIWAN })).toBeHidden()
  await expect(aLaVista(page.getByText('Ningún vehículo en Taiwán todavía'))).toBeHidden()
})

test('sin permiso en ningún origen, lo dice', async ({ page }) => {
  await entrar(page, sinPermisos)
  await page.goto('/vehiculos')
  await expect(
    aLaVista(page.getByText('No tienes permiso para ver vehículos en ningún origen.')),
  ).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Orígenes' })).toBeHidden()
})
