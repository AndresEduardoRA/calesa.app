// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import {
  alternarActivo,
  elegirDelMenu,
  filaDeCatalogo,
  nombreDeLaFila,
} from './soporte/lista-de-catalogo'
import { crearAsesoraDeLaSemilla } from './soporte/recorrido'
import { literal, sql } from './soporte/sql'

// Configuración › Logística (6.01-3, 6.08-1, 6.11-4, `docs/UX.md` › «Logística: estados propios»): quien tiene `logistica.catalogos.gestionar` entra a «Puertos» (la pestaña por omisión), «Navieras» y
// «Categorías de gasto», y la sección figura en el hub; la asesora de la semilla no tiene la clave y no entra. Se crea, renombra, desactiva y elimina una categoría propia; se crea una naviera y se ve
// en la oferta de transporte de Flujos, se desactiva, y se crea un puerto y su repetido se rechaza junto al nombre. Lo de la prueba se limpia por su nombre.
test.describe.configure({ mode: 'serial' })

let duena = ''
const NOMBRE = 'Maniobras e2e'
const NAVIERA = 'Naviera e2e 6.08'
const PUERTO = 'Puerto e2e 6.08'
const limpiarCatalogos = () => {
  sql(`delete from categorias_gasto where nombre like ${literal(`${NOMBRE}%`)}`)
  sql(
    `delete from flujos_transporte_oferta where naviera_id in (select id from navieras where nombre like ${literal('Naviera e2e 6.08%')})`,
  )
  sql(`delete from navieras where nombre like ${literal('Naviera e2e 6.08%')}`)
  sql(`delete from puertos where nombre like ${literal('Puerto e2e 6.08%')}`)
}
let asesora = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-conf-logistica-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Lola Logística' })
  asesora = (await crearAsesoraDeLaSemilla(proyecto)).email
  limpiarCatalogos()
})

test.afterAll(async () => {
  limpiarCatalogos()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('quien gestiona los catálogos ve Puertos, Navieras y Categorías de gasto y el hub lista Logística', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/logistica')
  await expect(page.getByRole('heading', { name: 'Logística', level: 1 })).toBeVisible()
  // «Puertos» es la pestaña por omisión y las tres están, en ese orden.
  await expect(page.getByRole('heading', { name: 'Puertos', level: 2 })).toBeVisible()
  await expect(page.getByRole('tab')).toHaveText(['Puertos', 'Navieras', 'Categorías de gasto'])
  await page.getByRole('tab', { name: 'Categorías de gasto' }).click()
  await expect(page.getByRole('heading', { name: 'Categorías de gasto', level: 2 })).toBeVisible()
  // Una pestaña escrita a mano en la URL abre la primera.
  await page.goto('/configuracion/logistica?seccion=basura')
  await expect(page.getByRole('heading', { name: 'Puertos', level: 2 })).toBeVisible()

  await page.goto('/configuracion')
  // El hub es el `main`: la navegación del marco tiene su entrada «Logística» aparte.
  await expect(page.getByRole('main').getByRole('link', { name: /^Logística/ })).toBeVisible()
})

test('crear, renombrar, desactivar y eliminar una categoría de gasto', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/logistica?seccion=categorias-de-gasto')
  const nueva = page.getByRole('dialog', { name: 'Nueva categoría' })

  await page.getByRole('button', { name: 'Nueva categoría' }).first().click()
  await nueva.getByLabel('Nombre').fill(NOMBRE)
  await nueva.getByLabel('Propósito').selectOption({ label: 'Otro' })
  await nueva.getByLabel('Orden').fill('90')
  await nueva.getByRole('button', { name: 'Crear categoría' }).click()
  await expect(nueva).toBeHidden()
  const fila = filaDeCatalogo(page, NOMBRE)
  await expect(fila).toBeVisible()
  await expect(fila.getByText('Otro')).toBeVisible()

  // Un nombre repetido lo dice la base junto al campo y no crea nada.
  await page.getByRole('button', { name: 'Nueva categoría' }).first().click()
  await nueva.getByLabel('Nombre').fill(NOMBRE)
  await nueva.getByRole('button', { name: 'Crear categoría' }).click()
  await expect(nueva.getByText(`Ya hay una categoría llamada «${NOMBRE}».`)).toBeVisible()
  // Con algo escrito, cancelar pregunta antes de tirarlo.
  await nueva.getByRole('button', { name: 'Cancelar' }).click()
  await nueva.getByRole('button', { name: 'Descartar' }).click()
  await expect(nueva).toBeHidden()
  await expect(nombreDeLaFila(page, NOMBRE)).toHaveCount(1)

  // Renombrar.
  const renombrada = `${NOMBRE} 2`
  await nombreDeLaFila(page, NOMBRE).click()
  const editar = page.getByRole('dialog', { name: 'Editar categoría' })
  await editar.getByLabel('Nombre').fill(renombrada)
  await editar.getByRole('button', { name: 'Guardar' }).click()
  await expect(editar).toBeHidden()
  await expect(nombreDeLaFila(page, renombrada)).toBeVisible()

  // Desactivar: se sigue nombrando, con «Desactivado».
  await alternarActivo(page, renombrada)
  await expect(filaDeCatalogo(page, renombrada).getByText('Desactivado')).toBeVisible()

  // Eliminar: el diálogo la nombra y, al confirmar, desaparece.
  await elegirDelMenu(page, renombrada, 'Eliminar')
  const eliminar = page.getByRole('dialog', { name: `Eliminar la categoría «${renombrada}»` })
  await expect(eliminar).toBeVisible()
  await eliminar.getByRole('button', { name: 'Eliminar categoría' }).click()
  await expect(eliminar).toBeHidden()
  await expect(nombreDeLaFila(page, renombrada)).toHaveCount(0)
})

test('crear una naviera, verla ofrecida en Flujos y desactivarla', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/logistica?seccion=navieras')
  const nueva = page.getByRole('dialog', { name: 'Nueva naviera' })
  await page.getByRole('button', { name: 'Nueva naviera' }).first().click()
  await nueva.getByLabel('Nombre').fill(NAVIERA)
  await nueva.getByRole('button', { name: 'Crear naviera' }).click()
  await expect(nueva).toBeHidden()
  const fila = filaDeCatalogo(page, NAVIERA)
  await expect(fila).toBeVisible()
  await expect(fila.getByText('Activa', { exact: true })).toBeVisible()

  // El mismo nombre no se repite: la base lo dice junto al campo.
  await page.getByRole('button', { name: 'Nueva naviera' }).first().click()
  await nueva.getByLabel('Nombre').fill(NAVIERA)
  await nueva.getByRole('button', { name: 'Crear naviera' }).click()
  await expect(nueva.getByText(`Ya existe una naviera llamada «${NAVIERA}».`)).toBeVisible()
  await nueva.getByRole('button', { name: 'Cancelar' }).click()
  await nueva.getByRole('button', { name: 'Descartar' }).click()
  await expect(nueva).toBeHidden()

  // La oferta de transporte de un flujo la ofrece.
  await page.goto('/configuracion/flujos?seccion=reglas')
  await expect(page.getByRole('group', { name: 'Navieras' })).toContainText(NAVIERA)

  // Desactivarla: sigue en la lista, «Inactiva», y ya no se ofrece.
  await page.goto('/configuracion/logistica?seccion=navieras')
  await alternarActivo(page, NAVIERA)
  await expect(filaDeCatalogo(page, NAVIERA).getByText('Inactiva')).toBeVisible()
  await page.goto('/configuracion/flujos?seccion=reglas')
  await expect(page.getByRole('group', { name: 'Navieras' })).not.toContainText(NAVIERA)
})

test('crear un puerto con país y código y ver rechazado el repetido junto al nombre', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/logistica')
  const nuevo = page.getByRole('dialog', { name: 'Nuevo puerto' })
  await page.getByRole('button', { name: 'Nuevo puerto' }).first().click()
  await nuevo.getByLabel('Nombre').fill(PUERTO)
  await nuevo.getByLabel('País (opcional)').fill('Chile')
  await nuevo.getByLabel('Código (opcional)').fill('cl e2e')
  await nuevo.getByRole('button', { name: 'Crear puerto' }).click()
  await expect(nuevo).toBeHidden()
  await expect(filaDeCatalogo(page, PUERTO).getByText('Chile · CLE2E')).toBeVisible()

  await page.getByRole('button', { name: 'Nuevo puerto' }).first().click()
  await nuevo.getByLabel('Nombre').fill(PUERTO)
  await nuevo.getByLabel('País (opcional)').fill('Chile')
  await nuevo.getByRole('button', { name: 'Crear puerto' }).click()
  await expect(nuevo.getByText(`Ya existe un puerto «${PUERTO}» en Chile.`)).toBeVisible()
  await nuevo.getByRole('button', { name: 'Cancelar' }).click()
  await nuevo.getByRole('button', { name: 'Descartar' }).click()
  await expect(nuevo).toBeHidden()
  await expect(nombreDeLaFila(page, PUERTO)).toHaveCount(1)
})

test('la asesora de la semilla no entra a Configuración › Logística', async ({ page }) => {
  await entrar(page, asesora, { fresco: true })
  await page.goto('/configuracion/logistica')
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Puertos' })).toHaveCount(0)
})
