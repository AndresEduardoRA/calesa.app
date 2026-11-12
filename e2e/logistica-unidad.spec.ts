import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarLogistica, sembrarLogistica, type TerrenoDeLogistica } from './soporte/logistica'

// El panel de la unidad de logística (6.01-2), en su propia página: con `logistica.ver` y `vehiculos.ver` del origen se ve el título, el origen, la fase y los días en ella; con sólo
// `vehiculos.ver` (la RLS de `vehiculos` lee con ésa) el panel dice que no hay permiso; una unidad que no existe, el estado «ya no está disponible». Los huecos de las áreas
// llegan con su paso: hoy el panel no lleva ningún bloque.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let terreno: TerrenoDeLogistica

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarLogistica(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-logistica-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dalia Logística',
  })
  terreno = await sembrarLogistica(proyecto)
})

test.afterAll(async () => {
  await borrarLogistica(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('con logistica.ver ve la unidad: título, origen, fase y días en la fase', async ({ page }) => {
  await entrar(page, terreno.conLogistica, { fresco: true })
  await page.goto(`/logistica/vehiculo/${terreno.enFase.id}`)
  await expect(page.getByRole('heading', { name: terreno.enFase.titulo })).toBeVisible()
  await expect(page.getByText(terreno.origen.nombre)).toBeVisible()
  await expect(page.getByText(terreno.fase.nombre)).toBeVisible()
  await expect(page.getByText('Desde hace 3 días en esta fase')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Abrir ficha' })).toHaveAttribute(
    'href',
    `/vehiculos/${terreno.enFase.id}`,
  )
  // El flujo del origen se leyó (`leerFlujoDeOrigen`, primera vez contra la base): sin aviso de que no se pudo.
  await expect(page.getByText(/No pudimos leer el flujo/)).toHaveCount(0)
})

test('una unidad sin fase dice «Sin fase» y no cuenta días', async ({ page }) => {
  await entrar(page, terreno.conLogistica)
  await page.goto(`/logistica/vehiculo/${terreno.sinFase.id}`)
  await expect(page.getByRole('heading', { name: terreno.sinFase.titulo })).toBeVisible()
  await expect(page.getByText('Sin fase', { exact: true })).toBeVisible()
  await expect(page.getByText(/en esta fase/)).toHaveCount(0)
})

test('con sólo vehiculos.ver el panel dice que no tiene permiso', async ({ page }) => {
  await entrar(page, terreno.sinLogistica, { fresco: true })
  await page.goto(`/logistica/vehiculo/${terreno.enFase.id}`)
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
  await expect(page.getByText(terreno.enFase.titulo)).toHaveCount(0)
})

test('una unidad que no existe, o un id que no es válido, dice que ya no está disponible', async ({
  page,
}) => {
  await entrar(page, terreno.conLogistica, { fresco: true })
  for (const id of ['00000000-0000-4000-8000-000000000000', 'no-es-un-id']) {
    await page.goto(`/logistica/vehiculo/${id}`)
    await expect(page.getByText('Este vehículo ya no está disponible')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ir a Logística' })).toBeVisible()
  }
})

// `/logistica` (6.01-3, con la cadena del 6.03): dibuja la cadena de su origen y, con `?vehiculo=<id>`, el panel de la unidad en un drawer por URL.
test('/logistica sin unidad dibuja la cadena del origen y ningún panel', async ({ page }) => {
  await entrar(page, terreno.conLogistica, { fresco: true })
  await page.goto('/logistica')
  await expect(
    page.getByRole('region', { name: `${terreno.fase.nombre}: 1 vehículo` }),
  ).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('?vehiculo=<id> abre el panel de la unidad en un drawer y Esc lo cierra', async ({ page }) => {
  await entrar(page, terreno.conLogistica, { fresco: true })
  await page.goto(`/logistica?vehiculo=${terreno.enFase.id}`)
  const panel = page.getByRole('dialog')
  await expect(panel.getByRole('heading', { name: terreno.enFase.titulo })).toBeVisible()
  await expect(panel.getByText('Desde hace 3 días en esta fase')).toBeVisible()
  await expect(panel.getByRole('link', { name: 'Abrir ficha' })).toHaveAttribute(
    'href',
    `/vehiculos/${terreno.enFase.id}`,
  )

  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page).not.toHaveURL(/vehiculo=/)
  await expect(
    page.getByRole('region', { name: `${terreno.fase.nombre}: 1 vehículo` }),
  ).toBeVisible()
})

test('en el drawer, una unidad que no existe o un id inválido dice que ya no está disponible', async ({
  page,
}) => {
  await entrar(page, terreno.conLogistica, { fresco: true })
  for (const id of ['00000000-0000-4000-8000-000000000000', 'no-es-un-id']) {
    await page.goto(`/logistica?vehiculo=${id}`)
    await expect(
      page.getByRole('dialog').getByText('Este vehículo ya no está disponible'),
    ).toBeVisible()
  }
})

test('con sólo vehiculos.ver ni /logistica ni el drawer muestran la unidad', async ({ page }) => {
  await entrar(page, terreno.sinLogistica, { fresco: true })
  await page.goto('/logistica')
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
  await expect(
    page.getByRole('region', { name: `${terreno.fase.nombre}: 1 vehículo` }),
  ).toHaveCount(0)
  await page.goto(`/logistica?vehiculo=${terreno.enFase.id}`)
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
  await expect(page.getByText(terreno.enFase.titulo)).toHaveCount(0)
})
