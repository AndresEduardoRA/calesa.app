import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { formatearNumero } from '../src/shared/lib/formato'
import { entrar } from './soporte/inventario'
import { marcarInteres, vincular } from './soporte/leads'
import { irAFicha, tituloDeLaFicha } from './soporte/leads-ficha'
import {
  elegirVehiculo,
  interesados,
  irAVehiculos,
  leadDe,
  leadDelVehiculo,
  limpiarVehiculosDelLead,
  notaDelInteres,
  numeroDe,
  prepararVehiculosDelLead,
  seccionVehiculos,
  vehiculoDe,
  vinculados,
  type TerrenoDeVehiculos,
} from './soporte/leads-vehiculos'

// La sección «Vehículos» de la ficha del lead: vincular, reemplazar, desvincular y marcar o quitar
// interés, y lo que la ficha adelanta (la papelera, el aviso al compartir). Quién ve qué va en
// `leads-vehiculos-acceso.spec.ts` y el vehículo de una nota en `leads-vehiculos-notas.spec.ts`.
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

const exito = (page: Page, texto: string) => page.getByText(texto, { exact: true })

// «Deshacer» del aviso que dice ese texto (sonner los apila: el anterior tarda en irse).
const deshacerDe = (page: Page, texto: string) =>
  page
    .locator('[data-sonner-toast]')
    .filter({ hasText: texto })
    .getByRole('button', { name: 'Deshacer' })
    .click()

test('vincular y marcar interés con su nota desde el lead; la ficha del vehículo cuenta lo mismo', async ({
  page,
}) => {
  const lead = await leadDe(t.ada, `Vincula ${p}`)
  const sedan = `Sedán ${p}`
  const camioneta = `Camioneta ${p}`
  const sedanId = await vehiculoDe(corea, sedan, t.ada)
  const camionetaId = await vehiculoDe(corea, camioneta, t.ada)
  await entrar(page, t.ada)
  await irAVehiculos(page, lead.id)
  await expect(
    seccionVehiculos(page).getByText('Este lead no tiene vehículos que puedas ver'),
  ).toBeVisible()

  let panel = await elegirVehiculo(page, sedan)
  await expect(page).toHaveURL(/panel=agregar-vehiculo/)
  await expect(
    panel.getByText(/Quien tenga este lead en su cartera podrá ver este vehículo/),
  ).toBeVisible()
  await panel.getByRole('button', { name: 'Vincular', exact: true }).click()
  await expect(
    exito(page, `Se vinculó «${sedan} · #${String(await numeroDe(sedanId))}» a este lead.`),
  ).toBeVisible()
  await expect(panel).toHaveCount(0)
  await expect(vinculados(page).getByRole('link', { name: sedan })).toBeVisible()
  expect(await leadDelVehiculo(sedanId)).toBe(lead.id)

  panel = await elegirVehiculo(page, camioneta)
  const nota = panel.getByLabel('Nota del interés (opcional)')
  await nota.fill('x'.repeat(501))
  await panel.getByRole('button', { name: 'Marcar interés' }).click()
  await expect(panel.getByText('La nota no puede pasar de 500 caracteres.')).toBeVisible()
  await nota.fill('La quiere en rojo')
  await panel.getByRole('button', { name: 'Marcar interés' }).click()
  await expect(interesados(page).getByText('La quiere en rojo')).toBeVisible()
  expect(await notaDelInteres(camionetaId, lead.id)).toBe('La quiere en rojo')

  // Del lado del vehículo, lo mismo.
  await page.goto(`/vehiculos/${sedanId}`)
  await expect(
    page.getByRole('region', { name: 'Vínculo', exact: true }).getByText(lead.nombre),
  ).toBeVisible()
  await page.goto(`/vehiculos/${camionetaId}`)
  await expect(
    page.getByRole('region', { name: 'Interesados' }).getByText('La quiere en rojo'),
  ).toBeVisible()
})

test('desvincular y quitar interés se hacen y se deshacen', async ({ page }) => {
  const lead = await leadDe(t.ada, `Deshace ${p}`)
  const auto = `Hatchback ${p}`
  const otro = `Furgón ${p}`
  const autoId = await vehiculoDe(corea, auto, t.ada)
  const otroId = await vehiculoDe(corea, otro, t.ada)
  await vincular(autoId, lead.id)
  await marcarInteres({
    vehiculoId: otroId,
    leadId: lead.id,
    quien: t.ada,
    nota: 'Para el trabajo',
  })
  await entrar(page, t.ada)
  await irAVehiculos(page, lead.id)

  await vinculados(page)
    .getByRole('button', { name: `Desvincular ${auto}` })
    .click()
  await expect(page.getByText(new RegExp(`Se desvinculó «${auto}`))).toBeVisible()
  await expect.poll(() => leadDelVehiculo(autoId)).toBeNull()
  // El «Deshacer» de ese aviso: el de otro puede seguir en pantalla mientras se va.
  await deshacerDe(page, `Se desvinculó «${auto}`)
  await expect.poll(() => leadDelVehiculo(autoId)).toBe(lead.id)

  await interesados(page)
    .getByRole('button', { name: `Quitar el interés en ${otro}` })
    .click()
  await expect(page.getByText(new RegExp(`Se quitó el interés en «${otro}`))).toBeVisible()
  await expect.poll(() => notaDelInteres(otroId, lead.id)).toBeUndefined()
  await deshacerDe(page, `Se quitó el interés en «${otro}`)
  await expect.poll(() => notaDelInteres(otroId, lead.id)).toBe('Para el trabajo')
})

test('con un vehículo vinculado, la papelera se apaga con el motivo; desvinculado, se envía', async ({
  page,
}) => {
  const lead = await leadDe(t.ada, `Papelera ${p}`)
  const auto = `Cupé ${p}`
  const autoId = await vehiculoDe(corea, auto, t.ada)
  await vincular(autoId, lead.id)
  await entrar(page, t.ada)
  await irAFicha(page, lead.id)
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
  await page.getByRole('button', { name: `Más acciones de ${lead.nombre}` }).click()
  await expect(page.getByRole('menuitem', { name: 'Enviar a la papelera' })).toBeDisabled()
  await expect(
    page.getByText('Tiene un vehículo vinculado: desvincúlalo en «Vehículos» antes de enviarlo.'),
  ).toBeVisible()
  await page.getByRole('menuitem', { name: 'Ir a «Vehículos»' }).click()
  await expect(seccionVehiculos(page)).toBeVisible()

  await vinculados(page)
    .getByRole('button', { name: `Desvincular ${auto}` })
    .click()
  await expect.poll(() => leadDelVehiculo(autoId)).toBeNull()
  await page.reload()
  await page.getByRole('button', { name: `Más acciones de ${lead.nombre}` }).click()
  await page.getByRole('menuitem', { name: 'Enviar a la papelera' }).click()
  await expect(page).toHaveURL(/\/leads$/)
})

test('reemplazar nombra al lead que lo pierde; uno de otra cartera no se reemplaza', async ({
  page,
}) => {
  const mio = await leadDe(t.ada, `Recibe ${p}`)
  const otroMio = await leadDe(t.ada, `Pierde ${p}`)
  const deCora = await leadDe(t.cora, `De Cora ${p}`)
  const auto = `Roadster ${p}`
  const ajeno = `Pickup ${p}`
  const autoId = await vehiculoDe(corea, auto, t.ada)
  const ajenoId = await vehiculoDe(corea, ajeno, t.ada)
  await vincular(autoId, otroMio.id)
  await vincular(ajenoId, deCora.id)
  await entrar(page, t.ada)
  await irAVehiculos(page, mio.id)

  let panel = await elegirVehiculo(page, auto)
  await expect(
    panel.getByText(new RegExp(`Va a dejar de estar vinculado a «${otroMio.nombre}»`)),
  ).toBeVisible()
  await panel.getByRole('button', { name: 'Vincular a este lead' }).click()
  await expect(
    page.getByText(new RegExp(`ya no está vinculado a «${otroMio.nombre}»`)),
  ).toBeVisible()
  expect(await leadDelVehiculo(autoId)).toBe(mio.id)

  panel = await elegirVehiculo(page, ajeno)
  await expect(
    panel.getByText(
      'Está vinculado a otro lead. Para cambiarlo, desvincúlalo desde la ficha del vehículo.',
    ),
  ).toBeVisible()
  await expect(panel.getByRole('button', { name: /^Vincular/ })).toHaveCount(0)
  await expect(panel.getByText(deCora.nombre)).toHaveCount(0)
  // Desde la ficha del vehículo, quien lo edita lo desvincula (con confirmación: desde ahí no hay «Deshacer»).
  await page.goto(`/vehiculos/${ajenoId}`)
  await page.getByRole('button', { name: 'Desvincular' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Desvincular' }).click()
  await expect.poll(() => leadDelVehiculo(ajenoId)).toBeNull()
  await expect(page.getByText(/^Sin vínculo/)).toBeVisible()
})

test('compartir un lead con vehículos vinculados avisa que el vínculo se los da', async ({
  page,
}) => {
  const lead = await leadDe(t.ada, `Comparte ${p}`)
  const autoId = await vehiculoDe(corea, `Berlina ${p}`, t.ada)
  await vincular(autoId, lead.id)
  await entrar(page, t.ada)
  await irAFicha(page, lead.id)
  await page.getByRole('button', { name: 'Compartir', exact: true }).click()
  await expect(
    page
      .getByRole('dialog', { name: 'Compartir lead' })
      .getByText(
        'Tiene un vehículo vinculado: quien lo reciba podrá verlo y, si su rol lo permite, editarlo.',
      ),
  ).toBeVisible()
})

test('lo que aporta la ficha con la sección «Vehículos»', async ({ page }, info) => {
  const lead = await leadDe(t.ada, `Pesa ${p}`)
  const autoId = await vehiculoDe(corea, `Liviano ${p}`, t.ada)
  await vincular(autoId, lead.id)
  await entrar(page, t.ada)
  const largo = async (ruta: string) =>
    ((await (await page.goto(ruta))?.body())?.length ?? 0) as number
  const kb = (bytes: number) => formatearNumero(bytes / 1024, { decimales: 1 })
  const base = await largo('/perfil')
  const datos = await largo(`/leads/${lead.id}`)
  const vehiculos = await largo(`/leads/${lead.id}?seccion=vehiculos`)
  const resumen = `«Datos» aporta ${kb(datos - base)} KB · «Vehículos» aporta ${kb(vehiculos - base)} KB`
  console.warn(`[ficha con vehículos] ${info.project.name}: ${resumen}`)
  info.annotations.push({ type: 'KB de la ficha con vehículos', description: resumen })
  expect(datos - base).toBeLessThan(44 * 1024)
  expect(vehiculos - base).toBeLessThan(44 * 1024)
})
