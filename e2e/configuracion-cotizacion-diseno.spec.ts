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
  publicarFormulaDeTresSumandos,
} from './soporte/diseno-editor'

// La pestaña «Diseño» de Configuración › Cotización (4.22-2, `docs/UX.md` › «Cotización: diseño (estados propios)»): el camino feliz en escritorio. Se ven las secciones
// y las celdas; poner a una celda el nivel «Costos» avisa que se deduce restando (sin bloquear) y alinea quién la edita; una sección pasa a «Avanzado»; «Guardar el
// borrador» crea el borrador con la definición y los `params` de la publicada tal cual; recargar vuelve a mostrar lo guardado.
test.describe.configure({ mode: 'serial' })

let duena = ''
let origen = { id: '', nombre: '' }

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-diseno-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Diseño' })
  origen = await crearOrigenDeCotizar(proyecto, 'ddiseno', false)
  publicarFormulaDeTresSumandos(origen.id)
})

test.afterAll(async () => {
  borrarOrigenesDeCotizar()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const celda = (page: Page, nodo: string) => page.locator(`li[data-celda="${nodo}"]`)
const seccion = (page: Page, id: string) => page.locator(`li[data-seccion="${id}"]`)
const guardar = (page: Page) =>
  page.getByRole('button', { name: 'Guardar el borrador', exact: true })
const estado = (page: Page) => page.locator('[data-guardado] [role="status"]')

async function abrirElDiseno(page: Page) {
  await page.goto(`/configuracion/cotizacion?seccion=diseno&origen=${origen.id}`)
  await expect(page.getByRole('heading', { name: 'Diseño', level: 2 })).toBeVisible()
  await expect(seccion(page, 'base')).toBeVisible()
}

test('D1: se ve el diseño; «Costos» en una celda avisa sin bloquear; se guarda el borrador y lo guardado vuelve', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirElDiseno(page)
  await expect(seccion(page, 'base').getByLabel('Título').first()).toHaveValue('Base')
  await expect(celda(page, 'flete')).toBeVisible()
  await expect(celda(page, 'total').getByLabel('Quién la ve')).toBeDisabled()
  await expect(estado(page)).toHaveText('No hay cambios por guardar.')
  await expect(guardar(page)).toBeDisabled()

  await celda(page, 'flete').getByLabel('Quién la ve').selectOption('costos')
  await expect(page.locator('[data-avisos-del-diseno]')).toContainText(
    'puede deducir «Flete» restando',
  )
  await expect(celda(page, 'flete').getByLabel('Quién la edita')).toHaveValue('costos')
  await seccion(page, 'extras').getByLabel('Dónde va').selectOption('avanzado')
  await expect(guardar(page)).toBeEnabled()

  await guardar(page).click()
  await expect(estado(page)).toHaveText('Se guardó el borrador.')
  const borrador = leerElBorradorDelDiseno(origen.id)
  expect(borrador).not.toBeNull()
  const secciones = borrador!.diseno.secciones
  const flete = secciones.find((s) => s.id === 'base')?.items.find((i) => i.nodo === 'flete')
  expect(flete).toMatchObject({ nivel_ver: 'costos', nivel_editar: 'costos' })
  expect(secciones.find((s) => s.id === 'extras')?.presentacion).toBe('avanzado')
  expect(definicionYParamsComoLaPublicada(origen.id)).toBe(true)

  await abrirElDiseno(page)
  await expect(celda(page, 'flete').getByLabel('Quién la ve')).toHaveValue('costos')
  await expect(seccion(page, 'extras').getByLabel('Dónde va')).toHaveValue('avanzado')
  await expect(estado(page)).toHaveText('No hay cambios por guardar.')
})
