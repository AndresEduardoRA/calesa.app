// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { crearAsesoraDeLaSemilla } from './soporte/recorrido'

// Configuración › Logística (6.01-3, `docs/UX.md` › «Logística: estados propios»): hasta que un área llene un catálogo (6.08, 6.11) quien tiene `logistica.catalogos.gestionar`
// entra por la URL y lee que no hay nada que configurar, y la sección no figura en el hub; la asesora de la semilla no tiene la clave y no entra. No escribe nada.
test.describe.configure({ mode: 'serial' })

let duena = ''
let asesora = ''

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-conf-logistica-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Lola Logística' })
  asesora = (await crearAsesoraDeLaSemilla(proyecto)).email
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('quien gestiona los catálogos entra y lee que no hay nada que configurar; el hub no la lista', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto('/configuracion/logistica')
  await expect(page.getByRole('heading', { name: 'Logística', level: 1 })).toBeVisible()
  await expect(page.getByText('Por ahora no hay nada que configurar aquí.')).toBeVisible()
  await expect(page.getByRole('tab')).toHaveCount(0)
  // Una pestaña escrita a mano en la URL no rompe nada.
  await page.goto('/configuracion/logistica?seccion=basura')
  await expect(page.getByText('Por ahora no hay nada que configurar aquí.')).toBeVisible()

  await page.goto('/configuracion')
  // El hub es el `main`: la navegación del marco sí tiene su entrada «Logística».
  const hub = page.getByRole('main')
  await expect(hub.getByRole('link', { name: /Flujos/ })).toBeVisible()
  await expect(hub.getByRole('link', { name: /^Logística/ })).toHaveCount(0)
})

test('la asesora de la semilla no entra a Configuración › Logística', async ({ page }) => {
  await entrar(page, asesora, { fresco: true })
  await page.goto('/configuracion/logistica')
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
  await expect(page.getByText('Por ahora no hay nada que configurar aquí.')).toHaveCount(0)
})
