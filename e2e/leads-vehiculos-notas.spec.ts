import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/inventario'
import { vincular } from './soporte/leads'
import {
  abrirAgendar,
  abrirAnotar,
  abrirEdicionDeSeguimiento,
  irASeguimientos,
  recordatorio,
  seguimiento,
} from './soporte/leads-seguimientos'
import {
  leadDe,
  limpiarVehiculosDelLead,
  numeroDe,
  prepararVehiculosDelLead,
  vehiculoDe,
  vehiculoDeLaNota,
  type TerrenoDeVehiculos,
} from './soporte/leads-vehiculos'

// Un seguimiento o un recordatorio con un vehículo del lead (`vehiculo_id`): se elige entre los que
// quien escribe ve, se ve nombrado, y si después deja de verlo sigue sin el nombre y editar lo demás
// no lo pierde.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDeVehiculos
let corea = ''
let p = ''

test.beforeAll(async ({}, info) => {
  t = await prepararVehiculosDelLead(info.project.name)
  corea = t.inventario.corea.id
  p = info.project.name === 'movil' ? 'M' : 'E'
})

test.afterAll(async () => {
  await limpiarVehiculosDelLead()
})

test('un seguimiento y un recordatorio llevan un vehículo del lead, y se ve nombrado', async ({
  page,
}) => {
  const lead = await leadDe(t.ada, `Notas ${p}`)
  const auto = `Coupé ${p}`
  const autoId = await vehiculoDe(corea, auto, t.ada)
  await vincular(autoId, lead.id)
  const rotulo = `${auto} · #${String(await numeroDe(autoId))}`
  await entrar(page, t.ada)
  await irASeguimientos(page, lead.id)

  const formulario = await abrirAnotar(page)
  await formulario.getByLabel('Resumen').fill('Le mostré el coupé')
  await formulario.getByLabel('Vehículo (opcional)').selectOption({ label: rotulo })
  await formulario.getByRole('button', { name: 'Guardar' }).click()
  await expect(seguimiento(page, 'Le mostré el coupé')).toContainText(rotulo)
  expect(await vehiculoDeLaNota('seguimientos', lead.id, 'Le mostré el coupé')).toBe(autoId)

  const agenda = await abrirAgendar(page)
  await agenda.getByLabel('De qué es').fill('Mandarle fotos del coupé')
  await agenda.getByRole('button', { name: 'Mañana 09:00' }).click()
  await agenda.getByLabel('Vehículo (opcional)').selectOption({ label: rotulo })
  await agenda.getByRole('button', { name: 'Guardar' }).click()
  await expect(recordatorio(page, 'Mandarle fotos del coupé')).toContainText(rotulo)
  expect(await vehiculoDeLaNota('recordatorios', lead.id, 'Mandarle fotos del coupé')).toBe(autoId)
})

test('uno que deja de verse sigue sin nombre, y editar lo demás no lo pierde', async ({ page }) => {
  const lead = await leadDe(t.ada, `Deja de ver ${p}`)
  // De Cora: Ada lo ve sólo mientras está vinculado a su lead.
  const ajeno = `Sedán de Cora ${p}`
  const ajenoId = await vehiculoDe(corea, ajeno, t.cora)
  await vincular(ajenoId, lead.id)
  const rotulo = `${ajeno} · #${String(await numeroDe(ajenoId))}`
  await entrar(page, t.ada)
  await irASeguimientos(page, lead.id)
  const formulario = await abrirAnotar(page)
  await formulario.getByLabel('Resumen').fill('Probó el sedán')
  await formulario.getByLabel('Vehículo (opcional)').selectOption({ label: rotulo })
  await formulario.getByRole('button', { name: 'Guardar' }).click()
  await expect(seguimiento(page, 'Probó el sedán')).toContainText(ajeno)

  await vincular(ajenoId, null)
  await page.reload()
  await expect(seguimiento(page, 'Probó el sedán')).toContainText('un vehículo que ya no ves')
  await expect(page.getByText(ajeno)).toHaveCount(0)
  const edicion = await abrirEdicionDeSeguimiento(page, 'Probó el sedán')
  await expect(edicion.getByLabel('Vehículo (opcional)')).toHaveValue('oculto')
  await edicion.getByLabel('Resumen').fill('Probó el sedán y le gustó')
  await edicion.getByRole('button', { name: 'Guardar' }).click()
  await expect(seguimiento(page, 'Probó el sedán y le gustó')).toBeVisible()
  expect(await vehiculoDeLaNota('seguimientos', lead.id, 'Probó el sedán y le gustó')).toBe(ajenoId)
})
