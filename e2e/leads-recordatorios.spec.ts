import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { idDePersona, sesionDe } from './soporte/leads-alta'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import { nuevoLead } from './soporte/leads-ficha'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import {
  abrirRedactor,
  bloqueDeRecordatorios,
  compartirCon,
  irASeguimientos,
  meterRecordatorio,
  recordatorio,
  recordatoriosEnLaBase,
  seguimiento,
} from './soporte/leads-seguimientos'

// «Tus recordatorios» en la ficha: agendar con los atajos, uno pasado se rechaza, completar es
// «poner» (dos veces no cambia nada), reabrir, editar la hora de uno ya avisado, eliminar con
// «Deshacer», el aviso de vencidos arriba de la ficha y que el de otra persona no existe.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

async function leadDeBerta(corto: string) {
  return nuevoLead({ corto, telefono: completoCon(t, nacional()), deQuien: t.personas.berta })
}

const haceUnaHora = () => new Date(Date.now() - 3600_000).toISOString()

test('agenda con «Mañana 09:00»; uno en el pasado se rechaza junto al campo', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Rec Agendar ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irASeguimientos(page, lead.id)
  const bloque = bloqueDeRecordatorios(page)
  await expect(bloque.getByText('Ningún recordatorio pendiente sobre este lead.')).toBeVisible()

  await bloque.getByRole('button', { name: 'Agendar recordatorio' }).click()
  const formulario = page.getByRole('form', { name: 'Agendar recordatorio' })
  await formulario.getByLabel('De qué es').fill('Llamar por el RAV4')
  await formulario.getByLabel('Fecha y hora').fill('2020-01-01T09:00')
  await formulario.getByRole('button', { name: 'Guardar' }).click()
  await expect(formulario.getByText('El recordatorio tiene que ser en el futuro.')).toBeVisible()
  expect(await recordatoriosEnLaBase(lead.id)).toEqual([])

  await formulario.getByRole('button', { name: 'Mañana 09:00' }).click()
  await formulario.getByRole('button', { name: 'Guardar' }).dblclick()
  await expect(recordatorio(page, 'Llamar por el RAV4')).toBeVisible()
  const guardados = await recordatoriosEnLaBase(lead.id)
  expect(guardados).toHaveLength(1)
  // 09:00 en la zona de la empresa (La Paz, UTC-4).
  expect(new Date(guardados[0]?.recordar_en ?? '').getUTCHours()).toBe(13)
})

test('anotar un seguimiento con recordatorio deja los dos, en una sola vez', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Rec Con Seguimiento ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irASeguimientos(page, lead.id)
  const formulario = await abrirRedactor(page)
  await formulario.getByLabel('Resumen').fill('Quedó en pensarlo')
  await formulario.getByRole('button', { name: 'En 3 días 09:00' }).click()
  await formulario.getByRole('button', { name: 'Guardar' }).click()
  await expect(seguimiento(page, 'Quedó en pensarlo')).toBeVisible()
  await expect(recordatorio(page, 'Quedó en pensarlo')).toBeVisible()
  expect(await recordatoriosEnLaBase(lead.id)).toHaveLength(1)
})

test('completar es poner: dos veces no cambia nada; reabrir lo devuelve', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Rec Completar ${info.project.name}`)
  const berta = await idDePersona(t.personas.berta)
  const id = await meterRecordatorio({
    leadId: lead.id,
    usuarioId: berta,
    titulo: 'Mandar la cotización',
    recordarEn: new Date(Date.now() + 86400_000).toISOString(),
  })
  await entrar(page, t.personas.berta)
  await irASeguimientos(page, lead.id)
  await recordatorio(page, 'Mandar la cotización')
    .getByRole('button', { name: 'Completar' })
    .click()
  await expect(bloqueDeRecordatorios(page).getByText('Completados (1)')).toBeVisible()
  const [completado] = await recordatoriosEnLaBase(lead.id)
  expect(completado?.completado_en).not.toBeNull()

  // Completar otra vez, con la versión de antes (otra ventana): no cambia nada ni choca.
  const sesion = await sesionDe(t.personas.berta, CONTRASENA)
  const otraVez = await sesion.rpc('recordatorio_completar', {
    p_id: id,
    p_actualizado_en_esperado: completado?.actualizado_en ?? '',
    p_completado: true,
  })
  expect(otraVez.error).toBeNull()
  expect((otraVez.data as { resultado: string }).resultado).toBe('sin_cambios')
  expect((await recordatoriosEnLaBase(lead.id))[0]?.completado_en).toBe(completado?.completado_en)

  await bloqueDeRecordatorios(page).getByText('Completados (1)').click()
  await recordatorio(page, 'Mandar la cotización').getByRole('button', { name: 'Reabrir' }).click()
  await expect(
    recordatorio(page, 'Mandar la cotización').getByRole('button', { name: 'Completar' }),
  ).toBeVisible()
  expect((await recordatoriosEnLaBase(lead.id))[0]?.completado_en).toBeNull()
})

test('un vencido se avisa arriba de la ficha; completarlo quita el aviso', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Rec Vencido ${info.project.name}`)
  const berta = await idDePersona(t.personas.berta)
  await meterRecordatorio({
    leadId: lead.id,
    usuarioId: berta,
    titulo: 'Era para ayer',
    recordarEn: haceUnaHora(),
  })
  await entrar(page, t.personas.berta)
  await page.goto(`/leads/${lead.id}`)
  const aviso = page.getByText('Tienes 1 recordatorio vencido sobre este lead.')
  await expect(aviso).toBeVisible()
  await page.getByRole('link', { name: 'Verlos' }).click()
  await expect(page).toHaveURL(/seccion=seguimientos/)
  const vencido = recordatorio(page, 'Era para ayer')
  await expect(vencido.getByText('Vencido')).toBeVisible()
  await vencido.getByRole('button', { name: 'Completar' }).click()
  await expect(aviso).toHaveCount(0)
})

test('cambiar la hora de uno ya avisado lo vuelve a dejar por avisar; eliminar ofrece «Deshacer»', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Rec Avisado ${info.project.name}`)
  const berta = await idDePersona(t.personas.berta)
  await meterRecordatorio({
    leadId: lead.id,
    usuarioId: berta,
    titulo: 'Ya avisó',
    recordarEn: haceUnaHora(),
    notificadoEn: haceUnaHora(),
  })
  await entrar(page, t.personas.berta)
  await irASeguimientos(page, lead.id)
  await recordatorio(page, 'Ya avisó').getByRole('button', { name: 'Editar' }).click()
  const formulario = page.getByRole('form', { name: 'Editar recordatorio' })
  // Sólo el título: la hora pasada se conserva y no se pide otra.
  await formulario.getByLabel('De qué es').fill('Ya avisó, renombrado')
  await formulario.getByRole('button', { name: 'Guardar' }).click()
  await expect(formulario).toHaveCount(0)
  await expect(recordatorio(page, 'Ya avisó, renombrado')).toBeVisible()
  expect((await recordatoriosEnLaBase(lead.id))[0]?.notificado_en).not.toBeNull()

  await recordatorio(page, 'Ya avisó, renombrado').getByRole('button', { name: 'Editar' }).click()
  await page
    .getByRole('form', { name: 'Editar recordatorio' })
    .getByRole('button', { name: 'Mañana 09:00' })
    .click()
  await page
    .getByRole('form', { name: 'Editar recordatorio' })
    .getByRole('button', { name: 'Guardar' })
    .click()
  // Mientras se edita, el ítem es el formulario: se espera a que vuelva.
  await expect(page.getByRole('form', { name: 'Editar recordatorio' })).toHaveCount(0)
  await expect(recordatorio(page, 'Ya avisó, renombrado').getByText('Vencido')).toHaveCount(0)
  await expect.poll(async () => (await recordatoriosEnLaBase(lead.id))[0]?.notificado_en).toBeNull()

  await recordatorio(page, 'Ya avisó, renombrado').getByRole('button', { name: 'Eliminar' }).click()
  await expect(page.getByText('Recordatorio eliminado.')).toBeVisible()
  await expect(recordatorio(page, 'Ya avisó, renombrado')).toHaveCount(0)
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(recordatorio(page, 'Ya avisó, renombrado')).toBeVisible()
  expect((await recordatoriosEnLaBase(lead.id))[0]?.eliminado_en).toBeNull()
})

test('el recordatorio de otra persona no existe para ti, ni en el lead que comparten', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Rec Ajeno ${info.project.name}`)
  const [berta, carlos] = await Promise.all([
    idDePersona(t.personas.berta),
    idDePersona(t.personas.carlos),
  ])
  await compartirCon(lead.id, carlos, berta)
  const deCarlos = await meterRecordatorio({
    leadId: lead.id,
    usuarioId: carlos,
    titulo: 'El de Carlos',
    recordarEn: haceUnaHora(),
  })
  await entrar(page, t.personas.berta)
  await irASeguimientos(page, lead.id)
  await expect(
    bloqueDeRecordatorios(page).getByText('Ningún recordatorio pendiente sobre este lead.'),
  ).toBeVisible()
  await expect(page.getByText('El de Carlos')).toHaveCount(0)
  await expect(page.getByText(/recordatorios? vencidos? sobre este lead/)).toHaveCount(0)

  const sesion = await sesionDe(t.personas.berta, CONTRASENA)
  const { error } = await sesion.rpc('recordatorio_completar', {
    p_id: deCarlos,
    p_actualizado_en_esperado: new Date().toISOString(),
    p_completado: true,
  })
  expect(error?.message).toBe('No encontramos este recordatorio.')
  const { data } = await sesion.from('recordatorios_vista').select('id').eq('id', deCarlos)
  expect(data).toEqual([])
})
