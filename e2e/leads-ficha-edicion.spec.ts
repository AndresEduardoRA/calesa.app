import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { bloque, esMovil, otraPersona } from './soporte/inventario'
import { exigir } from './soporte/leads'
import { idDePersona, sesionDe, telefonoAlAzar } from './soporte/leads-alta'
import {
  activarCampo,
  limpiarListado,
  nombre,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { compartirCon } from './soporte/leads-seguimientos'
import { tipoDeFabrica } from './soporte/tipos-de-lead'
import {
  NO_DISPONIBLE,
  abrirEdicion,
  alGuardarFicha,
  botonEditar,
  cuerpoDeAccion,
  edicionesRegistradas,
  irAFicha,
  leadEnLaBase,
  meterSeguimiento,
  nuevoLead,
  revocarCartera,
  tituloDeLaFicha,
  versionDe,
} from './soporte/leads-ficha'

// Editar la ficha de un lead (`?panel=editar-lead`) contra la app compilada y el Supabase local:
// sólo viaja lo que cambió, dos personas que editan, el borrador, la conexión que se cae, un
// requerido que se sumó después y lo que está desactivado.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

const telefono = () => `${t.codigo}${telefonoAlAzar()}`

// Un lead de Berta para este test, y a su ficha como ella.
async function fichaDeBerta(page: Page, corto: string, atributos?: Record<string, unknown>) {
  const lead = await nuevoLead({
    corto,
    telefono: telefono(),
    deQuien: t.personas.berta,
    ...(atributos ? { atributos } : {}),
  })
  await entrar(page, t.personas.berta)
  await irAFicha(page, lead.id)
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
  return lead
}

async function abrirOtros(panel: Locator) {
  const encabezado = bloque(panel, 'Otros datos')
  if ((await encabezado.locator('xpath=..').getAttribute('open')) === null) {
    await encabezado.click()
  }
}

test('edita los fijos y un dato propio, y sólo viaja lo que cambió', async ({ page }, info) => {
  const corto = `Edita ${info.project.name}`
  const lead = await fichaDeBerta(page, corto, { e2e_color: 'rojo' })
  const panel = await abrirEdicion(page)
  // En el celular el panel ocupa toda la pantalla y «Guardar» queda siempre a la vista.
  if (esMovil(page)) {
    expect((await panel.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(
      (page.viewportSize()?.width ?? 0) - 1,
    )
    await expect(page.getByRole('button', { name: 'Guardar', exact: true })).toBeInViewport()
  }
  const nuevoNombre = nombre(`${corto} editado`)
  await panel.getByLabel('Nombre').fill(nuevoNombre)
  await panel.getByLabel('Tipo').selectOption({ label: 'Cliente' })
  await abrirOtros(panel)
  await panel.getByLabel('Color E2E').fill('verde')

  const peticion = alGuardarFicha(page)
  await page.keyboard.press('Control+s')
  const cuerpo = cuerpoDeAccion((await peticion).postData())
  expect(cuerpo.id).toBe(lead.id)
  expect(Object.keys(cuerpo.cambios).sort()).toEqual(['atributos', 'nombre', 'tipoLeadId'])
  expect(cuerpo.cambios['atributos']).toEqual({ e2e_color: 'verde' })

  await expect(page.getByText('Cambios guardados')).toBeVisible()
  await expect(panel).toBeHidden()
  await expect(tituloDeLaFicha(page, nuevoNombre)).toBeVisible()
  const guardado = await leadEnLaBase(lead.id)
  expect(guardado).toMatchObject({
    nombre: nuevoNombre,
    tipo_lead_id: (await tipoDeFabrica('cliente')).id,
  })
  expect(guardado.atributos['e2e_color']).toBe('verde')
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('guardar sin cambiar nada cierra y no mueve la versión', async ({ page }, info) => {
  const lead = await fichaDeBerta(page, `SinCambios ${info.project.name}`)
  const antes = await versionDe(lead.id)
  const panel = await abrirEdicion(page)
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(panel).toBeHidden()
  expect(await versionDe(lead.id)).toBe(antes)
})

test('dos personas editan: la segunda ve de quién es el cambio y conserva lo que tipeó', async ({
  page,
  browser,
}, info) => {
  const lead = await fichaDeBerta(page, `Conflicto ${info.project.name}`, { e2e_color: 'rojo' })
  const panel = await abrirEdicion(page)
  await panel.getByLabel('Nombre').fill(nombre(`Conflicto de Berta ${info.project.name}`))

  // La dueña lo tiene compartido (editar pide la cartera), lo edita y guarda primero.
  await compartirCon(
    lead.id,
    await idDePersona(t.personas.duena),
    await idDePersona(t.personas.berta),
  )
  const otra = await otraPersona(browser, page)
  await entrar(otra, t.personas.duena)
  await irAFicha(otra, lead.id)
  const panelDeOtra = await abrirEdicion(otra)
  await panelDeOtra.getByLabel('Nombre').fill(nombre(`Conflicto de la dueña ${info.project.name}`))
  await otra.keyboard.press('Control+s')
  await expect(otra.getByText('Cambios guardados')).toBeVisible()

  // Berta guarda con la versión vieja.
  await panel.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(panel.getByText(/Dalia Alta cambió este lead/)).toBeVisible()
  await expect(panel.getByText('No se guardó nada.')).toBeVisible()
  // Lo que tipeó sigue ahí, y la base conserva lo de la dueña.
  await expect(panel.getByLabel('Nombre')).toHaveValue(
    nombre(`Conflicto de Berta ${info.project.name}`),
  )
  expect((await leadEnLaBase(lead.id)).nombre).toBe(
    nombre(`Conflicto de la dueña ${info.project.name}`),
  )
  // «Recargar» trae la versión de la dueña y descarta lo de Berta.
  await panel.getByRole('button', { name: 'Recargar' }).click()
  await expect(panel.getByLabel('Nombre')).toHaveValue(
    nombre(`Conflicto de la dueña ${info.project.name}`),
  )
  await otra.context().close()
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('un seguimiento que entra mientras se edita no da conflicto', async ({ page }, info) => {
  const lead = await fichaDeBerta(page, `Seguimiento ${info.project.name}`)
  const panel = await abrirEdicion(page)
  await panel.getByLabel('Nombre').fill(nombre(`Seguimiento editado ${info.project.name}`))
  const antes = await versionDe(lead.id)
  await meterSeguimiento(lead.id, await idDePersona(t.personas.berta))
  expect(await versionDe(lead.id)).toBe(antes)

  await panel.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText('Cambios guardados')).toBeVisible()
  await expect(panel.getByText(/cambió este lead/)).toHaveCount(0)
  expect((await leadEnLaBase(lead.id)).nombre).toBe(
    nombre(`Seguimiento editado ${info.project.name}`),
  )
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('un requerido nuevo vacío en un lead viejo se marca antes de guardar, con el foco', async ({
  page,
}, info) => {
  const lead = await fichaDeBerta(page, `Requerido ${info.project.name}`)
  const { error } = await admin()
    .from('leads_campos')
    .update({ requerido: true })
    .eq('clave', 'e2e_color')
  exigir(error, 'volver requerido el color')
  try {
    await irAFicha(page, lead.id)
    const panel = await abrirEdicion(page)
    // Lo único que se cambia es el tipo.
    await panel.getByLabel('Tipo').selectOption({ label: 'Cliente' })
    await page.getByRole('button', { name: 'Guardar', exact: true }).click()
    const campo = panel.getByLabel('Color E2E')
    await expect(campo).toBeVisible()
    await expect(campo).toBeFocused()
    await expect(campo).toHaveAttribute('aria-invalid', 'true')
    expect((await leadEnLaBase(lead.id)).tipo_lead_id).toBe((await tipoDeFabrica('prospecto')).id)
    await campo.fill('amarillo')
    await page.getByRole('button', { name: 'Guardar', exact: true }).click()
    await expect(page.getByText('Cambios guardados')).toBeVisible()
    expect(await leadEnLaBase(lead.id)).toMatchObject({
      tipo_lead_id: (await tipoDeFabrica('cliente')).id,
    })
  } finally {
    await admin().from('leads_campos').update({ requerido: false }).eq('clave', 'e2e_color')
  }
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('un origen y un campo desactivados con dato se conservan', async ({ page }, info) => {
  const { data: origen, error } = await admin()
    .from('origenes_lead')
    .insert({ clave: `e2e_apagado_${info.project.name}`, nombre: 'Apagado E2E', activo: true })
    .select('id')
    .single<{ id: string }>()
  exigir(error, 'crear un origen')
  const lead = await fichaDeBerta(page, `Apagados ${info.project.name}`, { e2e_color: 'violeta' })
  try {
    await admin()
      .from('leads')
      .update({ origen_lead_id: origen?.id ?? '' })
      .eq('id', lead.id)
    await admin()
      .from('origenes_lead')
      .update({ activo: false })
      .eq('id', origen?.id ?? '')
    await activarCampo('e2e_color', false)
    await irAFicha(page, lead.id)
    // El origen apagado se nombra, marcado; el campo apagado no se muestra.
    await expect(page.getByText('Apagado E2E (inactivo)').first()).toBeVisible()
    await expect(page.getByText('violeta')).toHaveCount(0)

    const panel = await abrirEdicion(page)
    await expect(panel.getByLabel('Origen del lead')).toHaveValue(origen?.id ?? '')
    await expect(panel.getByLabel('Color E2E')).toHaveCount(0)
    await panel.getByLabel('Nombre').fill(nombre(`Apagados editado ${info.project.name}`))
    await page.getByRole('button', { name: 'Guardar', exact: true }).click()
    await expect(page.getByText('Cambios guardados')).toBeVisible()
    const guardado = await leadEnLaBase(lead.id)
    expect(guardado.origen_lead_id).toBe(origen?.id)
    expect(guardado.atributos['e2e_color']).toBe('violeta')
  } finally {
    await activarCampo('e2e_color', true)
    await admin().from('leads').update({ origen_lead_id: null }).eq('id', lead.id)
    await admin()
      .from('origenes_lead')
      .delete()
      .eq('id', origen?.id ?? '')
  }
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('cerrar con cambios sin guardar los conserva como borrador', async ({ page }, info) => {
  await fichaDeBerta(page, `Borrador ${info.project.name}`)
  const panel = await abrirEdicion(page)
  const escrito = nombre(`Borrador escrito ${info.project.name}`)
  await panel.getByLabel('Nombre').fill(escrito)
  await panel.getByRole('button', { name: 'Cancelar' }).click()
  await expect(panel).toBeHidden()
  const reabierto = await abrirEdicion(page)
  await expect(page.getByText('Recuperamos lo que habías escrito')).toBeVisible()
  await expect(reabierto.getByLabel('Nombre')).toHaveValue(escrito)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('se cae la conexión al guardar: lo escrito queda y sale una sola vez al volver', async ({
  page,
}, info) => {
  const lead = await fichaDeBerta(page, `SinRed ${info.project.name}`)
  const panel = await abrirEdicion(page)
  const escrito = nombre(`SinRed editado ${info.project.name}`)
  await panel.getByLabel('Nombre').fill(escrito)
  const antes = await edicionesRegistradas(lead.id)

  await page.context().setOffline(true)
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  // «No hay conexión» sale de la red y está antes del clic; el aviso de abajo sale del envío fallido, que es lo que el reintento necesita.
  await expect(panel.getByText(/se va a guardar solo cuando vuelva/)).toBeVisible()
  await expect(panel.getByLabel('Nombre')).toHaveValue(escrito)
  expect((await leadEnLaBase(lead.id)).nombre).toBe(lead.nombre)

  await page.context().setOffline(false)
  await expect(page.getByText('Cambios guardados')).toBeVisible()
  await expect(panel).toBeHidden()
  expect((await leadEnLaBase(lead.id)).nombre).toBe(escrito)
  // Una sola edición registrada: reintentar no duplicó nada.
  expect(await edicionesRegistradas(lead.id)).toBe(antes + 1)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('se revoca el acceso con la ficha abierta: guardar lo dice y la ficha deja de verse', async ({
  page,
}, info) => {
  const lead = await fichaDeBerta(page, `Revocado ${info.project.name}`)
  const panel = await abrirEdicion(page)
  await panel.getByLabel('Nombre').fill(nombre(`Revocado editado ${info.project.name}`))
  // Le quitan el lead (y no queda nadie: pasa al limbo, que para ella es lo mismo que no tenerlo).
  await revocarCartera(lead.id, await idDePersona(t.personas.berta))
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(page.getByText(NO_DISPONIBLE).first()).toBeVisible()
  expect((await leadEnLaBase(lead.id)).nombre).toBe(lead.nombre)
})

// @sin-celular: igual en pasos y elementos en escritorio y celular, y su JS del celular lo ejecuta otra prueba que se queda (scripts/comparar-anchos.mjs, 5a-fix-3)
test('la dueña con «todos» ve lo ajeno y no lo edita: sin botón, sin panel y la base lo rechaza', async ({
  page,
}, info) => {
  const lead = await nuevoLead({
    corto: `Ajeno no editable ${info.project.name}`,
    telefono: telefono(),
    deQuien: t.personas.carlos,
    atributos: { e2e_ci: 'CI-PRIVADA-5566', e2e_color: 'gris' },
  })
  await entrar(page, t.personas.duena)
  await irAFicha(page, lead.id)
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
  // Editar es contenido: pide la cartera, y «todos» no basta. No hay botón y la URL no abre nada.
  await expect(botonEditar(page)).toHaveCount(0)
  await irAFicha(page, lead.id, '?panel=editar-lead')
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(await page.content()).not.toContain('CI-PRIVADA-5566')
  // Y la base, llamada a mano con su sesión, responde lo mismo que a quien no ve el lead.
  const sesion = await sesionDe(t.personas.duena, CONTRASENA)
  const { error } = await sesion.rpc('lead_guardar', {
    p_lead: lead.id,
    p_actualizado_en_esperado: await versionDe(lead.id),
    p_cambios: { nombre: 'Intruso' },
  })
  expect(error?.code).toBe('42501')
  expect(error?.message).toBe('No encontramos este lead o no tienes acceso.')
  const guardado = await leadEnLaBase(lead.id)
  expect(guardado.nombre).toBe(lead.nombre)
  expect(guardado.atributos).toMatchObject({ e2e_color: 'gris', e2e_ci: 'CI-PRIVADA-5566' })
})
