// @sin-celular-archivo: pantalla de Configuración; en el celular se ve igual y el camino feliz va sólo en escritorio (e2e.md, 2026-11-08).
import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarOrigenesDeCotizar, crearOrigenDeCotizar } from './soporte/cotizar-formula'
import {
  definicionYParamsComoLaPublicada,
  leerElBorradorDelDiseno,
  publicarFormulaConModos,
} from './soporte/diseno-editor'

// La pestaña «Diseño», ítems, cabecera y tarjeta (4.22-3, `docs/UX.md` › «Cotización: diseño (estados propios)»): el camino feliz en escritorio. Se enciende «Ver total en moneda local»,
// se suma el modo «Paralelo» y se le cambian sus tipos de cambio, el interruptor pasa de «Habilita» a «Muestra», una celda gana su ayuda con un texto y la tarjeta muestra la garantía
// junto al total. Nada avisa «Revisa el diseño»; «Guardar el borrador» lo escribe con la definición y los `params` de la publicada tal cual, y recargar lo vuelve a mostrar.
test.describe.configure({ mode: 'serial' })

let duena = ''
let origen = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-items-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Items' })
  origen = await crearOrigenDeCotizar(proyecto, 'ditems', false)
  publicarFormulaConModos(origen.id)
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const cabecera = (page: Page) => page.locator('[data-cabecera-del-diseno]')
const tarjeta = (page: Page) => page.locator('[data-tarjeta-del-diseno]')
const modo = (page: Page, clave: string) => page.locator(`li[data-modo="${clave}"]`)
const interruptor = (page: Page) => page.locator('li[data-item="interruptor:extra"]')
const ayudaDelPrecio = (page: Page) =>
  page.locator('li[data-celda="precio"]').getByLabel('Ayuda con un texto')
const guardar = (page: Page) =>
  page.getByRole('button', { name: 'Guardar el borrador', exact: true })
const estado = (page: Page) => page.locator('[data-guardado] [role="status"]')
const verTotal = (page: Page) =>
  cabecera(page).getByRole('switch', { name: 'Ofrecer «Ver total en moneda local»' })
const garantia = (page: Page) =>
  tarjeta(page).getByRole('checkbox', { name: 'Mostrar «Garantía» junto al total' })

async function abrirElDiseno(page: Page) {
  await page.goto(`/configuracion/cotizacion?seccion=diseno&origen=${origen.id}`)
  await expect(page.getByRole('heading', { name: 'Diseño', level: 2 })).toBeVisible()
  await expect(cabecera(page)).toBeVisible()
}

test('D2: cabecera, modos, interruptor, ayuda y tarjeta se editan y se guardan; lo guardado vuelve', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirElDiseno(page)
  await expect(verTotal(page)).not.toBeChecked()
  await expect(interruptor(page).getByLabel('Qué hace')).toHaveValue('habilita')
  await expect(garantia(page)).not.toBeChecked()
  await expect(guardar(page)).toBeDisabled()

  await verTotal(page).click()
  await cabecera(page).getByLabel('Nombre del modo').fill('Paralelo')
  await cabecera(page).getByRole('button', { name: 'Sumar un modo', exact: true }).click()
  await expect(modo(page, 'paralelo')).toBeVisible()
  await modo(page, 'paralelo').getByLabel('Tipo de cambio de origen').selectOption('tc_b')
  await modo(page, 'paralelo').getByLabel('Total en').selectOption('tc_a')
  await interruptor(page).getByLabel('Qué hace').selectOption('muestra')
  await ayudaDelPrecio(page).fill('El precio de la subasta')
  await garantia(page).click()

  await expect(page.locator('[data-avisos-del-diseno]')).not.toContainText('Revisa el diseño')
  await expect(guardar(page)).toBeEnabled()
  await guardar(page).click()
  await expect(estado(page)).toHaveText('Se guardó el borrador.')

  const borrador = leerElBorradorDelDiseno(origen.id)
  expect(borrador).not.toBeNull()
  const { diseno } = borrador!
  expect(diseno.cabecera?.ver_total_bs).toBe(true)
  expect(diseno.cabecera?.modos).toStrictEqual([
    {
      clave: 'paralelo',
      nombre: 'Paralelo',
      buckets: [{ bucket: 'origen', nodo: 'tc_b' }],
      total_en: 'tc_a',
    },
  ])
  const items = diseno.secciones.find((s) => s.id === 'datos')?.items
  expect(items?.find((i) => i.tipo === 'interruptor')).toMatchObject({ efecto: 'muestra' })
  expect(items?.find((i) => i.nodo === 'precio')).toMatchObject({
    ayuda: { texto: 'El precio de la subasta' },
  })
  expect(diseno.tarjeta_total).toStrictEqual({ nodo: 'total', secundarios: ['garantia'] })
  expect(definicionYParamsComoLaPublicada(origen.id)).toBe(true)

  await abrirElDiseno(page)
  await expect(verTotal(page)).toBeChecked()
  await expect(modo(page, 'paralelo').getByLabel('Tipo de cambio de origen')).toHaveValue('tc_b')
  await expect(modo(page, 'paralelo').getByLabel('Total en')).toHaveValue('tc_a')
  await expect(interruptor(page).getByLabel('Qué hace')).toHaveValue('muestra')
  await expect(ayudaDelPrecio(page)).toHaveValue('El precio de la subasta')
  await expect(garantia(page)).toBeChecked()
  await expect(estado(page)).toHaveText('No hay cambios por guardar.')
})
