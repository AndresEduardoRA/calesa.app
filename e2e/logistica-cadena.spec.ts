import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import {
  borrarCadena,
  CANTIDAD_EN_LA_COLA,
  sembrarCadena,
  type TerrenoDeLaCadena,
} from './soporte/cadena'

// La cadena de `/logistica` (6.03), en escritorio: un origen de tres fases con cinco vehículos (uno sin fase, uno demorado, uno con contenedor y ETA), las columnas en el orden de la base y con su
// número; «Demorado» dicho con texto; la búsqueda por VIN en la URL con «dónde está»; el clic que abre el panel sobre los filtros y «Limpiar»; las pestañas de origen (el vecino sin permiso no está,
// el otro cambia de origen y suelta los filtros); y «Ver más» de una columna de 51 (que prueba que la fecha que vuelve de la base pasa la validación de la acción).
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let terreno: TerrenoDeLaCadena

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  if (proyecto !== 'escritorio') return
  await borrarCadena(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-cadena-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dalia Cadena',
  })
  terreno = await sembrarCadena(proyecto)
})

test.afterAll(async () => {
  if (proyecto !== 'escritorio') return
  await borrarCadena(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test.beforeEach(({}, info) => {
  test.skip(info.project.name !== 'escritorio', 'La cadena se recorre en escritorio.')
})

test('las columnas van en el orden de la base con su número y el demorado lo dice con texto', async ({
  page,
}) => {
  await entrar(page, terreno.persona, { fresco: true })
  await page.goto(`/logistica?origen=${terreno.a.id}`)
  const etiquetas = page.locator('section[aria-label*=": "]')
  await expect(etiquetas).toHaveCount(4)
  await expect(etiquetas.nth(0)).toHaveAttribute('aria-label', 'Sin fase: 1 vehículo')
  await expect(etiquetas.nth(1)).toHaveAttribute('aria-label', `Puerto ${proyecto}: 1 vehículo`)
  await expect(etiquetas.nth(2)).toHaveAttribute('aria-label', `Tránsito ${proyecto}: 2 vehículos`)
  await expect(etiquetas.nth(3)).toHaveAttribute('aria-label', `Entrega ${proyecto}: 1 vehículo`)
  // El demorado dice «Demorado» y sólo él; el reciente de su misma fase no.
  await expect(page.getByText('Demorado', { exact: true })).toHaveCount(1)
  const demorado = page.getByRole('article').filter({ hasText: terreno.demorado.titulo })
  await expect(demorado.getByText('Demorado', { exact: true })).toBeVisible()
  await expect(demorado.getByText('3 días en la fase')).toBeVisible()
  const reciente = page.getByRole('article').filter({ hasText: terreno.reciente.titulo })
  await expect(reciente.getByText('Entró hoy')).toBeVisible()
  await expect(reciente.getByText('Demorado')).toHaveCount(0)
  // El contenedor y la ETA, sólo donde hay transporte.
  const conTransporte = page.getByRole('article').filter({ hasText: terreno.conTransporte.titulo })
  await expect(conTransporte.getByText(`Contenedor ${terreno.contenedor}`)).toBeVisible()
  await expect(conTransporte.getByText(/ETA 15 dic 2026/)).toBeVisible()
})

test('la búsqueda por VIN deja una tarjeta, dice dónde está y sobrevive a recargar', async ({
  page,
}) => {
  await entrar(page, terreno.persona, { fresco: true })
  await page.goto(`/logistica?origen=${terreno.a.id}`)
  const buscar = page.getByRole('searchbox', { name: 'Buscar por nombre, VIN o lote' })
  await buscar.fill(terreno.demorado.vin ?? '')
  await expect(page).toHaveURL(new RegExp(`q=${terreno.demorado.vin ?? ''}`))
  await expect(page.getByRole('article')).toHaveCount(1)
  await expect(page.getByRole('article')).toContainText(terreno.demorado.titulo)
  const franja = page.getByRole('region', { name: 'Dónde está' })
  await expect(franja).toContainText(`en «Tránsito ${proyecto}» hace 3 días`)

  await page.reload()
  await expect(page.getByRole('article')).toHaveCount(1)
  await expect(page.getByRole('searchbox', { name: 'Buscar por nombre, VIN o lote' })).toHaveValue(
    terreno.demorado.vin ?? '',
  )
  await expect(franja).toContainText(`en «Tránsito ${proyecto}»`)
})

test('el clic en una tarjeta abre el panel sobre los filtros, Esc lo cierra y «Limpiar» vuelve a las cinco', async ({
  page,
}) => {
  await entrar(page, terreno.persona, { fresco: true })
  await page.goto(`/logistica?origen=${terreno.a.id}&q=${terreno.demorado.vin ?? ''}`)
  await page.getByRole('link', { name: terreno.demorado.titulo, exact: false }).first().click()
  const panel = page.getByRole('dialog')
  await expect(panel.getByRole('heading', { name: terreno.demorado.titulo })).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`vehiculo=${terreno.demorado.id}`))
  await expect(page).toHaveURL(new RegExp(`q=${terreno.demorado.vin ?? ''}`))

  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(page).not.toHaveURL(/vehiculo=/)
  await expect(page).toHaveURL(new RegExp(`q=${terreno.demorado.vin ?? ''}`))
  await expect(page.getByRole('article')).toHaveCount(1)

  await page.getByRole('button', { name: 'Limpiar', exact: true }).click()
  await expect(page.getByRole('article')).toHaveCount(5)
})

test('las pestañas de origen: el vecino sin permiso no está y el otro cambia de origen y suelta los filtros', async ({
  page,
}) => {
  await entrar(page, terreno.persona, { fresco: true })
  await page.goto(`/logistica?origen=${terreno.a.id}&q=${terreno.demorado.vin ?? ''}`)
  const pestanas = page.getByRole('navigation', { name: 'Orígenes' })
  await expect(pestanas.getByRole('link', { name: terreno.a.nombre })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(pestanas.getByRole('link', { name: terreno.c.nombre })).toHaveCount(0)
  await pestanas.getByRole('link', { name: terreno.b.nombre }).click()
  await expect(page).toHaveURL(new RegExp(`origen=${terreno.b.id}`))
  await expect(page).not.toHaveURL(/q=/)
  await expect(page.getByRole('region', { name: /Cola .*: más de 50 vehículos/ })).toBeVisible()
})

test('«Ver más» trae la que falta de una columna de 51 y el número deja de ser «50+»', async ({
  page,
}) => {
  await entrar(page, terreno.persona, { fresco: true })
  await page.goto(`/logistica?origen=${terreno.b.id}`)
  const cola = page.getByRole('region', { name: /^Cola /i })
  await expect(cola.getByRole('article')).toHaveCount(50)
  await expect(cola.getByText('50+', { exact: true })).toBeVisible()
  await cola.getByRole('button', { name: 'Ver más' }).click()
  await expect(cola.getByRole('article')).toHaveCount(CANTIDAD_EN_LA_COLA)
  await expect(page.getByRole('region', { name: `Cola ${proyecto}: 51 vehículos` })).toBeVisible()
  await expect(cola.getByRole('button', { name: 'Ver más' })).toHaveCount(0)
  await expect(page.getByText('Se cargó 1 más.')).toBeAttached()
})
