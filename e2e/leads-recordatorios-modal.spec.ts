import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { idDePersona, sesionDe } from './soporte/leads-alta'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import { nuevoLead } from './soporte/leads-ficha'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import {
  abrirAgendar,
  abrirEdicionDeRecordatorio,
  bloqueDeRecordatorios,
  irASeguimientos,
  meterRecordatorio,
  modalDeRecordatorio,
  recordatorio,
  recordatoriosEnLaBase,
} from './soporte/leads-seguimientos'

// El modal de «Agendar recordatorio» y «Editar» (`?panel=agendar-recordatorio`,
// `?panel=editar-recordatorio&recordatorio=<id>`): recargar lo reabre con lo escrito, Esc con cambios
// pregunta, un id que no está o uno completado no abren, el conflicto con «Recargar», lo que cambia en
// otra pestaña con el modal abierto, sin conexión y sin la cartera.
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

const enUnaHora = () => new Date(Date.now() + 3600_000).toISOString()

test('el modal vive en la URL: recargar lo reabre con lo escrito; Esc con cambios pregunta', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Rec URL ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irASeguimientos(page, lead.id)
  let modal = await abrirAgendar(page)
  await modal.getByLabel('De qué es').fill('Lo dejé a medias')
  await page.reload()
  modal = modalDeRecordatorio(page, 'Agendar')
  await expect(modal.getByLabel('De qué es')).toHaveValue('Lo dejé a medias')
  await expect(page.getByText('Recuperamos lo que habías escrito y no guardaste.')).toBeVisible()

  // Esc con algo escrito pregunta en el mismo modal; «Descartar» lo tira, también el borrador.
  await modal.getByLabel('De qué es').click()
  await page.keyboard.press('Escape')
  await expect(modal.getByText('Tienes cambios sin guardar.')).toBeVisible()
  await modal.getByRole('button', { name: 'Descartar' }).click()
  await expect(modal).toHaveCount(0)
  await expect(page).not.toHaveURL(/panel=/)
  modal = await abrirAgendar(page)
  await expect(modal.getByLabel('De qué es')).toHaveValue('')

  // «Atrás» lo cierra.
  await page.goBack()
  await expect(modal).toHaveCount(0)
  expect(await recordatoriosEnLaBase(lead.id)).toEqual([])
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('un id que no está o uno completado no abren el modal y lo dicen', async ({ page }, info) => {
  const lead = await leadDeBerta(`Rec Id ${info.project.name}`)
  const berta = await idDePersona(t.personas.berta)
  const hecho = await meterRecordatorio({
    leadId: lead.id,
    usuarioId: berta,
    titulo: 'Ya hecho',
    recordarEn: enUnaHora(),
  })
  await sesionDe(t.personas.berta, CONTRASENA).then(async (sesion) => {
    const [fila] = await recordatoriosEnLaBase(lead.id)
    const { error } = await sesion.rpc('recordatorio_completar', {
      p_id: hecho,
      p_actualizado_en_esperado: fila?.actualizado_en ?? '',
      p_completado: true,
    })
    expect(error).toBeNull()
  })
  await entrar(page, t.personas.berta)
  await irASeguimientos(
    page,
    lead.id,
    `&panel=editar-recordatorio&recordatorio=${crypto.randomUUID()}`,
  )
  await expect(page.getByText('No encontramos este recordatorio.')).toBeVisible()
  await expect(modalDeRecordatorio(page, 'Editar')).toHaveCount(0)
  await expect(page).not.toHaveURL(/panel=/)

  await irASeguimientos(page, lead.id, `&panel=editar-recordatorio&recordatorio=${hecho}`)
  await expect(page.getByText(/Ese recordatorio está completado/)).toBeVisible()
  await expect(modalDeRecordatorio(page, 'Editar')).toHaveCount(0)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('cambiado en otra pestaña: el conflicto conserva lo escrito y «Recargar» deja guardarlo', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Rec Conflicto ${info.project.name}`)
  const berta = await idDePersona(t.personas.berta)
  const id = await meterRecordatorio({
    leadId: lead.id,
    usuarioId: berta,
    titulo: 'Original',
    recordarEn: enUnaHora(),
  })
  await entrar(page, t.personas.berta)
  await irASeguimientos(page, lead.id)
  const modal = await abrirEdicionDeRecordatorio(page, 'Original')
  await modal.getByLabel('De qué es').fill('Lo mío')

  // La misma persona lo renombra en otra ventana.
  const sesion = await sesionDe(t.personas.berta, CONTRASENA)
  const [fila] = await recordatoriosEnLaBase(lead.id)
  const { error } = await sesion.rpc('recordatorio_guardar', {
    p_id: id,
    p_actualizado_en_esperado: fila?.actualizado_en ?? '',
    p_cambios: { titulo: 'Desde la otra ventana' },
  })
  expect(error).toBeNull()

  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(modal.getByText(/desde otra ventana/)).toBeVisible()
  await expect(modal.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  await expect(modal.getByLabel('De qué es')).toHaveValue('Lo mío')
  await modal.getByRole('button', { name: 'Recargar' }).click()
  await expect(modal.getByRole('button', { name: 'Guardar' })).toBeEnabled()
  await expect(modal.getByLabel('De qué es')).toHaveValue('Lo mío')
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(modal).toHaveCount(0)
  expect((await recordatoriosEnLaBase(lead.id))[0]?.titulo).toBe('Lo mío')
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('completado en otra pestaña con el modal abierto: lo dice y no se guarda', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Rec Otra Pestaña ${info.project.name}`)
  const berta = await idDePersona(t.personas.berta)
  const id = await meterRecordatorio({
    leadId: lead.id,
    usuarioId: berta,
    titulo: 'Se completa solo',
    recordarEn: enUnaHora(),
  })
  await entrar(page, t.personas.berta)
  await irASeguimientos(page, lead.id)
  const modal = await abrirEdicionDeRecordatorio(page, 'Se completa solo')
  await modal.getByLabel('De qué es').fill('Escrito antes')
  const sesion = await sesionDe(t.personas.berta, CONTRASENA)
  const [fila] = await recordatoriosEnLaBase(lead.id)
  await sesion.rpc('recordatorio_completar', {
    p_id: id,
    p_actualizado_en_esperado: fila?.actualizado_en ?? '',
    p_completado: true,
  })
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await modal.getByRole('button', { name: 'Recargar' }).click()
  await expect(modal.getByText(/Ese recordatorio está completado/)).toBeVisible()
  await expect(modal.getByLabel('De qué es')).toHaveValue('Escrito antes')
  await expect(modal.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  expect((await recordatoriosEnLaBase(lead.id))[0]?.titulo).toBe('Se completa solo')
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('sin conexión lo escrito queda y se agenda solo al volver, una vez', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Rec Sin Red ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irASeguimientos(page, lead.id)
  const modal = await abrirAgendar(page)
  await modal.getByLabel('De qué es').fill('Cuando vuelva la red')
  await modal.getByRole('button', { name: 'Mañana 09:00' }).click()
  await page.context().setOffline(true)
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(modal.getByText(/se va a guardar solo cuando vuelva/)).toBeVisible()
  await expect(modal.getByLabel('De qué es')).toHaveValue('Cuando vuelva la red')
  await page.context().setOffline(false)
  await expect(recordatorio(page, 'Cuando vuelva la red')).toBeVisible()
  await expect(modal).toHaveCount(0)
  expect(await recordatoriosEnLaBase(lead.id)).toHaveLength(1)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('sin la cartera no hay «Agendar recordatorio» y la URL no lo abre', async ({ page }, info) => {
  const lead = await leadDeBerta(`Rec Sin Cartera ${info.project.name}`)
  await entrar(page, t.personas.duena)
  await irASeguimientos(page, lead.id, '&panel=agendar-recordatorio')
  await expect(bloqueDeRecordatorios(page)).toBeVisible()
  await expect(
    bloqueDeRecordatorios(page).getByRole('button', { name: 'Agendar recordatorio' }),
  ).toHaveCount(0)
  await expect(modalDeRecordatorio(page, 'Agendar')).toHaveCount(0)
})
