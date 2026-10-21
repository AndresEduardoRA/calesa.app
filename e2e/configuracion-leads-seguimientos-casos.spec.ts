import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  admin,
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarLeadsDePrueba, crearLead, idDe } from './soporte/leads'
import { sesionDe, telefonoAlAzar } from './soporte/leads-alta'
import { capturar, crearAsesoraDeLaSemilla, sinScrollHorizontal } from './soporte/recorrido'
import {
  PREFIJO_DE_TIPO_DE_SEGUIMIENTO_E2E,
  abrirTiposDeSeguimiento,
  borrarTiposDeSeguimientoDePrueba,
  elegirDelMenu,
  elegirIcono,
  filaDeTipoDeSeguimiento,
  iconoDeLaFila,
  llenarTiposDeSeguimientoHasta,
  masAccionesDe,
  modalDeTipoDeSeguimiento,
  sembrarTipoDeSeguimiento,
  tipoDeSeguimientoEnLaBase,
} from './soporte/tipos-de-seguimiento'
import {
  cicloDeUnaConfirmacion,
  dobleClicManda,
  noAbre,
  sinRedNoConfirma,
} from './soporte/confirmar-por-url'

// Los casos no felices de Configuración › Leads › Tipos de seguimiento: nombre vacío, repetido (con otras mayúsculas) o largo; el tope de
// 100 (la pantalla lo dice y la base no deja pasar); un tipo con seguimientos (se desactiva y sigue nombrando a los viejos, no se elimina);
// un icono que el catálogo no conoce (se dibuja neutro y no se pierde al editar el nombre); dos personas editando el mismo tipo; una URL que
// nombra uno que no existe; eliminar con su URL; y la asesora sin permiso (ni pantalla ni escritura).
test.describe.configure({ mode: 'serial' })

let duena = ''
let asesora = ''
let proyecto = ''
const nombre = (resto: string) => `${PREFIJO_DE_TIPO_DE_SEGUIMIENTO_E2E} ${resto} ${proyecto}`

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarLeadsDePrueba()
  await borrarTiposDeSeguimientoDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-seguimientos-casos-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dalia Casos' })
  asesora = (await crearAsesoraDeLaSemilla(proyecto)).email
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await borrarTiposDeSeguimientoDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('el nombre vacío, repetido con otras mayúsculas o de más de 40 caracteres se rechaza junto al campo', async ({
  page,
}, info) => {
  await entrar(page, duena)
  await abrirTiposDeSeguimiento(page)
  await page.getByRole('button', { name: 'Nuevo tipo' }).first().click()
  const modal = modalDeTipoDeSeguimiento(page, 'Nuevo tipo de seguimiento')
  await modal.getByRole('button', { name: 'Crear tipo' }).click()
  await expect(modal.getByText('Escribe el nombre del tipo de seguimiento.')).toBeVisible()
  await modal.getByLabel('Nombre').fill('   ')
  await modal.getByRole('button', { name: 'Crear tipo' }).click()
  await expect(modal.getByText('Escribe el nombre del tipo de seguimiento.')).toBeVisible()
  await modal.getByLabel('Nombre').fill('  LLAMADA ')
  await modal.getByRole('button', { name: 'Crear tipo' }).click()
  await expect(modal.getByText('Ya hay un tipo de seguimiento «LLAMADA».')).toBeVisible()
  await modal.getByLabel('Nombre').fill('x'.repeat(41))
  await modal.getByRole('button', { name: 'Crear tipo' }).click()
  await expect(modal.getByText('admite hasta 40 caracteres')).toBeVisible()
  await sinScrollHorizontal(page)
  await capturar(page, info, 'seguimientos-nombre-rechazado')
  expect(await tipoDeSeguimientoEnLaBase('LLAMADA')).toBeUndefined()
  // Lo escrito queda y, corregido, se guarda.
  await modal.getByLabel('Nombre').fill(nombre('Corregido'))
  await modal.getByRole('button', { name: 'Crear tipo' }).click()
  await expect(modal).toBeHidden()
  expect(await tipoDeSeguimientoEnLaBase(nombre('Corregido'))).toBeDefined()
  // Renombrar con el nombre de otro, tampoco.
  await page.getByRole('button', { name: `Abrir ${nombre('Corregido')}`, exact: true }).click()
  const edicion = modalDeTipoDeSeguimiento(page, 'Editar tipo de seguimiento')
  await edicion.getByLabel('Nombre').fill('whatsapp')
  await edicion.getByRole('button', { name: 'Guardar' }).click()
  await expect(edicion.getByText('Ya hay un tipo de seguimiento «whatsapp».')).toBeVisible()
  await page.keyboard.press('Escape')
  await edicion.getByRole('button', { name: 'Descartar' }).click()
})

test('un tipo con seguimientos: se desactiva y sigue nombrando a los viejos, y no se elimina', async ({
  page,
}, info) => {
  const tipo = await sembrarTipoDeSeguimiento(nombre('Con uso'), { icono: 'estrella' })
  const lead = await crearLead({
    nombre: `seg ${proyecto}`,
    telefono: telefonoAlAzar(),
    deQuien: duena,
  })
  const { error } = await admin()
    .from('seguimientos')
    .insert({
      lead_id: lead,
      usuario_id: await idDe(duena),
      tipo_id: tipo.id,
      titulo: `Seguimiento viejo ${proyecto}`,
      visibilidad: 'publico',
    })
  expect(error).toBeNull()
  await entrar(page, duena)
  await abrirTiposDeSeguimiento(page)
  const fila = filaDeTipoDeSeguimiento(page, tipo.nombre)
  await expect(fila.getByText('Tiene seguimientos')).toBeVisible()
  // Eliminar está apagado y dice por qué antes de intentarlo.
  await masAccionesDe(page, tipo.nombre).click()
  await expect(page.getByRole('menuitem', { name: 'Eliminar', exact: true })).toBeDisabled()
  await expect(
    page.getByText(`«${tipo.nombre}» ya tiene seguimientos: no se elimina.`),
  ).toBeVisible()
  await capturar(page, info, 'seguimientos-con-uso-menu')
  await page.keyboard.press('Escape')
  // Desactivarlo: sí; los seguimientos viejos conservan su nombre.
  await elegirDelMenu(page, tipo.nombre, 'Desactivar')
  await expect(fila.getByText('Desactivado')).toBeVisible()
  expect(await tipoDeSeguimientoEnLaBase(tipo.nombre)).toMatchObject({ activo: false })
  await page.goto(`/leads/${lead}?seccion=seguimientos`)
  await expect(page.getByText(`Seguimiento viejo ${proyecto}`)).toBeVisible()
  await expect(page.getByText(tipo.nombre, { exact: true })).toBeVisible()
  // Una URL que pide eliminarlo no abre y dice por qué.
  await noAbre(
    page,
    `/configuracion/leads?seccion=seguimientos&panel=eliminar-tipo-de-seguimiento&tipo-de-seguimiento=${tipo.id}`,
    'ya tiene seguimientos',
    /panel=eliminar-tipo-de-seguimiento/,
  )
  // Y la base lo rechaza aunque se llame sin la pantalla.
  const cliente = await sesionDe(duena, CONTRASENA)
  const r = await cliente.rpc('tipo_seguimiento_eliminar', {
    p_id: tipo.id,
    p_actualizado_en_esperado: (await tipoDeSeguimientoEnLaBase(tipo.nombre))?.actualizado_en ?? '',
  })
  expect(r.error?.message).toContain('ya tiene seguimientos')
})

test('un icono que el catálogo no conoce se dibuja neutro, se edita como «Sin icono» y no se pierde al renombrar', async ({
  page,
}, info) => {
  const raro = await sembrarTipoDeSeguimiento(nombre('Icono raro'), { icono: 'message-circle' })
  await entrar(page, duena)
  await abrirTiposDeSeguimiento(page)
  const fila = filaDeTipoDeSeguimiento(page, raro.nombre)
  expect(await iconoDeLaFila(fila)).toBe('desconocido')
  await capturar(page, info, 'seguimientos-icono-desconocido')
  await page.getByRole('button', { name: `Abrir ${raro.nombre}`, exact: true }).click()
  const modal = modalDeTipoDeSeguimiento(page, 'Editar tipo de seguimiento')
  await expect(modal.getByRole('radio', { name: 'Sin icono' })).toBeChecked()
  await modal.getByLabel('Nombre').fill(nombre('Icono raro 2'))
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(modal).toBeHidden()
  // Sólo viajó el nombre: el icono que no se tocó sigue como estaba.
  expect(await tipoDeSeguimientoEnLaBase(nombre('Icono raro 2'))).toMatchObject({
    icono: 'message-circle',
  })
  // Elegir uno del catálogo lo reemplaza.
  await page.getByRole('button', { name: `Abrir ${nombre('Icono raro 2')}`, exact: true }).click()
  await elegirIcono(modal, 'Teléfono')
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(modal).toBeHidden()
  expect(await tipoDeSeguimientoEnLaBase(nombre('Icono raro 2'))).toMatchObject({
    icono: 'telefono',
  })
  // La base rechaza una clave fuera del catálogo aunque llegue sin la pantalla.
  const cliente = await sesionDe(duena, CONTRASENA)
  const r = await cliente.rpc('tipo_seguimiento_crear', {
    p_id: crypto.randomUUID(),
    p_nombre: nombre('Icono inventado'),
    p_icono: 'marciano',
  })
  expect(r.error?.message).toContain('no está en el catálogo')
})

test('dos personas editando el mismo tipo: la segunda ve el conflicto y lo escrito queda', async ({
  page,
  browser,
}) => {
  const tres = nombre('Conflicto')
  await sembrarTipoDeSeguimiento(tres)
  await entrar(page, duena)
  await abrirTiposDeSeguimiento(page)
  await page.getByRole('button', { name: `Abrir ${tres}`, exact: true }).click()
  const primera = modalDeTipoDeSeguimiento(page, 'Editar tipo de seguimiento')
  await primera.getByLabel('Nombre').fill(nombre('Conflicto A'))

  const contexto = await browser.newContext({ baseURL: new URL(page.url()).origin })
  const otra = await contexto.newPage()
  await entrar(otra, duena, { fresco: true })
  await abrirTiposDeSeguimiento(otra)
  await otra.getByRole('button', { name: `Abrir ${tres}`, exact: true }).click()
  const segunda = modalDeTipoDeSeguimiento(otra, 'Editar tipo de seguimiento')
  await segunda.getByLabel('Nombre').fill(nombre('Conflicto B'))
  await segunda.getByRole('button', { name: 'Guardar' }).click()
  await expect(segunda).toBeHidden()

  await primera.getByRole('button', { name: 'Guardar' }).click()
  await expect(
    page.getByText('Otra persona cambió este tipo de seguimiento mientras lo editabas.'),
  ).toBeVisible()
  await expect(primera.getByLabel('Nombre')).toHaveValue(nombre('Conflicto A'))
  expect(await tipoDeSeguimientoEnLaBase(nombre('Conflicto B'))).toBeDefined()
  await contexto.close()
})

test('una URL que nombra un tipo que no existe no abre nada y lo dice', async ({ page }) => {
  await entrar(page, duena)
  await page.goto(
    '/configuracion/leads?seccion=seguimientos&panel=editar-tipo-de-seguimiento&tipo-de-seguimiento=00000000-0000-4000-8000-000000000000',
  )
  await expect(page.getByText('Ese tipo de seguimiento ya no existe.').first()).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect.poll(() => page.url()).not.toContain('panel=')
})

test('eliminar un tipo: su URL, Esc, atrás, recarga, sin red y un solo pedido; uno que no existe no abre', async ({
  page,
  context,
}) => {
  const url = nombre('Url')
  await sembrarTipoDeSeguimiento(url)
  await entrar(page, duena, { fresco: true })
  await abrirTiposDeSeguimiento(page)
  const disparador = masAccionesDe(page, url)
  const dialogo = page.getByRole('dialog', { name: `Eliminar el tipo de seguimiento «${url}»` })
  await cicloDeUnaConfirmacion(page, {
    abrir: async () => {
      await elegirDelMenu(page, url, 'Eliminar')
    },
    dialogo,
    disparador,
    url: /panel=eliminar-tipo-de-seguimiento&tipo-de-seguimiento=/,
  })
  const confirmar = dialogo.getByRole('button', { name: 'Eliminar tipo' })
  await sinRedNoConfirma(context, dialogo, confirmar)
  expect(await dobleClicManda(page, confirmar)).toBe(1)
  await expect(dialogo).toBeHidden()
  expect(await tipoDeSeguimientoEnLaBase(url)).toBeUndefined()

  await noAbre(
    page,
    '/configuracion/leads?seccion=seguimientos&panel=eliminar-tipo-de-seguimiento&tipo-de-seguimiento=00000000-0000-4000-8000-000000000999',
    'Ese tipo de seguimiento ya no existe.',
    /panel=eliminar-tipo-de-seguimiento/,
  )
})

test('el tope de 100: lo dice, apaga «Nuevo tipo» y la base no deja pasar', async ({ page }) => {
  await llenarTiposDeSeguimientoHasta(100)
  await entrar(page, duena)
  await abrirTiposDeSeguimiento(page)
  await expect(page.getByText('Llegaste al máximo de 100 tipos de seguimiento.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Nuevo tipo' })).toBeDisabled()
  await expect(page.getByText('100 de 100 tipos de seguimiento posibles.')).toBeVisible()
  // Por la URL tampoco abre.
  await page.goto('/configuracion/leads?seccion=seguimientos&panel=nuevo-tipo-de-seguimiento')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  // Y la base lo rechaza aunque se llame sin la pantalla.
  const cliente = await sesionDe(duena, CONTRASENA)
  const crear = await cliente.rpc('tipo_seguimiento_crear', {
    p_id: crypto.randomUUID(),
    p_nombre: nombre('El ciento uno'),
  })
  expect(crear.error?.message).toContain('máximo')
  await borrarTiposDeSeguimientoDePrueba()
})

test('la asesora sin leads.configurar no ve la pantalla ni puede escribir por la API', async ({
  page,
}, info) => {
  await page.context().clearCookies()
  await entrar(page, asesora, { fresco: true })
  await page.goto('/configuracion/leads?seccion=seguimientos')
  await expect(page.getByText('No tienes permiso para ver esto')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Tipos de seguimiento' })).toHaveCount(0)
  await capturar(page, info, 'seguimientos-asesora-sin-permiso')
  const cliente = await sesionDe(asesora, CONTRASENA)
  const crear = await cliente.rpc('tipo_seguimiento_crear', {
    p_id: crypto.randomUUID(),
    p_nombre: nombre('Intruso'),
  })
  expect(crear.error?.message).toContain('leads.configurar')
  const directo = await cliente
    .from('tipos_seguimiento')
    .update({ activo: false })
    .eq('clave', 'llamada')
  expect(directo.error).not.toBeNull()
  expect(await tipoDeSeguimientoEnLaBase('Llamada')).toMatchObject({ activo: true })
  // Leer los tipos, sí: la asesora los ve al anotar un seguimiento.
  const lectura = await cliente.from('tipos_seguimiento').select('id').limit(1)
  expect(lectura.error).toBeNull()
})
