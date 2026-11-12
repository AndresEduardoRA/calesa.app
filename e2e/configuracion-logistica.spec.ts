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

// Configuración › Logística (6.01-3, 6.11-4, `docs/UX.md` › «Logística: estados propios»): quien tiene `logistica.catalogos.gestionar` entra a «Categorías de gasto» (el único catálogo lleno hasta
// que 6.08 llene los del transporte: sin pestañas) y la sección figura en el hub; la asesora de la semilla no tiene la clave y no entra. Se crea, renombra, desactiva y elimina una categoría
// propia; la de la prueba se limpia por su nombre.
test.describe.configure({ mode: 'serial' })

let duena = ''
const NOMBRE = 'Maniobras e2e'
const limpiarCategorias = () => {
  sql(`delete from categorias_gasto where nombre like ${literal(`${NOMBRE}%`)}`)
}
let asesora = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-conf-logistica-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Lola Logística' })
  asesora = (await crearAsesoraDeLaSemilla(proyecto)).email
  limpiarCategorias()
})

test.afterAll(async () => {
  limpiarCategorias()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('quien gestiona los catálogos entra a las categorías de gasto y el hub lista Logística', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/logistica')
  await expect(page.getByRole('heading', { name: 'Logística', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Categorías de gasto', level: 2 })).toBeVisible()
  await expect(page.getByRole('tab')).toHaveCount(0)
  // Una pestaña escrita a mano en la URL abre el mismo catálogo.
  await page.goto('/configuracion/logistica?seccion=basura')
  await expect(page.getByRole('heading', { name: 'Categorías de gasto', level: 2 })).toBeVisible()

  await page.goto('/configuracion')
  // El hub es el `main`: la navegación del marco tiene su entrada «Logística» aparte.
  await expect(page.getByRole('main').getByRole('link', { name: /^Logística/ })).toBeVisible()
})

test('crear, renombrar, desactivar y eliminar una categoría de gasto', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/logistica')
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

test('la asesora de la semilla no entra a Configuración › Logística', async ({ page }) => {
  await entrar(page, asesora, { fresco: true })
  await page.goto('/configuracion/logistica')
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Categorías de gasto' })).toHaveCount(0)
})
