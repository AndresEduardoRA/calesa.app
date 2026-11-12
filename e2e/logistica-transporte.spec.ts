// @sin-celular-archivo: la fila 6.08 pide escritorio: el hueco es un formulario del panel de la unidad (el mismo en el celular, 6.01) y /logistica/embarques suma una lista con el patrón de aduana.
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
  agregarUnidadAlContenedor,
  borrarTransporte,
  crearTransporteDe,
  ponerEnElContenedorDe,
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

test('E2E ver el contenedor con sus dos unidades en /logistica/embarques y buscarlo', async ({
  page,
}) => {
  // La segunda unidad entra al mismo contenedor y con la misma naviera y ETA (la primera ya los tiene por el primer test).
  await ponerEnElContenedorDe(terreno.sinFase.id, {
    contenedor: 'ECMU123456',
    naviera_id: terreno.naviera.id,
    eta_el: '2026-12-15',
  })
  await entrar(page, terreno.conTransporte, { fresco: true })
  await page.goto('/logistica/embarques?grupo=contenedores')
  const fila = page.getByRole('row').filter({ hasText: 'ECMU123456' })
  await expect(fila).toContainText(terreno.naviera.nombre)
  await expect(fila).toContainText('15 dic 2026')
  await expect(fila).toContainText('2 unidades')

  await fila.getByRole('button', { name: 'Abrir el contenedor ECMU123456' }).click()
  await expect(page).toHaveURL(/contenedor=ECMU123456/)
  const panel = page.getByRole('dialog', { name: 'Contenedor' })
  await expect(panel.getByRole('heading', { name: 'Contenedor ECMU123456' })).toBeVisible()
  await expect(panel.getByText(terreno.enFase.titulo)).toBeVisible()
  await expect(panel.getByText(terreno.sinFase.titulo)).toBeVisible()
  // No tiene `flujos.mover`: el hueco de mover el grupo no se dibuja.
  await expect(panel.getByText('Mover el grupo')).toHaveCount(0)

  // La búsqueda por el comienzo de la clave la sigue mostrando; otra que no coincide lo dice.
  await page.goto('/logistica/embarques?grupo=contenedores&q=ecm')
  await expect(page.getByRole('row').filter({ hasText: 'ECMU123456' })).toBeVisible()
  await page.goto('/logistica/embarques?grupo=contenedores&q=zzz')
  await expect(page.getByText('Ningún contenedor coincide con los filtros.')).toBeVisible()
})

test('E2E «Editar grupo» cambia la ETA de las tres unidades de un contenedor', async ({ page }) => {
  // Una tercera unidad en el mismo contenedor, con otra ETA: la ETA del grupo será «Varios».
  const tercera = await agregarUnidadAlContenedor(terreno, 'E2E Tercera del contenedor', {
    contenedor: 'ECMU123456',
    naviera_id: terreno.naviera.id,
    eta_el: '2026-12-20',
  })
  await entrar(page, terreno.conTransporte, { fresco: true })
  await page.goto('/logistica/embarques?grupo=contenedores&contenedor=ECMU123456')
  const resumen = page.getByRole('dialog', { name: 'Contenedor' })
  await expect(resumen.getByText('3 unidades')).toBeVisible()
  await resumen.getByRole('button', { name: 'Editar grupo' }).click()
  await expect(page).toHaveURL(/panel=editar-grupo/)
  await expect(page).toHaveURL(/contenedor=ECMU123456/)

  const panel = page.getByRole('dialog', { name: 'Editar el contenedor ECMU123456' })
  // La ETA y el zarpe difieren entre las tres (sólo la primera tiene zarpe): dicen «Varios»; lo demás sale con su valor común.
  await expect(panel.getByText('Varios: cada unidad tiene el suyo.', { exact: false })).toHaveCount(
    2,
  )
  await expect(panel.getByLabel('Zarpe')).toHaveValue('')
  await expect(panel.getByLabel('Naviera')).toHaveValue(terreno.naviera.id)
  await expect(panel.getByLabel('Contenedor')).toHaveValue('ECMU123456')
  await expect(panel.getByText('Se aplicará a las 3 unidades.')).toBeVisible()
  await panel.getByLabel('ETA').fill('2026-12-30')
  await panel.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText('Se aplicó a las 3 unidades.')).toBeVisible()

  // Vuelve al resumen del mismo contenedor, sin el panel de edición.
  await expect(page).not.toHaveURL(/panel=editar-grupo/)
  await expect(page).toHaveURL(/contenedor=ECMU123456/)
  await expect(page.getByRole('heading', { name: 'Contenedor ECMU123456' })).toBeVisible()
  for (const id of [terreno.enFase.id, terreno.sinFase.id, tercera]) {
    const t = await transporteDe(id)
    expect(t?.eta_el).toBe('2026-12-30')
    expect(t?.contenedor).toBe('ECMU123456')
  }
  await page.goto('/logistica/embarques?grupo=contenedores')
  await expect(page.getByRole('row').filter({ hasText: 'ECMU123456' })).toContainText('30 dic 2026')
})

test('E2E quien no ve la logística no entra a /logistica/embarques', async ({ page }) => {
  await entrar(page, terreno.sinLogistica, { fresco: true })
  await page.goto('/logistica/embarques')
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
})
