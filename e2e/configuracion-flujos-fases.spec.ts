// @sin-celular-archivo: Configuración se usa en escritorio; la persona pidió no probarla en celular (2026-11-08)
import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { elegirDelMenu, masAccionesDe } from './soporte/lista-de-catalogo'
import { borrarOrigenes, crearOrigenDePrueba } from './soporte/origenes'

// Configuración › Flujos › Fases (5.04, `docs/UX.md` › «Flujos: fases (estados propios)»): sobre un origen que crea el spec, la dueña arma fases con
// «Nueva fase», sube una con el teclado y elimina una sin historial. Un solo recorrido del camino feliz: las reglas de cada error, el conflicto y el permiso
// ya los prueba la base (`supabase/tests/areas/flujos/fases*.sql`).
test.describe.configure({ mode: 'serial' })

let duena = ''
let origenId = ''
const NOMBRE_DEL_ORIGEN = 'E2E Flujo de fases'

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await borrarOrigenes([])
  duena = correoDePrueba(`duena-fases-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Fabiola Fases' })
  origenId = (await crearOrigenDePrueba(NOMBRE_DEL_ORIGEN, 'flujo_de_fases')).id
})

test.afterAll(async () => {
  await borrarOrigenes([])
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const nombresEnPantalla = (page: Page) => page.locator('[data-abre-resumen]')

test('la dueña crea fases, sube una y elimina otra', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/flujos?origen=${origenId}`)
  await expect(page.getByRole('heading', { name: 'Fases', level: 2 })).toBeVisible()
  await expect(nombresEnPantalla(page)).toHaveCount(0)

  // Crear tres: la primera inicial, la última final, y un nombre repetido dice su motivo junto al campo.
  const crear = async (nombre: string, tipo: 'Intermedia' | 'Inicial' | 'Final') => {
    await page.getByRole('button', { name: 'Nueva fase' }).click()
    const modal = page.getByRole('dialog', { name: 'Nueva fase' })
    await expect(modal).toBeVisible()
    await expect(page).toHaveURL(/panel=nueva-fase/)
    await modal.getByLabel('Nombre').fill(nombre)
    await modal.getByLabel(tipo, { exact: false }).check()
    await modal.getByRole('button', { name: 'Crear fase' }).click()
    return modal
  }
  const modal = await crear('E2E 5.04 Compra', 'Inicial')
  await expect(modal).toBeHidden()
  await crear('E2E 5.04 Traslado', 'Intermedia')
  await expect(nombresEnPantalla(page)).toHaveCount(2)
  const repetida = await crear('E2E 5.04 Traslado', 'Intermedia')
  await expect(repetida.getByText(/Ya hay una fase «E2E 5.04 Traslado»/)).toBeVisible()
  await expect(repetida.getByLabel('Nombre')).toBeFocused()
  await repetida.getByLabel('Nombre').fill('E2E 5.04 Entrega')
  await repetida.getByLabel('Final', { exact: false }).check()
  await repetida.getByRole('button', { name: 'Crear fase' }).click()
  await expect(repetida).toBeHidden()
  await expect(nombresEnPantalla(page)).toHaveText([
    'E2E 5.04 Compra',
    'E2E 5.04 Traslado',
    'E2E 5.04 Entrega',
  ])
  const filaDeCompra = page.getByRole('row').filter({ hasText: 'E2E 5.04 Compra' })
  await expect(filaDeCompra).toContainText('Inicial')
  await expect(page.getByRole('row').filter({ hasText: 'E2E 5.04 Entrega' })).toContainText('Final')

  // Subir con el teclado: «Entrega» pasa antes de «Traslado» y el foco sigue en su botón.
  const subir = page.getByRole('button', { name: 'Subir E2E 5.04 Entrega', exact: true })
  await subir.focus()
  await page.keyboard.press('Enter')
  await expect(nombresEnPantalla(page)).toHaveText([
    'E2E 5.04 Compra',
    'E2E 5.04 Entrega',
    'E2E 5.04 Traslado',
  ])
  await expect(subir).toBeFocused()
  await expect(page.getByRole('button', { name: 'Bajar E2E 5.04 Traslado' })).toBeDisabled()

  // Eliminar una sin unidades ni historial: el diálogo lo dice y desaparece.
  await elegirDelMenu(page, 'E2E 5.04 Traslado', 'Jubilar o eliminar')
  await expect(page).toHaveURL(/panel=eliminar-fase&quitar=/)
  const dialogo = page.getByRole('dialog', { name: /Eliminar fase «E2E 5.04 Traslado»/ })
  await expect(dialogo).toContainText('Se elimina «E2E 5.04 Traslado»')
  await dialogo.getByRole('button', { name: 'Eliminar fase' }).click()
  await expect(dialogo).toBeHidden()
  await expect(nombresEnPantalla(page)).toHaveText(['E2E 5.04 Compra', 'E2E 5.04 Entrega'])
  await expect(masAccionesDe(page, 'E2E 5.04 Compra')).toBeVisible()
})
