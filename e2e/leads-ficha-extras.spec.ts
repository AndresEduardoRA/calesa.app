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
import {
  abrirAgregarTelefono,
  botonAgregarTelefono,
  cabeEnLaPantalla,
  completoCon,
  fichaDeBerta,
  modalDeExtra,
  nacional,
} from './soporte/leads-ficha-telefonos'

// Los teléfonos extra de la ficha: agregar (un modal con su URL, `?panel=agregar-telefono`), rotular
// y quitar en la fila, «Deshacer», sus reglas junto al campo, el tope de 10 y lo que ve (y no puede)
// quien no tiene el lead en su cartera.
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

  // Esc sin nada escrito cierra; con algo escrito pregunta en el mismo modal, y un segundo Esc vuelve.
  let modal = await abrirAgregarTelefono(page)
  await expect(page).toHaveURL(/panel=agregar-telefono/)
  await page.keyboard.press('Escape')
  await expect(modal).toHaveCount(0)
  await expect(botonAgregarTelefono(page)).toBeFocused()
  modal = await abrirAgregarTelefono(page)
  await modal.getByLabel('Teléfono extra').fill(casa)
  await page.keyboard.press('Escape')
  await expect(modal.getByText('Tienes cambios sin guardar.')).toBeVisible()
  await expect(modal.getByRole('button', { name: 'Seguir editando' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(modal.getByLabel('Teléfono extra')).toHaveValue(casa)
  await modal.getByRole('button', { name: 'Cancelar' }).click()
  await modal.getByRole('button', { name: 'Descartar' }).click()
  await expect(modal).toHaveCount(0)
  await expect(page).not.toHaveURL(/panel=/)
  expect(await extrasDeLead(lead.id)).toEqual([])

  // Cada apertura empieza vacía; Enter confirma, cierra y devuelve el foco al botón.
  modal = await abrirAgregarTelefono(page)
  await expect(modal.getByLabel('Teléfono extra')).toHaveValue('')
  if (esMovil(page)) {
    await cabeEnLaPantalla(page, modal)
  }
  await modal.getByLabel('Teléfono extra').fill(casa)
  await modal.getByLabel('Etiqueta (opcional)').fill('Casa')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Teléfono agregado.')).toBeVisible()
  await expect(modal).toHaveCount(0)
  await expect(botonAgregarTelefono(page)).toBeFocused()
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

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('un extra repetido, igual al principal o con una etiqueta larga se dice junto al campo', async ({
  page,
}, info) => {
  const lead = await fichaDeBerta(t, page, `Reglas ${info.project.name}`)
  const repetido = nacional()
  await ponerExtras(lead.id, [{ telefono: completoCon(t, repetido), etiqueta: null }])
  await irAFicha(page, lead.id)
  const modal = await abrirAgregarTelefono(page)
  const telefono = modal.getByLabel('Teléfono extra')
  await telefono.fill(repetido)
  await page.keyboard.press('Enter')
  await expect(modal.getByText('Ese número ya está en este lead.')).toBeVisible()
  // El motivo no cierra ni borra: lo escrito sigue ahí.
  await expect(telefono).toHaveValue(repetido)
  await telefono.fill(lead.nac)
  await page.keyboard.press('Enter')
  await expect(modal.getByText('Ese número ya está en este lead.')).toBeVisible()
  await telefono.fill(nacional())
  await modal.getByLabel('Etiqueta (opcional)').fill('x'.repeat(41))
  await page.keyboard.press('Enter')
  await expect(modal.getByText(/La etiqueta admite hasta 40 caracteres/)).toBeVisible()
  expect(await extrasDeLead(lead.id)).toHaveLength(1)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('con 10 extras no se agrega otro, y la ficha lo dice', async ({ page }, info) => {
  const lead = await fichaDeBerta(t, page, `Tope ${info.project.name}`)
  await ponerExtras(
    lead.id,
    Array.from({ length: 10 }, () => ({ telefono: completoCon(t, nacional()), etiqueta: null })),
  )
  await irAFicha(page, lead.id)
  await expect(botonAgregarTelefono(page)).toBeDisabled()
  await expect(page.getByText(/hasta 10 teléfonos extra/)).toBeVisible()
  // Escribir la URL a mano tampoco lo abre.
  await irAFicha(page, lead.id, '?panel=agregar-telefono')
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
  await expect(modalDeExtra(page)).toHaveCount(0)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('el modal vive en la URL: recargar lo reabre y «atrás» lo cierra', async ({ page }, info) => {
  const lead = await fichaDeBerta(t, page, `URL ${info.project.name}`)
  await abrirAgregarTelefono(page)
  await page.reload()
  await expect(modalDeExtra(page).getByLabel('Teléfono extra')).toBeVisible()
  await page.goBack()
  await expect(modalDeExtra(page)).toHaveCount(0)
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('sin conexión lo escrito queda y se agrega solo al volver, una vez; un doble clic agrega uno', async ({
  page,
}, info) => {
  const lead = await fichaDeBerta(t, page, `Sin red ${info.project.name}`)
  const numero = nacional()
  let modal = await abrirAgregarTelefono(page)
  await modal.getByLabel('Teléfono extra').fill(numero)
  await page.context().setOffline(true)
  await modal.getByRole('button', { name: 'Agregar', exact: true }).click()
  await expect(modal.getByText(/se va a guardar solo cuando vuelva/)).toBeVisible()
  await expect(modal.getByLabel('Teléfono extra')).toHaveValue(numero)
  expect(await extrasDeLead(lead.id)).toEqual([])
  await page.context().setOffline(false)
  await expect(page.getByText('Teléfono agregado.')).toBeVisible()
  await expect(modal).toHaveCount(0)
  expect(await extrasDeLead(lead.id)).toHaveLength(1)

  modal = await abrirAgregarTelefono(page)
  await modal.getByLabel('Teléfono extra').fill(nacional())
  await modal.getByRole('button', { name: 'Agregar', exact: true }).dblclick()
  await expect(modal).toHaveCount(0)
  expect(await extrasDeLead(lead.id)).toHaveLength(2)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
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
  await expect(botonAgregarTelefono(page)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Quitar' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Rotular' })).toHaveCount(0)
  // La URL del panel no abre nada.
  await irAFicha(page, ajeno.id, '?panel=cambiar-telefono')
  await expect(tituloDeLaFicha(page, ajeno.nombre)).toBeVisible()
  await expect(panelDeTelefono(page)).toHaveCount(0)
  await irAFicha(page, ajeno.id, '?panel=agregar-telefono')
  await expect(tituloDeLaFicha(page, ajeno.nombre)).toBeVisible()
  await expect(modalDeExtra(page)).toHaveCount(0)

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
