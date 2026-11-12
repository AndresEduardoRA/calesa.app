// @sin-celular-archivo: el camino feliz de los documentos de la unidad va en escritorio, como pide la fila 6.06; en el celular el panel de la unidad es el mismo drawer (6.01).
import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarDocumentos, sembrarDocumentos, type TerrenoDeDocumentos } from './soporte/documentos'

// Documentos de la unidad (6.06). Parte 2: quien tiene `logistica.documentos.subir` elige un PDF, lo deja en la bandeja (sin subir nada), elige el tipo «E2E BL» y «Subir 1 documento»: el
// objeto va al bucket y la fila queda «Subido» en la lista. Quien no tiene esa clave ve la zona apagada y su motivo. Parte 3: otra cuenta con `logistica.documentos.aprobar` aprueba ese BL, la fila
// pasa a «Aprobado» y el requisito de «Qué falta» queda «Cumplido» (el botón de mover se habilita); quien sólo sube ve «Aprobar» apagado y por qué.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let terreno: TerrenoDeDocumentos

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarDocumentos(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  await crearDuenaDePrueba({
    email: correoDePrueba(`duena-documentos-${proyecto}`),
    contrasena: CONTRASENA,
    nombre: 'Dalia Documentos',
  })
  terreno = await sembrarDocumentos(proyecto)
})

test.afterAll(async () => {
  await borrarDocumentos(proyecto)
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('E2E subir un PDF: la bandeja no sube nada hasta «Subir» y la fila queda «Subido»', async ({
  page,
}) => {
  await entrar(page, terreno.quienSube.correo, { fresco: true })
  await page.goto(`/logistica/vehiculo/${terreno.enB.id}`)
  await expect(page.getByRole('heading', { name: terreno.enB.titulo })).toBeVisible()
  await page.locator('span:text-is("Documentos")').click()
  const hueco = page.locator('[data-hueco="documentos"]')
  await expect(hueco.getByLabel('Tipo de documento')).toBeVisible()

  await hueco.getByLabel('Tipo de documento').selectOption({ label: terreno.tipoDeBl.nombre })
  await hueco.locator('input[type="file"]:not([capture])').setInputFiles({
    name: 'bl.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(`%PDF-1.4 e2e ${proyecto} ${Date.now()}`),
  })
  await expect(hueco.getByRole('list', { name: 'Archivos para subir' })).toContainText('bl.pdf')
  // Elegir no sube: todavía no hay fila.
  const antes = await admin()
    .from('documentos')
    .select('id')
    .eq('vehiculo_id', terreno.enB.id)
    .limit(1)
  expect(antes.data).toEqual([])

  await hueco.getByRole('button', { name: 'Subir 1 documento' }).click()
  await expect(hueco.getByText('Subido', { exact: true })).toBeVisible()
  await expect(hueco.getByRole('list', { name: 'Archivos para subir' })).toHaveCount(0)
  const despues = await admin()
    .from('documentos')
    .select('estado, nombre_archivo, mime, subido_por')
    .eq('vehiculo_id', terreno.enB.id)
    .limit(2)
  expect(despues.data).toHaveLength(1)
  expect(despues.data?.[0]).toMatchObject({
    estado: 'subido',
    nombre_archivo: 'bl.pdf',
    mime: 'application/pdf',
  })
})

test('E2E quien no puede subir ve la zona apagada y el motivo', async ({ page }) => {
  await entrar(page, terreno.primera.correo, { fresco: true })
  await page.goto(`/logistica/vehiculo/${terreno.enB.id}`)
  await page.locator('span:text-is("Documentos")').click()
  const hueco = page.locator('[data-hueco="documentos"]')
  await expect(hueco.getByText('Necesitas permiso para subir documentos.')).toBeVisible()
  await expect(hueco.getByRole('button', { name: 'Elegir archivos' })).toBeDisabled()
})

test('E2E sin la clave de aprobar, «Aprobar» queda apagado y dice por qué', async ({ page }) => {
  await entrar(page, terreno.quienSube.correo, { fresco: true })
  await page.goto(`/logistica/vehiculo/${terreno.enB.id}`)
  await page.locator('span:text-is("Documentos")').click()
  const hueco = page.locator('[data-hueco="documentos"]')
  await expect(hueco.getByText('Subido', { exact: true })).toBeVisible()
  await expect(hueco.getByRole('button', { name: 'Aprobar' })).toBeDisabled()
  await expect(hueco.getByRole('switch', { name: 'Visible en el portal' })).toBeDisabled()
  await expect(hueco.getByText('Necesitas permiso para aprobar documentos.').first()).toBeVisible()
})

test('E2E aprobar el BL: la fila queda «Aprobado» y «Qué falta» cumple el requisito del destino', async ({
  page,
}) => {
  await entrar(page, terreno.quienAprueba.correo, { fresco: true })
  await page.goto(`/logistica/vehiculo/${terreno.enB.id}`)
  await expect(page.getByRole('heading', { name: terreno.enB.titulo })).toBeVisible()
  const bloque = page.locator('[data-destino]').filter({ hasText: terreno.c.nombre })
  await page.getByRole('button', { name: `Elegir el destino «${terreno.c.nombre}»` }).click()
  await expect(bloque.getByText('Falta', { exact: true })).toBeVisible()
  await expect(bloque.getByRole('button', { name: `Mover a «${terreno.c.nombre}»` })).toBeDisabled()

  await page.locator('span:text-is("Documentos")').click()
  const hueco = page.locator('[data-hueco="documentos"]')
  await expect(hueco.getByText('Subido', { exact: true })).toBeVisible()
  await hueco.getByRole('button', { name: 'Aprobar' }).click()
  await expect(hueco.getByText('Aprobado', { exact: true })).toBeVisible()
  await expect(hueco.getByRole('button', { name: 'Aprobar' })).toHaveCount(0)

  const fila = await admin()
    .from('documentos')
    .select('estado, revisado_por')
    .eq('vehiculo_id', terreno.enB.id)
    .limit(2)
  expect(fila.data).toHaveLength(1)
  expect(fila.data?.[0]?.estado).toBe('aprobado')
  expect(fila.data?.[0]?.revisado_por).not.toBeNull()

  // Aprobar avisa a «Qué falta», que se relee sin esperar al foco.
  await expect(bloque.getByText('Cumplido', { exact: true })).toBeVisible()
  await expect(bloque.getByRole('button', { name: `Mover a «${terreno.c.nombre}»` })).toBeEnabled()
})
