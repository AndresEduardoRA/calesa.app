import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { descartarAviso, esMovil } from './soporte/inventario'
import { sesionDe } from './soporte/leads-alta'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import {
  botonCambiar,
  constanciasDe,
  extrasDeLead,
  irAFicha,
  nuevoLead,
  panelDeTelefono,
  ponerExtras,
  telefonoDeLead,
  tituloDeLaFicha,
  versionDe,
} from './soporte/leads-ficha'
import { completoCon, fichaDeBerta, nacional } from './soporte/leads-ficha-telefonos'

// Los teléfonos extra de la ficha, en línea: agregar, rotular, quitar y «Deshacer», sus reglas junto
// al campo, el tope de 10 y lo que ve (y no puede) quien no tiene el lead en su cartera.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

test('agrega, rotula, quita y deshace un extra, sin mover la versión', async ({ page }, info) => {
  const lead = await fichaDeBerta(t, page, `Extras ${info.project.name}`)
  const version = await versionDe(lead.id)
  const casa = nacional()

  // Esc cancela, sin dejar nada.
  await page.getByRole('button', { name: 'Agregar teléfono' }).click()
  await page.getByLabel('Teléfono extra').fill(casa)
  await page.keyboard.press('Escape')
  await expect(page.getByLabel('Teléfono extra')).toHaveCount(0)
  expect(await extrasDeLead(lead.id)).toEqual([])

  // Enter confirma.
  await page.getByRole('button', { name: 'Agregar teléfono' }).click()
  await page.getByLabel('Teléfono extra').fill(casa)
  await page.getByLabel('Etiqueta (opcional)').fill('Casa')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Teléfono agregado.')).toBeVisible()
  await expect(page.getByText('Casa', { exact: true })).toBeVisible()
  const [agregado] = await extrasDeLead(lead.id)
  expect(agregado).toMatchObject({ telefono: completoCon(t, casa), etiqueta: 'Casa' })
  if (esMovil(page)) {
    await descartarAviso(page, 'Teléfono agregado.')
  }

  // Rotular, también con Enter.
  await page.getByRole('button', { name: 'Rotular' }).click()
  await page.getByLabel('Etiqueta', { exact: true }).fill('Trabajo')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Trabajo', { exact: true })).toBeVisible()
  expect((await extrasDeLead(lead.id))[0]?.etiqueta).toBe('Trabajo')

  // Quitar, y «Deshacer» lo vuelve con el mismo id y la misma etiqueta.
  await page.getByRole('button', { name: 'Quitar' }).click()
  await expect(page.getByText('Teléfono quitado.')).toBeVisible()
  expect(await extrasDeLead(lead.id)).toEqual([])
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.getByText('Teléfono restituido.')).toBeVisible()
  expect(await extrasDeLead(lead.id)).toEqual([{ ...agregado, etiqueta: 'Trabajo' }])
  expect(await versionDe(lead.id)).toBe(version)
  expect(await constanciasDe(lead.id, 'lead.telefono_extra_quitado')).toBe(1)
})

test('un extra repetido, igual al principal o con una etiqueta larga se dice junto al campo', async ({
  page,
}, info) => {
  const lead = await fichaDeBerta(t, page, `Reglas ${info.project.name}`)
  const repetido = nacional()
  await ponerExtras(lead.id, [{ telefono: completoCon(t, repetido), etiqueta: null }])
  await irAFicha(page, lead.id)
  await page.getByRole('button', { name: 'Agregar teléfono' }).click()
  const telefono = page.getByLabel('Teléfono extra')
  await telefono.fill(repetido)
  await page.keyboard.press('Enter')
  await expect(page.getByText('Ese número ya está en este lead.')).toBeVisible()
  await telefono.fill(lead.nac)
  await page.keyboard.press('Enter')
  await expect(page.getByText('Ese número ya está en este lead.')).toBeVisible()
  await telefono.fill(nacional())
  await page.getByLabel('Etiqueta (opcional)').fill('x'.repeat(41))
  await page.keyboard.press('Enter')
  await expect(page.getByText(/La etiqueta admite hasta 40 caracteres/)).toBeVisible()
  expect(await extrasDeLead(lead.id)).toHaveLength(1)
})

test('con 10 extras no se agrega otro, y la ficha lo dice', async ({ page }, info) => {
  const lead = await fichaDeBerta(t, page, `Tope ${info.project.name}`)
  await ponerExtras(
    lead.id,
    Array.from({ length: 10 }, () => ({ telefono: completoCon(t, nacional()), etiqueta: null })),
  )
  await irAFicha(page, lead.id)
  await expect(page.getByRole('button', { name: 'Agregar teléfono' })).toBeDisabled()
  await expect(page.getByText(/hasta 10 teléfonos extra/)).toBeVisible()
})

test('la dueña con «todos» y sin cartera no ve ninguna acción y la base la rechaza', async ({
  page,
}, info) => {
  const ajeno = await nuevoLead({
    corto: `Sin cartera ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.carlos,
  })
  await ponerExtras(ajeno.id, [{ telefono: completoCon(t, nacional()), etiqueta: 'Casa' }])
  await entrar(page, t.personas.duena)
  await irAFicha(page, ajeno.id)
  await expect(tituloDeLaFicha(page, ajeno.nombre)).toBeVisible()
  await expect(page.getByText('Completo solo para su cartera.')).toBeVisible()
  await expect(botonCambiar(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Agregar teléfono' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Quitar' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Rotular' })).toHaveCount(0)
  // La URL del panel no abre nada.
  await irAFicha(page, ajeno.id, '?panel=cambiar-telefono')
  await expect(tituloDeLaFicha(page, ajeno.nombre)).toBeVisible()
  await expect(panelDeTelefono(page)).toHaveCount(0)

  // Llamada a mano con su sesión: la RPC la rechaza.
  const sesion = await sesionDe(t.personas.duena, CONTRASENA)
  const version = await versionDe(ajeno.id)
  const { error } = await sesion.rpc('cambiar_telefono_lead', {
    p_lead: ajeno.id,
    p_actualizado_en_esperado: version,
    p_cc: '',
    p_tel: nacional(),
  })
  expect(error?.code).toBe('42501')
  const { error: errorDeExtra } = await sesion.rpc('lead_telefono_guardar', {
    p_lead: ajeno.id,
    p_id: crypto.randomUUID(),
    p_cc: '',
    p_tel: nacional(),
  })
  expect(errorDeExtra?.code).toBe('42501')
  expect(await telefonoDeLead(ajeno.id)).toBe(ajeno.telefono)
  expect(await extrasDeLead(ajeno.id)).toHaveLength(1)
})
