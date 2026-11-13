import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { REPUESTO_DE_LA_ESPERA, limpiarEspera, sembrarEspera } from './soporte/repuestos-espera'
import { sql } from './soporte/sql'

// El assert del paso 8.13: un vehículo en «En taller» con una espera a «Recibido» y un ítem de repuesto «En tránsito» → su panel de logística dice que espera un repuesto y «Qué falta» lo
// marca → quien tiene `repuestos.mover` pasa el ítem a «Recibido» con la vista previa, desde la Cadena → el vehículo ya puede pasar de fase; y sin `repuestos.mover`, mover está apagado con su
// motivo. La base ya tiene su prueba SQL de las esperas (`supabase/tests/areas/repuestos/esperas.sql`): aquí se prueba que las pantallas lo dicen y lo hacen.
// El origen es propio del spec (`e2e_…`); las fases «En tránsito» y «Recibido» son las del flujo de repuestos de la semilla.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let claveDelOrigen = ''
let duena = ''
let lectora = ''
let vehiculo = ''
let proyectoDeRepuestos = ''
let item = ''
let transito = ''
let recibido = ''
const REPUESTO = REPUESTO_DE_LA_ESPERA

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  claveDelOrigen = `espera_${proyecto}`
  await limpiarEspera(claveDelOrigen)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-espera-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Rita Espera' })
  lectora = correoDePrueba(`lectora-espera-${proyecto}`)
  await crearPersona({
    email: lectora,
    contrasena: CONTRASENA,
    nombre: 'Lola Espera',
    invitada: true,
  })
  await darRolDePrueba({
    email: lectora,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Ve repuestos espera ${proyecto}`,
      clave: `e2e_ve_repuestos_espera_${proyecto}`,
    },
    permisos: ['repuestos.ver'],
  })
  ;({ vehiculo, proyectoDeRepuestos, item, transito, recibido } = await sembrarEspera(
    proyecto,
    claveDelOrigen,
  ))
})

test.afterAll(async () => {
  await limpiarEspera(claveDelOrigen)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const bloque = (page: Page, clave: string) => page.locator(`[data-bloque-del-hueco="${clave}"]`)

test('la dueña ve en el panel del vehículo que espera un repuesto y llega a su panel', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/logistica/vehiculo/${vehiculo}`)
  await page.getByRole('button', { name: 'Elegir el destino «Listo»' }).click()
  await expect(page.locator('[data-motivo-del-boton]')).toHaveText('Falta: Esperar a «Recibido».')
  await expect(page.getByRole('button', { name: 'Mover a «Listo»' })).toBeDisabled()

  await bloque(page, 'repuestos').locator('summary').click()
  const hueco = bloque(page, 'repuestos')
  await expect(hueco.getByText('Espera 1 repuesto')).toBeVisible()
  await expect(hueco.getByText(/Para pasar a «Listo» espera que llegue a «Recibido»/)).toBeVisible()
  await hueco.getByRole('link', { name: REPUESTO }).click()
  await expect(page).toHaveURL(new RegExp(`/repuestos/${proyectoDeRepuestos}\\?item=${item}`))
  await expect(
    page.getByRole('dialog', { name: 'Repuesto' }).getByRole('heading', { name: REPUESTO }),
  ).toBeVisible()
})

test('con sólo repuestos.ver, mover el ítem está apagado y dice por qué', async ({ page }) => {
  await entrar(page, lectora, { fresco: true })
  await page.goto(`/repuestos/${proyectoDeRepuestos}?item=${item}`)
  const panel = page.getByRole('dialog', { name: 'Repuesto' })
  await expect(panel.getByRole('heading', { name: REPUESTO })).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Elegir el destino «Recibido»' })).toBeDisabled()
  // «En tránsito» sale a dos destinos («Recibido» y «Perdido»): cada uno repite el motivo.
  await expect(panel.getByText('No tienes permiso para mover repuestos.').first()).toBeVisible()
})

test('la dueña pasa el ítem a «Recibido» desde la Cadena y el vehículo ya puede pasar de fase', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/repuestos?vista=cadena&proyecto=${proyectoDeRepuestos}&fase=${transito}`)
  await expect(page.getByText('Mostrando un solo proyecto.')).toBeVisible()
  const columna = page.getByRole('region', { name: 'En tránsito: 1 ítem' })
  await expect(columna.getByRole('link', { name: REPUESTO })).toBeVisible()
  await columna.getByRole('link', { name: REPUESTO }).click()
  const panel = page.getByRole('dialog', { name: 'Repuesto' })
  await expect(panel.getByRole('heading', { name: REPUESTO })).toBeVisible()
  await panel.getByRole('button', { name: 'Elegir el destino «Recibido»' }).click()
  // «Recibido» no pide nada: el botón nace habilitado.
  await expect(panel.getByRole('button', { name: 'Recibir' })).toBeEnabled()
  await panel.getByRole('button', { name: 'Recibir' }).click()
  await expect(page.getByText(`${REPUESTO} pasó a «Recibido».`)).toBeVisible()
  expect(
    sql(
      `select f.nombre || ':' || (select count(*) from historial_fases h where h.repuesto_id = i.id) from repuestos_items i join fases f on f.id = i.fase_id where i.id = '${item}'`,
    ),
  ).toBe('Recibido:2')

  // La Cadena ya lo ve en «Recibido».
  await page.goto(`/repuestos?vista=cadena&proyecto=${proyectoDeRepuestos}&fase=${recibido}`)
  await expect(
    page.getByRole('region', { name: 'Recibido: 1 ítem' }).getByRole('link', { name: REPUESTO }),
  ).toBeVisible()

  // El vehículo: ya no espera nada y «Qué falta» lo da por cumplido.
  await page.goto(`/logistica/vehiculo/${vehiculo}`)
  await bloque(page, 'repuestos').locator('summary').click()
  await expect(
    bloque(page, 'repuestos').getByText('Este vehículo no espera ningún repuesto.'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Elegir el destino «Listo»' }).click()
  await expect(page.getByText('Cumplido', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mover a «Listo»' })).toBeEnabled()
})
