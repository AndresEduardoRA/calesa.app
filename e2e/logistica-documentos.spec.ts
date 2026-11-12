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
// objeto va al bucket y la fila queda «Subido» en la lista. Quien no tiene esa clave ve la zona apagada y su motivo.
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
