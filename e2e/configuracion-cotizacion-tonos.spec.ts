// @sin-celular-archivo: pantalla de Configuración; en el celular se ve igual y el camino feliz va sólo en escritorio (e2e.md, 2026-11-08).
import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarTonosDePrueba } from './soporte/tonos'

// La pestaña «Tonos» (4.22-4, `docs/UX.md` › «Cotización: tonos (estados propios)»): el camino feliz en escritorio. La dueña ve los tres de fábrica, intenta crear uno con una
// tinta que no se lee sobre el fondo (el motivo queda junto al campo y nada se guarda), la corrige y se crea; recargar lo conserva; le cambia el nombre y lo elimina.
test.describe.configure({ mode: 'serial' })

let duena = ''

test.beforeAll(async ({}, info) => {
  borrarTonosDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-tonos-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Tonos' })
})

test.afterAll(async () => {
  borrarTonosDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const fila = (page: Page, nombre: string) =>
  page.locator('li[data-tono]').filter({ has: page.getByText(nombre, { exact: true }) })
const modal = (page: Page) => page.getByRole('dialog', { name: 'Nuevo tono' })
const temaClaro = (page: Page) => page.getByRole('group', { name: 'Tema claro' })

test('T5: los de fábrica se ven; el AA se dice junto al campo; crear, recargar, editar y eliminar', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/cotizacion?seccion=tonos')
  await expect(page.getByRole('heading', { name: 'Tonos', level: 2 })).toBeVisible()
  for (const clave of ['amarillo', 'verde', 'naranja']) {
    await expect(page.locator(`li[data-tono="${clave}"]`)).toBeVisible()
  }

  // Una tinta blanca sobre el fondo claro no se lee: la línea en vivo lo dice y, al enviar, nada se guarda.
  await page.getByRole('button', { name: 'Nuevo tono', exact: true }).click()
  await expect(modal(page)).toBeVisible()
  await modal(page).getByLabel('Nombre', { exact: true }).fill('Tono e2e')
  await page.locator('#tono-claro-tinta').fill('#ffffff')
  await expect(temaClaro(page).getByRole('status')).toContainText(
    'En el tema claro la tinta sobre el fondo da',
  )
  await modal(page).getByRole('button', { name: 'Crear tono' }).click()
  await expect(temaClaro(page).getByRole('status')).toContainText('hace falta 4,5:1')
  await expect(page.locator('#tono-claro-tinta')).toHaveAttribute('aria-invalid', 'true')
  await expect(modal(page)).toBeVisible()
  await expect(fila(page, 'Tono e2e')).toHaveCount(0)

  // Corregida, se crea y recargar la conserva.
  await page.locator('#tono-claro-tinta').fill('#1b2130')
  await expect(temaClaro(page).getByRole('status')).toContainText('cumple AA')
  await modal(page).getByRole('button', { name: 'Crear tono' }).click()
  await expect(modal(page)).toBeHidden()
  await expect(fila(page, 'Tono e2e')).toBeVisible()
  await page.reload()
  await expect(fila(page, 'Tono e2e')).toBeVisible()

  // Cambiarle el nombre.
  await page.getByRole('button', { name: 'Editar «Tono e2e»' }).click()
  const edicion = page.getByRole('dialog', { name: 'Editar tono' })
  await edicion.getByLabel('Nombre', { exact: true }).fill('Tono e2e editado')
  await edicion.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(edicion).toBeHidden()
  await expect(fila(page, 'Tono e2e editado')).toBeVisible()
  await expect(fila(page, 'Tono e2e')).toHaveCount(0)

  // Eliminarlo, con su confirmación.
  await page.getByRole('button', { name: 'Eliminar «Tono e2e editado»' }).click()
  await page.getByRole('button', { name: 'Eliminar tono', exact: true }).click()
  await expect(fila(page, 'Tono e2e editado')).toHaveCount(0)
  await expect(page.locator('li[data-tono="amarillo"]')).toBeVisible()
})
