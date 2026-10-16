import type { Locator, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { otraPersona } from './soporte/inventario'
import { idDePersona } from './soporte/leads-alta'
import { abrirEdicion, extrasDeLead, irAFicha, tituloDeLaFicha } from './soporte/leads-ficha'
import { abrirAgregarTelefono, modalDeExtra, nacional } from './soporte/leads-ficha-telefonos'
import { nombre } from './soporte/leads-listado'
import { dialogoDeOtorgar, GENERAR, seccionPortal } from './soporte/leads-portal'
import {
  abrirAgendar,
  abrirAnotar,
  abrirEdicionDeSeguimiento,
  abrirPestanaDeRecordatorios,
  abrirPestanaDeSeguimientos,
  compartirCon,
  irASeguimientos,
  modalDeRecordatorio,
  modalDeSeguimiento,
} from './soporte/leads-seguimientos'
import {
  capturar,
  demorarAcciones,
  dentroDeLaPantalla,
  limpiarRecorrido,
  prepararRecorrido,
  quieto,
  recibeElClic,
  sinScrollHorizontal,
  tactil,
  type TerrenoDelRecorrido,
  volcarArbol,
} from './soporte/recorrido'

// El recorrido de la IA (9d-3), segunda parte: los cuatro modales (teléfono extra, recordatorio,
// portal y seguimiento) desde la ficha, el drawer y la fila; el conflicto con dos navegadores a la vez;
// D y E (avisos y red) están en `leads-recorrido-avisos.spec.ts`. Capturas con `E2E_CAPTURAS`.
test.describe.configure({ mode: 'serial' })

let r: TerrenoDelRecorrido

test.beforeAll(async ({}, info) => {
  r = await prepararRecorrido(info.project.name, 'Modales')
})

test.afterAll(async () => {
  await limpiarRecorrido(r)
})

// El pie de un modal: «Guardar» (o su principal) a la vista, sin nada encima, y con 44 px en el celular.
async function pieUsable(page: Page, modal: Locator, principal: string) {
  const boton = modal.getByRole('button', { name: principal, exact: true })
  await quieto(modal)
  await dentroDeLaPantalla(page, modal)
  await recibeElClic(boton)
  await tactil(page, boton)
}

test('la ficha con sus cinco secciones cabe en el celular, y su modal también (la ✕ a la vista)', async ({
  page,
}) => {
  await entrar(page, r.ana.email)
  for (const seccion of ['', '?seccion=seguimientos', '?seccion=portal']) {
    await irAFicha(page, r.uno.id, seccion)
    await expect(tituloDeLaFicha(page, r.uno.nombre)).toBeVisible()
    await sinScrollHorizontal(page)
  }
  await expect(
    page.getByRole('navigation', { name: 'Secciones del lead' }).getByRole('link'),
  ).toHaveCount(5)
  await irAFicha(page, r.uno.id)
  const modal = await abrirAgregarTelefono(page)
  await quieto(modal)
  await dentroDeLaPantalla(page, modal)
  await recibeElClic(modal.getByRole('button', { name: 'Cerrar' }))
  await page.keyboard.press('Escape')
  await expect(modal).toHaveCount(0)
})

test('C · teléfono extra desde la ficha: validación, descarte y guardar una sola vez', async ({
  page,
}, info) => {
  await entrar(page, r.ana.email)
  await irAFicha(page, r.uno.id)
  await expect(tituloDeLaFicha(page, r.uno.nombre)).toBeVisible()
  await sinScrollHorizontal(page)
  await capturar(page, info, 'ficha-datos')

  const modal = await abrirAgregarTelefono(page)
  await pieUsable(page, modal, 'Agregar')
  const campo = modal.getByLabel('Teléfono extra')
  await campo.fill('12')
  await modal.getByRole('button', { name: 'Agregar', exact: true }).click()
  await expect(campo).toBeFocused()
  await expect(campo).toHaveAttribute('aria-invalid', 'true')
  await volcarArbol(modal, info, 'extra-invalido')
  await capturar(page, info, 'extra-invalido')

  await page.keyboard.press('Escape')
  await expect(modal.getByText('Tienes cambios sin guardar.')).toBeVisible()
  await modal.getByRole('button', { name: 'Seguir editando' }).click()
  await expect(campo).toHaveValue('12')

  // Mientras se envía, «Agregar» queda apagado: un segundo clic no manda otro pedido.
  const enviadas = await demorarAcciones(page, 1500)
  await campo.fill(nacional())
  // Mientras sale, el botón cambia de texto: se lo busca por lo que es, el envío del formulario.
  const agregar = modal.locator('button[type=submit]')
  await agregar.click()
  await expect(agregar).toBeDisabled()
  info.annotations.push({
    type: 'C: el botón mientras se envía',
    description: await agregar.innerText(),
  })
  await capturar(page, info, 'extra-enviando')
  await agregar.click({ force: true })
  await expect(page.getByText('Teléfono agregado.')).toBeVisible()
  await expect(modalDeExtra(page)).toHaveCount(0)
  expect(enviadas).toHaveLength(1)
  expect(await extrasDeLead(r.uno.id)).toHaveLength(1)
  await page.unrouteAll({ behavior: 'wait' })
})

test('C · recordatorio y seguimiento desde la ficha: validación y guardar apagado mientras sale', async ({
  page,
}, info) => {
  await entrar(page, r.ana.email)
  await irASeguimientos(page, r.uno.id)
  await capturar(page, info, 'ficha-seguimientos')

  const agendar = await abrirAgendar(page)
  await pieUsable(page, agendar, 'Guardar')
  await agendar.getByRole('button', { name: 'Guardar' }).click()
  await expect(agendar.getByLabel('De qué es')).toBeFocused()
  await volcarArbol(agendar, info, 'recordatorio-invalido')
  await capturar(page, info, 'recordatorio-invalido')
  await agendar.getByLabel('De qué es').fill('Mandarle la cotización')
  await agendar.getByRole('button', { name: 'Mañana 09:00' }).click()
  const enviadas = await demorarAcciones(page, 1500)
  await agendar.getByRole('button', { name: 'Guardar' }).click()
  await expect(agendar.locator('button[type=submit]')).toBeDisabled()
  await expect(modalDeRecordatorio(page, 'Agendar')).toHaveCount(0)
  expect(enviadas).toHaveLength(1)
  await page.unrouteAll({ behavior: 'wait' })

  const anotar = await abrirAnotar(page)
  await pieUsable(page, anotar, 'Guardar')
  await anotar.getByRole('button', { name: 'Guardar' }).click()
  await expect(anotar.getByLabel('Resumen')).toBeFocused()
  await capturar(page, info, 'seguimiento-invalido')
  await volcarArbol(anotar, info, 'seguimiento-invalido')
  await anotar.getByLabel('Resumen').fill('Le conté de la subasta')
  await anotar.getByRole('button', { name: 'Guardar' }).click()
  await expect(modalDeSeguimiento(page, 'Anotar')).toHaveCount(0)
  await capturar(page, info, 'ficha-seguimientos-con-datos')
})

test('C · portal desde la ficha: la clave corta se dice junto al campo y cerrar con algo escrito pregunta', async ({
  page,
}, info) => {
  await entrar(page, r.ana.email)
  await irAFicha(page, r.uno.id, '?seccion=portal')
  await seccionPortal(page).getByRole('button', { name: 'Dar acceso' }).click()
  const dialogo = dialogoDeOtorgar(page)
  await expect(dialogo).toBeVisible()
  await pieUsable(page, dialogo, GENERAR)
  await capturar(page, info, 'portal-dar-acceso')
  await dialogo.getByLabel('Clave temporal').fill('corta')
  await dialogo.getByRole('button', { name: 'Dar acceso con esta clave' }).click()
  await expect(dialogo.getByText('La clave necesita al menos 8 caracteres.')).toBeVisible()
  await capturar(page, info, 'portal-clave-corta')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  info.annotations.push({
    type: 'C: Esc en el portal con una clave escrita',
    description: (await dialogo.isVisible()) ? 'queda abierto' : 'se cerró sin preguntar',
  })
})

test('C · desde el drawer: anotar y agendar abren sobre el drawer y Esc cierra sólo el modal', async ({
  page,
}, info) => {
  await entrar(page, r.ana.email)
  await page.goto(`/leads?lead=${r.uno.id}`)
  const drawer = page.getByRole('dialog', { name: r.uno.nombre })
  await abrirPestanaDeSeguimientos(page, drawer)
  await drawer.getByRole('button', { name: 'Anotar seguimiento' }).click()
  const anotar = modalDeSeguimiento(page, 'Anotar')
  await expect(anotar.getByLabel('Resumen')).toBeFocused()
  await pieUsable(page, anotar, 'Guardar')
  await capturar(page, info, 'drawer-anotar')
  await page.keyboard.press('Escape')
  await expect(anotar).toHaveCount(0)
  await expect(drawer).toBeVisible()

  await abrirPestanaDeRecordatorios(page, drawer)
  await drawer.getByRole('button', { name: 'Agendar recordatorio' }).click()
  const agendar = modalDeRecordatorio(page, 'Agendar')
  await expect(agendar.getByLabel('De qué es')).toBeFocused()
  await capturar(page, info, 'drawer-agendar')
  await page.keyboard.press('Escape')
  await expect(agendar).toHaveCount(0)
  await expect(drawer).toBeVisible()
})

test('C · conflicto: la dueña guarda el lead mientras la asesora lo edita; la asesora en dos ventanas', async ({
  page,
  browser,
}, info) => {
  await compartirCon(
    r.uno.id,
    await idDePersona(r.t.personas.duena),
    await idDePersona(r.ana.email),
  )
  await entrar(page, r.ana.email)
  await irAFicha(page, r.uno.id)
  const panel = await abrirEdicion(page)
  await panel.getByLabel('Nombre').fill(nombre(`Conflicto de Ana ${info.project.name}`))

  const duena = await otraPersona(browser, page)
  await entrar(duena, r.t.personas.duena)
  await irAFicha(duena, r.uno.id)
  const suyo = await abrirEdicion(duena)
  await suyo.getByLabel('Nombre').fill(nombre(`Conflicto de la dueña ${info.project.name}`))
  await duena.keyboard.press('Control+s')
  await expect(duena.getByText('Cambios guardados')).toBeVisible()

  await panel.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(panel.getByText(/cambió este lead/)).toBeVisible()
  await expect(panel.getByLabel('Nombre')).toHaveValue(
    nombre(`Conflicto de Ana ${info.project.name}`),
  )
  await volcarArbol(panel, info, 'conflicto-del-lead')
  await capturar(page, info, 'conflicto-del-lead')
  await panel.getByRole('button', { name: 'Recargar' }).click()
  await expect(panel.getByLabel('Nombre')).toHaveValue(
    nombre(`Conflicto de la dueña ${info.project.name}`),
  )
  await duena.context().close()

  // Un seguimiento sólo lo edita su autora: el conflicto es de Ana consigo misma, en otra ventana.
  await irASeguimientos(page, r.uno.id)
  const edicion = await abrirEdicionDeSeguimiento(page, 'Le conté de la subasta')
  await edicion.getByLabel('Resumen').fill('Le conté de la subasta (ventana 1)')
  const otra = await otraPersona(browser, page)
  await entrar(otra, r.ana.email)
  await irASeguimientos(otra, r.uno.id)
  const enLaOtra = await abrirEdicionDeSeguimiento(otra, 'Le conté de la subasta')
  await enLaOtra.getByLabel('Resumen').fill('Le conté de la subasta (ventana 2)')
  await enLaOtra.getByRole('button', { name: 'Guardar' }).click()
  await expect(modalDeSeguimiento(otra, 'Editar')).toHaveCount(0)
  await edicion.getByRole('button', { name: 'Guardar' }).click()
  await expect(edicion.getByText(/desde otra ventana/)).toBeVisible()
  await expect(edicion.getByLabel('Resumen')).toHaveValue('Le conté de la subasta (ventana 1)')
  await capturar(page, info, 'conflicto-del-seguimiento')
  await otra.context().close()
})
