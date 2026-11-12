// @sin-celular-archivo: el hueco «Transporte» es un formulario del panel de la unidad y la fila 6.08 pide escritorio; en el celular es el mismo panel (6.01).
import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import {
  borrarTransporte,
  crearTransporteDe,
  sembrarTransporte,
  transporteDe,
  type TerrenoDeTransporte,
} from './soporte/transporte'

// El transporte de la unidad (6.08-2): quien lo edita carga naviera, contenedor y fechas desde el hueco «Transporte» del panel y la base lo guarda en mayúsculas; un rechazo (la ETA antes del
// zarpe) queda junto a su campo; si otra persona cargó el transporte mientras tanto, el aviso de conflicto conserva lo escrito; y quien sólo ve la logística lo lee sin poder editarlo.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let terreno: TerrenoDeTransporte

async function abrirElHueco(page: Page, vehiculoId: string) {
  await page.goto(`/logistica/vehiculo/${vehiculoId}`)
  await page.locator('span:text-is("Transporte")').click()
  return page.locator('[data-hueco="transporte"]')
}

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarTransporte(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-transporte-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dalia Transporte',
  })
  terreno = await sembrarTransporte(proyecto)
})

test.afterAll(async () => {
  await borrarTransporte(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E cargar naviera, contenedor y fechas en el hueco y verlos guardados', async ({ page }) => {
  await entrar(page, terreno.conTransporte, { fresco: true })
  const hueco = await abrirElHueco(page, terreno.enFase.id)
  await expect(hueco.getByText('Esta unidad todavía no tiene transporte cargado.')).toBeVisible()
  await expect(hueco.getByRole('button', { name: 'Guardar' })).toBeDisabled()

  await hueco.getByLabel('Naviera').selectOption({ label: terreno.naviera.nombre })
  await hueco.getByLabel('Contenedor').fill('ecmu 123456')
  await hueco.getByLabel('Zarpe').fill('2026-12-01')
  await hueco.getByLabel('ETA').fill('2026-12-15')
  await hueco.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Transporte guardado.')).toBeVisible()

  // Lo que quedó en la base: contenedor en mayúsculas y sin espacios, y las fechas tal cual.
  const guardado = await transporteDe(terreno.enFase.id)
  expect(guardado).toMatchObject({
    contenedor: 'ECMU123456',
    zarpe_el: '2026-12-01',
    eta_el: '2026-12-15',
    naviera_id: terreno.naviera.id,
  })

  // Al recargar, el hueco lo muestra.
  const recargado = await abrirElHueco(page, terreno.enFase.id)
  await expect(recargado.getByLabel('Contenedor')).toHaveValue('ECMU123456')
  await expect(recargado.getByLabel('ETA')).toHaveValue('2026-12-15')
  await expect(recargado.getByLabel('Naviera')).toHaveValue(terreno.naviera.id)
})

test('E2E la ETA antes del zarpe se rechaza junto a su campo y no se guarda', async ({ page }) => {
  await entrar(page, terreno.conTransporte, { fresco: true })
  const hueco = await abrirElHueco(page, terreno.enFase.id)
  await hueco.getByLabel('ETA').fill('2026-11-01')
  await hueco.getByRole('button', { name: 'Guardar' }).click()
  await expect(hueco.getByText('La ETA no puede ser antes del zarpe.')).toBeVisible()
  await expect(hueco.getByLabel('ETA')).toHaveAttribute('aria-invalid', 'true')
  expect((await transporteDe(terreno.enFase.id))?.eta_el).toBe('2026-12-15')
})

test('E2E si otra persona cargó el transporte, el aviso conserva lo escrito', async ({ page }) => {
  await entrar(page, terreno.conTransporte, { fresco: true })
  const hueco = await abrirElHueco(page, terreno.sinFase.id)
  await expect(hueco.getByText('Esta unidad todavía no tiene transporte cargado.')).toBeVisible()
  // Otra persona lo carga después de abrirlo y antes de guardar.
  await crearTransporteDe(terreno.sinFase.id, 'cargado por otra persona')
  await hueco.getByLabel('Notas').fill('mi nota')
  await hueco.getByRole('button', { name: 'Guardar' }).click()
  await expect(hueco.getByText('No se guardó nada.', { exact: false })).toBeVisible()
  await hueco.getByRole('button', { name: 'Recargar' }).click()
  // La versión nueva llega y lo escrito sigue ahí; guardar de nuevo ya es posible.
  await expect(hueco.getByText('No se guardó nada.', { exact: false })).toHaveCount(0)
  await expect(hueco.getByLabel('Notas')).toHaveValue('mi nota')
  await hueco.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Transporte guardado.')).toBeVisible()
  expect((await transporteDe(terreno.sinFase.id))?.notas).toBe('mi nota')
})

test('E2E quien sólo ve la logística lee el transporte sin poder editarlo', async ({ page }) => {
  await entrar(page, terreno.conLogistica, { fresco: true })
  const hueco = await abrirElHueco(page, terreno.enFase.id)
  await expect(hueco.getByLabel('Contenedor')).toHaveValue('ECMU123456')
  await expect(hueco.getByLabel('Contenedor')).toBeDisabled()
  await expect(
    hueco.getByText('No tienes permiso para editar el transporte de este origen.'),
  ).toBeVisible()
  await expect(hueco.getByRole('button', { name: 'Guardar' })).toHaveCount(0)
})
