import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { otraPersona } from './soporte/inventario'
import { exigir } from './soporte/leads'
import { idDePersona } from './soporte/leads-alta'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import { nuevoLead, revocarCartera } from './soporte/leads-ficha'
import { cabeEnLaPantalla, completoCon, nacional } from './soporte/leads-ficha-telefonos'
import {
  abrirAnotar,
  abrirEdicionDeSeguimiento,
  compartirCon,
  irASeguimientos,
  modalDeSeguimiento,
  seguimiento,
  seguimientosEnLaBase,
} from './soporte/leads-seguimientos'

// El modal de «Anotar seguimiento» y «Editar» (`?panel=anotar-seguimiento`,
// `?panel=editar-seguimiento&seguimiento=<id>`): Esc sin cambios y el foco de vuelta, sin conexión,
// un id que no está o es de otra persona, sin tipos activos, el lead que deja de verse con el modal
// abierto, la URL sin la cartera y el celular. Anotar con formato, el conflicto, el borrador con
// recargar y «atrás» están en `leads-seguimientos.spec.ts`.
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

test('Esc sin cambios cierra y el foco vuelve a quien lo abrió; el teclado recorre los campos y el pie', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Seg Modal Esc ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irASeguimientos(page, lead.id)
  const modal = await abrirAnotar(page)
  await expect(page).toHaveURL(/panel=anotar-seguimiento/)
  await page.keyboard.press('Escape')
  await expect(modal).toHaveCount(0)
  await expect(page).not.toHaveURL(/panel=/)
  await expect(page.getByRole('button', { name: 'Anotar seguimiento' })).toBeFocused()

  // Del resumen, Tab llega al editor y, al final del modal, «Cancelar» y «Guardar».
  const otra = await abrirAnotar(page)
  await otra.getByLabel('Resumen').fill('Por teclado')
  await page.keyboard.press('Tab')
  // La barra del editor es una sola parada de Tab, antes del texto.
  await expect(otra.locator('[role="toolbar"] :focus, [contenteditable="true"]:focus')).toHaveCount(
    1,
  )
  await otra.getByRole('button', { name: 'Cancelar' }).focus()
  await page.keyboard.press('Tab')
  await expect(otra.getByRole('button', { name: 'Guardar' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(seguimiento(page, 'Por teclado')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Anotar seguimiento' })).toBeFocused()

  // Editar devuelve el foco a su «Editar».
  const edicion = await abrirEdicionDeSeguimiento(page, 'Por teclado')
  await page.keyboard.press('Escape')
  await expect(edicion).toHaveCount(0)
  await expect(
    seguimiento(page, 'Por teclado').getByRole('button', { name: 'Editar' }),
  ).toBeFocused()
})

test('sin conexión lo escrito queda y sale solo al volver, una vez', async ({ page }, info) => {
  const lead = await leadDeBerta(`Seg Modal Red ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irASeguimientos(page, lead.id)
  const modal = await abrirAnotar(page)
  await modal.getByLabel('Resumen').fill('Cuando vuelva la red')
  await page.context().setOffline(true)
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(modal.getByText(/se va a guardar solo cuando vuelva/)).toBeVisible()
  await expect(modal.getByLabel('Resumen')).toHaveValue('Cuando vuelva la red')
  await page.context().setOffline(false)
  await expect(seguimiento(page, 'Cuando vuelva la red')).toBeVisible()
  await expect(modal).toHaveCount(0)
  expect(await seguimientosEnLaBase(lead.id)).toHaveLength(1)
})

test('un id que no está, o de otra persona, no abre y lo dice igual', async ({
  page,
  browser,
}, info) => {
  const lead = await leadDeBerta(`Seg Modal Id ${info.project.name}`)
  const [berta, carlos] = await Promise.all([
    idDePersona(t.personas.berta),
    idDePersona(t.personas.carlos),
  ])
  await compartirCon(lead.id, carlos, berta)
  await entrar(page, t.personas.berta)
  await irASeguimientos(page, lead.id)
  const modal = await abrirAnotar(page)
  await modal.getByLabel('Resumen').fill('De Berta')
  await modal.getByRole('switch', { name: 'Visible para el cliente' }).click()
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(seguimiento(page, 'De Berta')).toBeVisible()
  const [suyo] = await seguimientosEnLaBase(lead.id)

  await irASeguimientos(
    page,
    lead.id,
    '&panel=editar-seguimiento&seguimiento=00000000-0000-4000-8000-000000000000',
  )
  await expect(page.getByText('No encontramos este seguimiento o no tienes acceso.')).toBeVisible()
  await expect(modalDeSeguimiento(page, 'Editar')).toHaveCount(0)
  await expect(page).not.toHaveURL(/panel=/)

  // Carlos lo ve (es visible), pero no es suyo: el mismo aviso.
  const otra = await otraPersona(browser, page)
  await entrar(otra, t.personas.carlos)
  await irASeguimientos(otra, lead.id, `&panel=editar-seguimiento&seguimiento=${suyo?.id ?? ''}`)
  await expect(otra.getByText('No encontramos este seguimiento o no tienes acceso.')).toBeVisible()
  await expect(modalDeSeguimiento(otra, 'Editar')).toHaveCount(0)
  await otra.context().close()
})

test('sin tipos activos el botón se apaga y dice por qué, y la URL no abre el formulario', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Seg Modal Tipos ${info.project.name}`)
  const { data, error } = await admin()
    .from('tipos_seguimiento')
    .update({ activo: false })
    .eq('activo', true)
    .select('id')
  exigir(error, 'apagar los tipos')
  const apagados = (data ?? []).map((tipo) => tipo.id)
  try {
    await entrar(page, t.personas.berta)
    await irASeguimientos(page, lead.id)
    const boton = page.getByRole('button', { name: 'Anotar seguimiento' })
    await expect(boton).toBeDisabled()
    await expect(boton).toHaveAccessibleDescription('No hay tipos de seguimiento activos.')
    await irASeguimientos(page, lead.id, '&panel=anotar-seguimiento')
    await expect(page.getByText('No hay tipos de seguimiento activos.').first()).toBeVisible()
    await expect(modalDeSeguimiento(page, 'Anotar')).toHaveCount(0)
  } finally {
    const { error: alEncender } = await admin()
      .from('tipos_seguimiento')
      .update({ activo: true })
      .in('id', apagados)
    exigir(alEncender, 'encender los tipos')
  }
})

test('el lead que deja de verse con el modal abierto: lo dice adentro y lo escrito queda', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Seg Modal Acceso ${info.project.name}`)
  const [berta, carlos] = await Promise.all([
    idDePersona(t.personas.berta),
    idDePersona(t.personas.carlos),
  ])
  await compartirCon(lead.id, carlos, berta)
  await entrar(page, t.personas.carlos)
  await irASeguimientos(page, lead.id)
  const modal = await abrirAnotar(page)
  await modal.getByLabel('Resumen').fill('Lo escribí antes de que me lo quitaran')
  await revocarCartera(lead.id, carlos)
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(
    modal.getByText('No encontramos este lead o no tienes acceso. Lo que escribiste no se guardó.'),
  ).toBeVisible()
  await expect(modal.getByLabel('Resumen')).toHaveValue('Lo escribí antes de que me lo quitaran')
  await expect(modal.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  expect(await seguimientosEnLaBase(lead.id)).toEqual([])
})

test('sin la cartera no hay «Anotar» y la URL no lo abre', async ({ page }, info) => {
  const lead = await leadDeBerta(`Seg Modal Sin ${info.project.name}`)
  await entrar(page, t.personas.duena)
  await irASeguimientos(page, lead.id, '&panel=anotar-seguimiento')
  await expect(page.getByRole('button', { name: 'Anotar seguimiento' })).toHaveCount(0)
  await expect(modalDeSeguimiento(page, 'Anotar')).toHaveCount(0)
})

test('en el celular el modal con el editor cabe, se desplaza y el pie se ve', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'movil', 'Sólo en el celular.')
  const lead = await leadDeBerta(`Seg Modal Movil ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irASeguimientos(page, lead.id)
  const modal = await abrirAnotar(page)
  await modal.getByRole('button', { name: 'Programar próximo contacto' }).click()
  await cabeEnLaPantalla(page, modal)
  const guardar = modal.getByRole('button', { name: 'Guardar' })
  await expect(guardar).toBeInViewport()
  await modal.getByRole('button', { name: 'Mañana 09:00' }).scrollIntoViewIfNeeded()
  await expect(modal.getByRole('button', { name: 'Mañana 09:00' })).toBeInViewport()
  await expect(guardar).toBeInViewport()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBe(0)
})
