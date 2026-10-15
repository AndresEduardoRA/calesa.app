import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/inventario'
import { marcarInteres, vincular } from './soporte/leads'
import { rpcComo } from './soporte/leads-cartera'
import { tituloDeLaFicha } from './soporte/leads-ficha'
import {
  compartirCon,
  interesados,
  irAVehiculos,
  leadDe,
  leadDelVehiculo,
  limpiarVehiculosDelLead,
  panelAgregar,
  prepararVehiculosDelLead,
  vehiculoDe,
  vinculados,
  type TerrenoDeVehiculos,
} from './soporte/leads-vehiculos'

// Quién ve qué en la sección «Vehículos» del lead: el compartido ve lo que su alcance le deja, la
// supervisión ve todo y no agrega (pero desvincula, con confirmación), y sin permiso sobre vehículos
// no hay sección. La base vuelve a decidir: la RPC llamada a mano rechaza lo mismo.
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

// Un lead de Ada con un vehículo vinculado y otro de interés (los dos de Ada), compartido con Cora.
let alcance: {
  lead: { id: string; nombre: string }
  vinculado: string
  vinculadoId: string
  interes: string
  interesId: string
}

test('el compartido ve el vinculado (se lo da el vínculo) y no el interés en un vehículo que no ve', async ({
  page,
}) => {
  const lead = await leadDe(t.ada, `Alcance ${p}`)
  const vinculado = `Familiar ${p}`
  const interes = `Deportivo ${p}`
  const vinculadoId = await vehiculoDe(corea, vinculado, t.ada)
  const interesId = await vehiculoDe(corea, interes, t.ada)
  await vincular(vinculadoId, lead.id)
  await marcarInteres({ vehiculoId: interesId, leadId: lead.id, quien: t.ada, nota: 'Solo de Ada' })
  await compartirCon(lead.id, t.cora, t.ada)
  alcance = { lead, vinculado, vinculadoId, interes, interesId }

  await entrar(page, t.cora)
  await irAVehiculos(page, lead.id)
  await expect(vinculados(page).getByRole('link', { name: vinculado })).toBeVisible()
  await expect(
    page.getByText('Este lead no mostró interés en ningún vehículo que puedas ver.'),
  ).toBeVisible()
  await expect(page.getByText(interes)).toHaveCount(0)
})

test('la supervisión ve todo y no agrega (ni por la URL), pero desvincula con confirmación', async ({
  page,
}) => {
  const { lead, vinculado, vinculadoId, interesId } = alcance
  await entrar(page, t.sol)
  await irAVehiculos(page, lead.id, '&panel=agregar-vehiculo')
  await expect(panelAgregar(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Agregar vehículo' })).toHaveCount(0)
  await expect(interesados(page).getByText('Solo de Ada')).toBeVisible()
  // La base tampoco la deja: vincular pide la cartera del lead.
  const rechazo = await rpcComo(t.sol, 'vehiculo_vincular', {
    p_vehiculo: interesId,
    p_actualizado_en_esperado: new Date().toISOString(),
    p_lead: lead.id,
  })
  expect(rechazo.error?.message).toBe('No encontramos este lead o no tienes acceso.')
  await vinculados(page)
    .getByRole('button', { name: `Desvincular ${vinculado}` })
    .click()
  await page.getByRole('dialog').getByRole('button', { name: 'Desvincular' }).click()
  await expect.poll(() => leadDelVehiculo(vinculadoId)).toBeNull()
})

test('sin permiso sobre vehículos no hay sección, ni por la URL', async ({ page }) => {
  const lead = await leadDe(t.lia, `Sin vehículos ${p}`)
  await entrar(page, t.lia)
  await page.goto(`/leads/${lead.id}?seccion=vehiculos`)
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
  await expect(page.getByRole('link', { name: 'Vehículos', exact: true })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Vehículos', exact: true })).toHaveCount(0)
})
