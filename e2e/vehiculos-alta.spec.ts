import { expect, test } from '@playwright/test'
import {
  TAIWAN,
  aLaVista,
  bloque,
  descartarAviso,
  entrar,
  esMovil,
  irAlOrigen,
  limpiarInventario,
  otraPersona,
  prepararInventario,
  vehiculo,
  type Terreno,
} from './soporte/inventario'
import {
  cambiarOrigen,
  cargarVehiculos,
  vehiculoPorTitulo,
  vehiculosDelOrigen,
} from './soporte/vehiculos'

// Alta y edición de vehículos contra la app compilada y el Supabase local. Una sola historia, en
// orden: se da de alta en «Corea», se edita entre dos personas (conflicto), se cae la conexión con
// el panel abierto y se desactiva un origen.
test.describe.configure({ mode: 'serial' })

let duena = ''
let soloCorea = ''
let corea: Terreno['corea'] = { id: '', nombre: '' }
let taiwan: Terreno['taiwan'] = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  ;({ duena, soloCorea, corea, taiwan } = await prepararInventario(info.project.name))
})

test.afterAll(limpiarInventario)

test('dar de alta un vehículo en Corea, con los valores por defecto y los atajos', async ({
  page,
}) => {
  await entrar(page, duena)
  await irAlOrigen(page, corea)
  // La tecla N abre «Nuevo» (en el celular, el botón).
  const panel = page.getByRole('dialog', { name: 'Nuevo vehículo' })
  if (esMovil(page)) {
    await page.getByRole('button', { name: 'Nuevo vehículo' }).click()
    await expect(panel).toBeVisible()
  } else {
    // El atajo existe recién cuando la página terminó de hidratar: se insiste hasta que abre.
    await expect(async () => {
      await page.keyboard.press('n')
      await expect(panel).toBeVisible({ timeout: 1000 })
    }).toPass()
  }
  await expect(page).toHaveURL(/panel=nuevo/)

  // Sin título no se guarda, y el motivo queda junto al campo; un año imposible, también.
  const titulo = panel.getByLabel('Título (obligatorio)')
  await panel.getByLabel('Año').fill('1800')
  await panel.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(panel.getByText('Este dato es obligatorio.')).toBeVisible()
  await expect(panel.getByText('Tiene que ser un número entero entre 1900 y 2100.')).toBeVisible()
  await expect(titulo).toBeFocused()

  await titulo.fill('Kia Seltos 2022')
  await panel.getByLabel('Marca').fill('Kia')
  await panel.getByLabel('Año').fill('2022')
  await panel.getByLabel('VIN').fill('kndeu2aa5n7123456')
  // Los grupos del layout son bloques plegables, con los nombres que les puso el origen.
  await bloque(panel, 'Vehículo').click()
  await panel.getByLabel('Color').fill('Verde')
  await panel.getByLabel('Transmisión').selectOption({ label: 'Automática' })
  // «Puertas» trae puesto el valor por defecto del layout.
  await expect(panel.getByLabel('Puertas')).toHaveValue('5')

  // Ctrl/Cmd+Enter guarda y deja el panel listo para el siguiente.
  await page.keyboard.press('Control+Enter')
  await expect(page.getByText(/Vehículo #\d+ creado/)).toBeVisible()
  await expect(panel).toBeVisible()
  await expect(titulo).toHaveValue('')
  await expect(titulo).toBeFocused()
  await descartarAviso(page, /Vehículo #\d+ creado/)

  const creado = await vehiculoPorTitulo('Kia Seltos 2022')
  expect(creado).toMatchObject({
    marca: 'Kia',
    anio: 2022,
    vin: 'KNDEU2AA5N7123456',
    // Corea no tiene fases todavía: nace sin fase.
    fase_id: null,
    atributos: { color: 'Verde', transmision: 'automatica', puertas: 5 },
  })

  await panel.getByRole('button', { name: 'Cancelar' }).click()
  await expect(panel).toBeHidden()
  await expect(vehiculo(page, 'Kia Seltos 2022')).toBeVisible()

  // Su ficha: los datos por los grupos del layout y la fase de sólo lectura.
  await aLaVista(page.getByRole('link', { name: 'Kia Seltos 2022' })).click()
  await expect(page.getByRole('heading', { name: 'Kia Seltos 2022', level: 1 })).toBeVisible()
  await expect(aLaVista(page.getByText('Sin fase'))).toBeVisible()
  await expect(aLaVista(page.getByText('KNDEU2AA5N7123456'))).toBeVisible()
  await expect(aLaVista(page.getByText('Verde', { exact: true }))).toBeVisible()
  await expect(aLaVista(page.getByText('Automática', { exact: true }))).toBeVisible()
  // Sólo existe la pestaña «Ficha»: no hay barra de pestañas ni enlaces a lo que falta.
  await expect(aLaVista(page.getByRole('tab'))).toHaveCount(0)
})

test('un VIN repetido se dice junto al campo', async ({ page }) => {
  await entrar(page, duena)
  await page.goto(`/vehiculos?origen=${corea.id}&panel=nuevo`)
  const panel = page.getByRole('dialog', { name: 'Nuevo vehículo' })
  await panel.getByLabel('Título (obligatorio)').fill('Repetido')
  await panel.getByLabel('VIN').fill('KNDEU2AA5N7123456')
  await panel.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(panel.getByText('Ya hay un vehículo con el VIN KNDEU2AA5N7123456.')).toBeVisible()
  await expect(panel.getByLabel('Título (obligatorio)')).toHaveValue('Repetido')
  expect(await vehiculoPorTitulo('Repetido')).toBeNull()
})

test('dos personas editan el mismo vehículo: la segunda se entera de quién lo cambió', async ({
  page,
  browser,
}) => {
  await entrar(page, duena)
  await irAlOrigen(page, corea)
  await aLaVista(page.getByRole('button', { name: 'Editar Kia Seltos 2022' })).click()
  const panel = page.getByRole('dialog', { name: 'Editar Kia Seltos 2022' })
  await expect(panel.getByLabel('Marca')).toHaveValue('Kia')

  // Sara abre el mismo vehículo desde su ficha, lo cambia y guarda.
  const deSara = await otraPersona(browser, page)
  await entrar(deSara, soloCorea)
  const seltos = await vehiculoPorTitulo('Kia Seltos 2022')
  await deSara.goto(`/vehiculos/${seltos?.id ?? ''}`)
  await deSara.getByRole('button', { name: 'Editar' }).click()
  const panelDeSara = deSara.getByRole('dialog', { name: 'Editar Kia Seltos 2022' })
  await panelDeSara.getByLabel('Modelo').fill('Seltos EX')
  await panelDeSara.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(deSara.getByText('Cambios guardados')).toBeVisible()
  await expect(panelDeSara).toBeHidden()

  // La dueña, con la versión vieja en pantalla, guarda con Ctrl/Cmd+S.
  await panel.getByLabel('Marca').fill('KIA Motors')
  await page.keyboard.press('Control+s')
  const aviso = panel.getByText(/Sara Corea cambió este vehículo hace/)
  await expect(aviso).toBeVisible()
  await expect(panel.getByRole('link', { name: 'Ver cómo quedó' })).toHaveAttribute(
    'href',
    `/vehiculos/${seltos?.id ?? ''}`,
  )
  // No se pisó nada, y lo que escribió sigue ahí.
  expect((await vehiculoPorTitulo('Kia Seltos 2022'))?.marca).toBe('Kia')
  await expect(panel.getByLabel('Marca')).toHaveValue('KIA Motors')

  // «Recargar» trae la versión de Sara; ahora sí puede guardar encima.
  await panel.getByRole('button', { name: 'Recargar' }).click()
  await expect(panel.getByLabel('Modelo')).toHaveValue('Seltos EX')
  await expect(panel.getByLabel('Marca')).toHaveValue('Kia')
  await expect(aviso).toBeHidden()
  await panel.getByLabel('Marca').fill('KIA Motors')
  await panel.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Cambios guardados')).toBeVisible()
  expect(await vehiculoPorTitulo('Kia Seltos 2022')).toMatchObject({
    marca: 'KIA Motors',
    atributos: { color: 'Verde', transmision: 'automatica', puertas: 5 },
  })
  await deSara.context().close()
})

test('con la conexión caída el panel conserva lo escrito y guarda una sola vez al volver', async ({
  page,
  context,
}) => {
  await entrar(page, duena)
  await page.goto(`/vehiculos?origen=${corea.id}&panel=nuevo`)
  const panel = page.getByRole('dialog', { name: 'Nuevo vehículo' })
  await panel.getByLabel('Título (obligatorio)').fill('Cargado sin conexión')
  await panel.getByLabel('Marca').fill('Hyundai')

  await context.setOffline(true)
  await expect(panel.getByText(/No hay conexión/)).toBeVisible()
  await panel.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(panel.getByText(/se va a guardar solo cuando vuelva/)).toBeVisible()
  await expect(panel.getByLabel('Título (obligatorio)')).toHaveValue('Cargado sin conexión')
  await expect(panel.getByLabel('Marca')).toHaveValue('Hyundai')
  expect(await vehiculoPorTitulo('Cargado sin conexión')).toBeNull()

  await context.setOffline(false)
  await expect(page.getByText(/Vehículo #\d+ creado/)).toBeVisible()
  const cargados = (await vehiculosDelOrigen(corea.id)).filter(
    (uno) => uno.titulo === 'Cargado sin conexión',
  )
  expect(cargados).toHaveLength(1)
  expect(cargados[0]?.marca).toBe('Hyundai')
})

test('un origen desactivado se sigue viendo, y «Nuevo» sale apagado con el motivo', async ({
  page,
}) => {
  await cargarVehiculos(taiwan.id, [{ titulo: 'Luxgen U6', anio: 2020 }])
  await cambiarOrigen(taiwan.id, { activo: false })
  await entrar(page, duena)
  await page.goto(`/vehiculos?origen=${taiwan.id}`)
  const pestana = page
    .getByRole('navigation', { name: 'Orígenes' })
    .getByRole('link', { name: TAIWAN })
  await expect(pestana).toHaveAttribute('aria-current', 'page')
  await expect(pestana.getByText('Inactivo')).toBeVisible()
  await expect(vehiculo(page, 'Luxgen U6')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nuevo vehículo' })).toBeDisabled()
  await expect(
    page.getByText('Taiwán está desactivado: no recibe registros nuevos.', { exact: false }),
  ).toBeVisible()
  // La tecla N no abre nada, y pedirlo por URL tampoco.
  await page.keyboard.press('n')
  await page.goto(`/vehiculos?origen=${taiwan.id}&panel=nuevo`)
  await expect(vehiculo(page, 'Luxgen U6')).toBeVisible()
  await expect(page.getByRole('dialog')).toBeHidden()
  // Lo que ya tiene se sigue editando.
  await aLaVista(page.getByRole('button', { name: 'Editar Luxgen U6' })).click()
  await expect(page.getByRole('dialog', { name: 'Editar Luxgen U6' })).toBeVisible()
  await cambiarOrigen(taiwan.id, { activo: true })
})
