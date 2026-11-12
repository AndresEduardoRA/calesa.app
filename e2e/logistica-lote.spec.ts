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
  aprobarElBl,
  borrarMover,
  sembrarLote,
  sembrarMover,
  type LoteSembrado,
  type TerrenoDeMover,
} from './soporte/mover'

// Mover varias unidades a la vez (6.04-3): el lote de un contenedor con una unidad sin su documento (la vista previa la marca, «Mover los 7 que pueden», el resultado entero y «Reintentar» tras
// aprobarlo), y la selección por casillas desde la cadena. El resultado por unidad, el conflicto y los permisos ya tienen su prueba SQL (6.02): aquí se prueba que la pantalla los dice.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let terreno: TerrenoDeMover
let lote: LoteSembrado

test.beforeAll(async ({}, info) => {
  // Otro nombre que el de `logistica-mover`: los dos specs pueden correr a la vez y no comparten origen.
  proyecto = `lote_${info.project.name}`
  await borrarMover(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-mover-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dalia Lote',
  })
  terreno = await sembrarMover(proyecto)
  lote = await sembrarLote(terreno, proyecto)
})

test.afterAll(async () => {
  await borrarMover(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const resultado = (page: Page) => page.locator('[data-resultado-del-lote]')
const unidadDelLote = (page: Page, titulo: string) =>
  page.locator('[data-unidad-del-lote]').filter({ hasText: titulo })

test('E2E lote · un contenedor con una unidad sin su documento: mueve las siete y reintenta la que faltaba', async ({
  page,
}) => {
  await entrar(page, terreno.primera.correo, { fresco: true })
  await page.goto(
    `/logistica?origen=${terreno.origen.id}&panel=lote&contenedor=${lote.contenedor}&destino=${terreno.c.id}`,
  )
  await expect(page.getByRole('heading', { name: 'Mover varias unidades' })).toBeVisible()
  await expect(page.getByText('Se eligieron 8.')).toBeVisible()
  // La vista previa marca la que falta y deja pasar a las demás.
  const falta = `Falta: ${terreno.tipoDeBl.nombre} aprobado.`
  await expect(unidadDelLote(page, lote.sinBl.titulo)).toContainText(falta)
  await expect(page.locator('[data-unidad-del-lote]').filter({ hasText: 'Lista' })).toHaveCount(7)
  await page.getByRole('button', { name: 'Mover los 7 que pueden' }).click()
  await expect(resultado(page).getByText('Se movieron 7 de 8.')).toBeVisible()
  await expect(resultado(page)).toContainText(`No se movió «${lote.sinBl.titulo}». ${falta}`)
  // Se aprueba el documento de la que faltaba y se reintenta sólo esa.
  await aprobarElBl(terreno, lote.sinBl.id)
  await resultado(page).getByRole('button', { name: 'Reintentar el 1' }).click()
  await expect(page.locator('[data-unidad-del-lote]')).toHaveCount(1)
  await expect(unidadDelLote(page, lote.sinBl.titulo)).toContainText('Lista')
  await page.getByRole('button', { name: 'Mover el 1 que puede' }).click()
  await expect(resultado(page).getByText('Se movió 1 de 1.')).toBeVisible()
  await resultado(page).getByRole('button', { name: 'Cerrar' }).click()
  await expect(page.getByRole('heading', { name: 'Mover varias unidades' })).toBeHidden()
  // Las ocho están en la columna de destino.
  await page.goto(`/logistica?origen=${terreno.origen.id}&fase=${terreno.c.id}`)
  await expect(page.getByRole('region', { name: `${terreno.c.nombre}: 8 vehículos` })).toBeVisible()
})

test('E2E lote · elegir una unidad con su casilla, mover a otra fase y limpiar la selección', async ({
  page,
}) => {
  await entrar(page, terreno.primera.correo)
  await page.goto(`/logistica?origen=${terreno.origen.id}&fase=${terreno.b.id}`)
  const casilla = page.getByRole('checkbox', { name: new RegExp(`Elegir .*${lote.suelta.titulo}`) })
  await casilla.click()
  const barra = page.locator('[data-barra-del-lote]')
  await expect(barra).toContainText(`1 elegido en «${terreno.b.nombre}»`)
  await barra.getByRole('button', { name: 'Mover a…' }).click()
  await expect(page.getByText('Elige a dónde mover.')).toBeVisible()
  await page.getByRole('button', { name: `Mover a «${terreno.c.nombre}»` }).click()
  await expect(unidadDelLote(page, lote.suelta.titulo)).toContainText('Lista')
  await page.getByRole('button', { name: 'Mover el 1 que puede' }).click()
  await expect(resultado(page).getByText('Se movió 1 de 1.')).toBeVisible()
  await resultado(page).getByRole('button', { name: 'Cerrar' }).click()
  // «Cerrar» con un resultado vacía la selección: la barra desaparece.
  await expect(barra).toBeHidden()
})
