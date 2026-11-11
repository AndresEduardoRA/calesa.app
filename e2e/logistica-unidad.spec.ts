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
