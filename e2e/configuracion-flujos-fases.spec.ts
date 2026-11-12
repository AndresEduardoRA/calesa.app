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
import { PREFIJO_CLAVE_E2E, borrarOrigenes, crearOrigenDePrueba } from './soporte/origenes'
import { sql, literal } from './soporte/sql'
import { borrarVehiculosDe } from './soporte/vehiculos'

// Configuración › Flujos › Fases (5.04, `docs/UX.md` › «Flujos: fases (estados propios)»): sobre un origen que crea el spec, la dueña arma fases con
// «Nueva fase», sube una con el teclado, elimina una sin historial, edita los datos en el inspector y jubila y reactiva una con historial. Tres pruebas del
// camino feliz, en serie (las dos últimas viven de las fases de la primera): las reglas de cada error, el conflicto y el permiso ya los prueba la base
// (`supabase/tests/areas/flujos/fases*.sql`).
test.describe.configure({ mode: 'serial' })

let duena = ''
let origenId = ''
const NOMBRE_DEL_ORIGEN = 'E2E Flujo de fases'
const CLAVE_DEL_ORIGEN = 'flujo_de_fases'

const CLAVE_EN_LA_BASE = `${PREFIJO_CLAVE_E2E}${CLAVE_DEL_ORIGEN}`

// El historial y el vehículo que siembra la tercera prueba frenan el borrado del origen (`on delete restrict`): salen primero, también al empezar (una
// corrida que cayó a medias los deja).
async function quitarLoSembrado() {
  sql(
    `delete from historial_fases where flujo_id in (select id from flujos where origen_id in (select id from origenes where clave = ${literal(CLAVE_EN_LA_BASE)}))`,
  )
  await borrarVehiculosDe([CLAVE_EN_LA_BASE])
}

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await quitarLoSembrado()
  await borrarOrigenes([])
  duena = correoDePrueba(`duena-fases-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Fabiola Fases' })
  origenId = (await crearOrigenDePrueba(NOMBRE_DEL_ORIGEN, CLAVE_DEL_ORIGEN)).id
})

test.afterAll(async () => {
  await quitarLoSembrado()
  await borrarOrigenes([])
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const nombresEnPantalla = (page: Page) => page.locator('[data-abre-resumen]')

// «Nueva fase» con su nombre y su tipo; devuelve el modal (cerrado si salió bien, abierto con su motivo si no).
async function crearFase(page: Page, nombre: string, tipo: 'Intermedia' | 'Inicial' | 'Final') {
  await page.getByRole('button', { name: 'Nueva fase' }).click()
  const modal = page.getByRole('dialog', { name: 'Nueva fase' })
  await expect(modal).toBeVisible()
  await expect(page).toHaveURL(/panel=nueva-fase/)
  await modal.getByLabel('Nombre').fill(nombre)
  await modal.getByLabel(tipo, { exact: false }).check()
  await modal.getByRole('button', { name: 'Crear fase' }).click()
  return modal
}

// El inspector de una fase: un clic en su nombre; el bloque plegado se abre con su título.
async function abrirInspector(page: Page, nombre: string) {
  await nombresEnPantalla(page).filter({ hasText: nombre }).click()
  const inspector = page.getByRole('dialog')
  await expect(inspector.getByRole('heading', { name: nombre })).toBeVisible()
  return inspector
}

async function cerrarInspector(page: Page) {
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
}

test('la dueña crea fases, sube una y elimina otra', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/flujos?origen=${origenId}`)
  await expect(page.getByRole('heading', { name: 'Fases', level: 2 })).toBeVisible()
  await expect(nombresEnPantalla(page)).toHaveCount(0)

  // Crear tres: la primera inicial, la última final, y un nombre repetido dice su motivo junto al campo.
  const modal = await crearFase(page, 'E2E 5.04 Compra', 'Inicial')
  await expect(modal).toBeHidden()
  await crearFase(page, 'E2E 5.04 Traslado', 'Intermedia')
  await expect(nombresEnPantalla(page)).toHaveCount(2)
  const repetida = await crearFase(page, 'E2E 5.04 Traslado', 'Intermedia')
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

test('la dueña edita los datos de una fase en el inspector', async ({ page }) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/flujos?origen=${origenId}`)
  for (const nombre of ['E2E 5.04 Puerto', 'E2E 5.04 Aduana', 'E2E 5.04 Cierre']) {
    const modal = await crearFase(page, nombre, 'Intermedia')
    await expect(modal).toBeHidden()
  }
  await expect(nombresEnPantalla(page)).toHaveText([
    'E2E 5.04 Compra',
    'E2E 5.04 Entrega',
    'E2E 5.04 Puerto',
    'E2E 5.04 Aduana',
    'E2E 5.04 Cierre',
  ])

  // Una fase no es inicial y final a la vez: lo dice la regla junto al interruptor y la base no recibe nada.
  let inspector = await abrirInspector(page, 'E2E 5.04 Compra')
  for (const bloque of [
    'Identidad',
    'En el flujo',
    'Alerta por demora',
    'Transporte y aduana',
    'Web y portal',
  ]) {
    await expect(inspector.getByText(bloque, { exact: true })).toBeVisible()
  }
  await inspector.getByText('En el flujo', { exact: true }).click()
  await inspector.getByRole('switch', { name: 'Es final' }).click()
  await inspector.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(inspector.getByText('Una fase no puede ser inicial y final a la vez.')).toBeVisible()
  await expect(inspector.getByRole('switch', { name: 'Es final' })).toBeFocused()
  await inspector.getByRole('switch', { name: 'Es final' }).click()
  await cerrarInspector(page)

  // Marcar otra inicial no desmarca la primera: se avisa. La descripción se guarda y sobrevive a recargar.
  inspector = await abrirInspector(page, 'E2E 5.04 Puerto')
  await inspector.getByText('En el flujo', { exact: true }).click()
  await inspector.getByRole('switch', { name: 'Es inicial' }).click()
  await expect(
    inspector.getByText('Ya es inicial «E2E 5.04 Compra»', { exact: false }),
  ).toBeVisible()
  await inspector.getByLabel('Descripción', { exact: true }).fill('Donde espera el vehículo')
  await inspector.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Fase «E2E 5.04 Puerto» guardada.')).toBeVisible()
  await page.reload()
  inspector = page.getByRole('dialog')
  await expect(inspector.getByLabel('Descripción', { exact: true })).toHaveValue(
    'Donde espera el vehículo',
  )
  await inspector.getByText('En el flujo', { exact: true }).click()
  await expect(inspector.getByRole('switch', { name: 'Es inicial' })).toBeChecked()
  await cerrarInspector(page)

  // Visible en el portal pide el nombre para el cliente: el error va junto al campo, con el foco.
  inspector = await abrirInspector(page, 'E2E 5.04 Cierre')
  await inspector.getByText('Web y portal', { exact: true }).click()
  await inspector.getByRole('switch', { name: 'Visible en el portal' }).click()
  await inspector.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(
    inspector.getByText('Para mostrarla en el portal escribe su nombre para el cliente.'),
  ).toBeVisible()
  const alias = inspector.getByLabel('Nombre para el cliente', { exact: false })
  await expect(alias).toBeFocused()
  await alias.fill('Cierre del trámite')
  await inspector.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Fase «E2E 5.04 Cierre» guardada.')).toBeVisible()
  await page.reload()
  inspector = page.getByRole('dialog')
  await inspector.getByText('Web y portal', { exact: true }).click()
  await expect(inspector.getByLabel('Nombre para el cliente', { exact: false })).toHaveValue(
    'Cierre del trámite',
  )
  await expect(inspector.getByRole('switch', { name: 'Visible en el portal' })).toBeChecked()
})

test('la dueña jubila una fase con historial y la reactiva', async ({ page }) => {
  // Un vehículo del origen que pasó por «Aduana»: con historial no se elimina, se jubila.
  const origen = literal(origenId)
  sql(`
    with v as (
      insert into vehiculos (origen_id, titulo) values (${origen}, 'E2E 5.04 vehículo') returning id
    )
    insert into historial_fases (flujo_id, vehiculo_id, a_fase_id)
    select f.flujo_id, v.id, f.id
    from v, fases f
    join flujos fl on fl.id = f.flujo_id
    where fl.origen_id = ${origen} and f.nombre = 'E2E 5.04 Aduana'
  `)
  await entrar(page, duena, { fresco: true })
  await page.goto(`/configuracion/flujos?origen=${origenId}`)
  const fila = page.getByRole('row').filter({ hasText: 'E2E 5.04 Aduana' })
  await expect(fila).not.toContainText('Jubilada')

  await elegirDelMenu(page, 'E2E 5.04 Aduana', 'Jubilar o eliminar')
  const dialogo = page.getByRole('dialog', { name: /Jubilar fase «E2E 5.04 Aduana»/ })
  await expect(dialogo).toContainText('Se jubila «E2E 5.04 Aduana»')
  await expect(dialogo).toContainText('historial')
  await dialogo.getByRole('button', { name: 'Jubilar fase' }).click()
  await expect(dialogo).toBeHidden()
  await expect(fila).toContainText('Jubilada')

  await elegirDelMenu(page, 'E2E 5.04 Aduana', 'Reactivar')
  await expect(page.getByText('Fase «E2E 5.04 Aduana» reactivada.')).toBeVisible()
  await expect(fila).not.toContainText('Jubilada')
})
