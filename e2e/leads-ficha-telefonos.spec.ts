import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { esMovil, otraPersona } from './soporte/inventario'
import { idDePersona, mandarAlLimbo } from './soporte/leads-alta'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import {
  NO_DISPONIBLE,
  abrirCambioDeTelefono,
  abrirEdicion,
  botonCambiar,
  constanciasDe,
  extrasDeLead,
  irAFicha,
  nuevoLead,
  panelDeEdicion,
  ponerExtras,
  revocarCartera,
  telefonoDeLead,
  versionDe,
} from './soporte/leads-ficha'
import { completoCon, fichaDeBerta, nacional } from './soporte/leads-ficha-telefonos'

// Cambiar el teléfono principal (`?panel=cambiar-telefono`) contra la app compilada y el Supabase
// local: lo que dice la base de un número, el anterior que queda como «Anterior», el conflicto con
// otra ventana, la conexión que se cae y el acceso que se revoca.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

test('cambia a un número libre: el anterior queda «Anterior» y la versión se mueve', async ({
  page,
}, info) => {
  const lead = await fichaDeBerta(t, page, `Cambia ${info.project.name}`)
  const antes = await versionDe(lead.id)
  const panel = await abrirCambioDeTelefono(page)
  const campo = panel.getByLabel('Teléfono nuevo')
  await expect(campo).toHaveAttribute('inputmode', 'tel')
  // En el celular es una hoja inferior, pegada al borde de abajo.
  if (esMovil(page)) {
    const caja = await panel.boundingBox()
    const alto = page.viewportSize()?.height ?? 0
    expect((caja?.y ?? 0) + (caja?.height ?? 0)).toBeGreaterThan(alto - 2)
  }
  const nuevo = nacional()
  await campo.fill(nuevo)
  await expect(panel.getByText(/Se guardará como \+/)).toBeVisible()
  await panel.getByRole('button', { name: 'Cambiar teléfono' }).click()

  await expect(page.getByText(/Teléfono principal cambiado/)).toBeVisible()
  await expect(panel).toBeHidden()
  expect(await telefonoDeLead(lead.id)).toBe(completoCon(t, nuevo))
  expect(await versionDe(lead.id)).not.toBe(antes)
  expect(await extrasDeLead(lead.id)).toMatchObject([
    { telefono: completoCon(t, lead.nac), etiqueta: 'Anterior' },
  ])
  // La ficha ya muestra el nuevo principal y el anterior con su etiqueta.
  await expect(page.getByText('Anterior', { exact: true })).toBeVisible()
  await expect(page.getByText(new RegExp(`${nuevo}$`)).first()).toBeVisible()
  expect(await constanciasDe(lead.id, 'lead.telefono_cambiado')).toBe(1)
})

test('un número que ya existe se dice junto al campo (mío, de otro, en limbo) y no cambia nada', async ({
  page,
}, info) => {
  const lead = await fichaDeBerta(t, page, `Existe ${info.project.name}`)
  const mio = await nuevoLead({
    corto: `Existe mío ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
  })
  const deOtro = await nuevoLead({
    corto: `Existe de otro ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.carlos,
  })
  const enLimbo = await nuevoLead({
    corto: `Existe limbo ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.carlos,
  })
  await mandarAlLimbo(enLimbo.id)
  const antes = await versionDe(lead.id)
  const panel = await abrirCambioDeTelefono(page)
  const campo = panel.getByLabel('Teléfono nuevo')
  const enviar = panel.getByRole('button', { name: 'Cambiar teléfono' })

  await campo.fill(mio.telefono.slice(t.codigo.length))
  await expect(panel.getByText(/Ya existe: .* y es tuyo\./)).toBeVisible()
  await expect(enviar).toBeDisabled()
  await campo.fill(deOtro.telefono.slice(t.codigo.length))
  await expect(panel.getByText(/Lo tiene Carlos Alta Prueba\./)).toBeVisible()
  await expect(enviar).toBeDisabled()
  await campo.fill(enLimbo.telefono.slice(t.codigo.length))
  await expect(panel.getByText(/Ya existe, sin dueño/)).toBeVisible()
  await expect(enviar).toBeDisabled()

  expect(await telefonoDeLead(lead.id)).toBe(completoCon(t, lead.nac))
  expect(await versionDe(lead.id)).toBe(antes)
  expect(await extrasDeLead(lead.id)).toEqual([])
})

test('el mismo número, uno que no es un teléfono y uno de otro país', async ({ page }, info) => {
  const lead = await fichaDeBerta(t, page, `Formas ${info.project.name}`)
  const panel = await abrirCambioDeTelefono(page)
  const campo = panel.getByLabel('Teléfono nuevo')
  const enviar = panel.getByRole('button', { name: 'Cambiar teléfono' })

  await campo.fill(lead.nac)
  await expect(panel.getByText('Ese es el teléfono principal de este lead.')).toBeVisible()
  await expect(enviar).toBeDisabled()

  await campo.fill('71abc')
  await campo.blur()
  await expect(panel.getByText(/sólo lleva números/)).toBeVisible()
  await expect(enviar).toBeDisabled()

  await campo.fill('+54 9 11 5555 1234')
  await expect(enviar).toBeEnabled()
  await enviar.click()
  await expect(page.getByText(/Teléfono principal cambiado/)).toBeVisible()
  expect(await telefonoDeLead(lead.id)).toBe('5491155551234')
})

test('un extra de otro lead avisa sin bloquear', async ({ page }, info) => {
  const lead = await fichaDeBerta(t, page, `Alterno ${info.project.name}`)
  const otro = await nuevoLead({
    corto: `Alterno de otro ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.carlos,
  })
  const extra = nacional()
  await ponerExtras(otro.id, [{ telefono: completoCon(t, extra), etiqueta: 'Casa' }])
  const panel = await abrirCambioDeTelefono(page)
  await panel.getByLabel('Teléfono nuevo').fill(extra)
  await expect(
    panel.getByText(/Figura como teléfono extra de un lead de Carlos Alta Prueba/),
  ).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Cambiar teléfono' })).toBeEnabled()
  await panel.getByRole('button', { name: 'Cambiar teléfono' }).click()
  await expect(page.getByText(/Teléfono principal cambiado/)).toBeVisible()
  expect(await telefonoDeLead(lead.id)).toBe(completoCon(t, extra))
})

test('con la edición abierta «Cambiar» está deshabilitado y dice por qué', async ({
  page,
}, info) => {
  const lead = await fichaDeBerta(t, page, `Edicion ${info.project.name}`)
  await abrirEdicion(page)
  const boton = page.getByRole('button', { name: 'Cambiar', exact: true, includeHidden: true })
  await expect(boton).toBeDisabled()
  await expect(
    page.getByText('Termina o cierra la edición para cambiarlo.', { exact: true }),
  ).toHaveCount(1)
  // Cerrada la edición, vuelve; y el panel del teléfono no convive con el de edición.
  await panelDeEdicion(page).getByRole('button', { name: 'Cancelar' }).click()
  await expect(botonCambiar(page)).toBeEnabled()
  await abrirCambioDeTelefono(page)
  await expect(panelDeEdicion(page)).toHaveCount(0)
  expect(await telefonoDeLead(lead.id)).toBe(completoCon(t, lead.nac))
})

test('dos ventanas cambian a la vez: el conflicto conserva lo tipeado y «Recargar» sigue', async ({
  page,
  browser,
}, info) => {
  const lead = await fichaDeBerta(t, page, `Conflicto ${info.project.name}`)
  const panel = await abrirCambioDeTelefono(page)
  const mio = nacional()
  await panel.getByLabel('Teléfono nuevo').fill(mio)

  // La otra ventana (la misma persona) cambia primero.
  const otra = await otraPersona(browser, page)
  await entrar(otra, t.personas.berta)
  await irAFicha(otra, lead.id)
  const panelDeOtra = await abrirCambioDeTelefono(otra)
  const suyo = nacional()
  await panelDeOtra.getByLabel('Teléfono nuevo').fill(suyo)
  await panelDeOtra.getByRole('button', { name: 'Cambiar teléfono' }).click()
  await expect(otra.getByText(/Teléfono principal cambiado/)).toBeVisible()

  await panel.getByRole('button', { name: 'Cambiar teléfono' }).click()
  await expect(panel.getByText(/este lead/).first()).toBeVisible()
  await expect(panel.getByText(/No se guardó nada/)).toBeVisible()
  await expect(panel.getByLabel('Teléfono nuevo')).toHaveValue(mio)
  expect(await telefonoDeLead(lead.id)).toBe(completoCon(t, suyo))

  // «Recargar» conserva lo tipeado; ahora sí cambia, desde el principal vigente.
  await panel.getByRole('button', { name: 'Recargar' }).click()
  await expect(panel.getByText(/No se guardó nada/)).toBeHidden()
  await expect(panel.getByLabel('Teléfono nuevo')).toHaveValue(mio)
  await panel.getByRole('button', { name: 'Cambiar teléfono' }).click()
  await expect(page.getByText(/Teléfono principal cambiado/)).toBeVisible()
  expect(await telefonoDeLead(lead.id)).toBe(completoCon(t, mio))
  const anteriores = (await extrasDeLead(lead.id)).map((e) => e.telefono).sort()
  expect(anteriores).toEqual([completoCon(t, lead.nac), completoCon(t, suyo)].sort())
  await otra.context().close()
})

test('se cae la conexión a mitad: lo escrito queda y al volver sale una sola vez', async ({
  page,
}, info) => {
  const lead = await fichaDeBerta(t, page, `SinRed ${info.project.name}`)
  const panel = await abrirCambioDeTelefono(page)
  const nuevo = nacional()
  await panel.getByLabel('Teléfono nuevo').fill(nuevo)
  await expect(panel.getByText(/Se guardará como/)).toBeVisible()

  await page.context().setOffline(true)
  await panel.getByRole('button', { name: 'Cambiar teléfono' }).click()
  await expect(panel.getByText(/No hay conexión/).first()).toBeVisible()
  await expect(panel.getByLabel('Teléfono nuevo')).toHaveValue(nuevo)
  expect(await telefonoDeLead(lead.id)).toBe(completoCon(t, lead.nac))

  await page.context().setOffline(false)
  await expect(page.getByText(/Teléfono principal cambiado/)).toBeVisible()
  expect(await telefonoDeLead(lead.id)).toBe(completoCon(t, nuevo))
  // Un solo «Anterior» y una sola constancia: reintentar no duplicó nada.
  expect(await extrasDeLead(lead.id)).toMatchObject([
    { telefono: completoCon(t, lead.nac), etiqueta: 'Anterior' },
  ])
  expect(await constanciasDe(lead.id, 'lead.telefono_cambiado')).toBe(1)
})

test('se revoca el acceso con el panel abierto: cambiar lo dice y no cambia nada', async ({
  page,
}, info) => {
  const lead = await fichaDeBerta(t, page, `Revocado ${info.project.name}`)
  const panel = await abrirCambioDeTelefono(page)
  await panel.getByLabel('Teléfono nuevo').fill(nacional())
  await revocarCartera(lead.id, await idDePersona(t.personas.berta))
  await panel.getByRole('button', { name: 'Cambiar teléfono' }).click()
  await expect(page.getByText(NO_DISPONIBLE).first()).toBeVisible()
  expect(await telefonoDeLead(lead.id)).toBe(completoCon(t, lead.nac))
})
