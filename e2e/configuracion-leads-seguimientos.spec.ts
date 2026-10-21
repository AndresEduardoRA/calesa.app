import { expect, test } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { borrarLeadsDePrueba } from './soporte/leads'
import {
  PREFIJO_DE_TIPO_DE_SEGUIMIENTO_E2E,
  abrirTiposDeSeguimiento,
  borrarTiposDeSeguimientoDePrueba,
  elegirDelMenu,
  elegirIcono,
  filaDeTipoDeSeguimiento,
  iconoDeLaFila,
  masAccionesDe,
  nombresDeLaLista,
  modalDeTipoDeSeguimiento,
  nombresDeSeguimientoEnPantalla,
  sembrarTipoDeSeguimiento,
  tipoDeSeguimientoEnLaBase,
} from './soporte/tipos-de-seguimiento'
import { aLaVistaSinDesplazar, capturar, sinScrollHorizontal, tactil } from './soporte/recorrido'

// El recorrido de Configuración › Leads › Tipos de seguimiento: los de fábrica con su icono, crear con un icono del catálogo, editar
// (nombre e icono), ordenar con el teclado, desactivar con «Deshacer», y el texto al 200 %. Con la dueña, en escritorio y celular.
// Lo que se juzga mirando, en `E2E_CAPTURAS=e2e-capturas/config-de-leads`. Los casos no felices están en `*-casos`.
test.describe.configure({ mode: 'serial' })

let duena = ''
let proyecto = ''
const nombre = (resto: string) => `${PREFIJO_DE_TIPO_DE_SEGUIMIENTO_E2E} ${resto} ${proyecto}`

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  await borrarLeadsDePrueba()
  await borrarTiposDeSeguimientoDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-seguimientos-${proyecto}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dalia Seguimientos' })
})

test.afterAll(async () => {
  await borrarLeadsDePrueba()
  await borrarTiposDeSeguimientoDePrueba()
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

test('de fábrica: los tipos de siempre, cada uno con su icono, y la pestaña sigue a «Tipos de lead»', async ({
  page,
}, info) => {
  await entrar(page, duena)
  await abrirTiposDeSeguimiento(page)
  const pestanas = await page.getByRole('tab').allTextContents()
  expect(pestanas.map((t) => t.trim())).toEqual([
    'Campos',
    'Orígenes del lead',
    'Tipos de lead',
    'Tipos de seguimiento',
  ])
  await expect(page.getByRole('tab', { name: 'Tipos de seguimiento' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  // Los de fábrica, con el icono del catálogo al que migró el que tenían.
  expect(await iconoDeLaFila(filaDeTipoDeSeguimiento(page, 'WhatsApp'))).toBe('mensaje')
  expect(await iconoDeLaFila(filaDeTipoDeSeguimiento(page, 'Llamada'))).toBe('telefono')
  expect(await iconoDeLaFila(filaDeTipoDeSeguimiento(page, 'Visita'))).toBe('ubicacion')
  await expect(filaDeTipoDeSeguimiento(page, 'Llamada').getByText('Sin seguimientos')).toBeVisible()
  await expect(page.getByText(/de 100 tipos de seguimiento posibles\./)).toBeVisible()
  await sinScrollHorizontal(page)
  await capturar(page, info, 'seguimientos-de-fabrica')
})

test('crear uno con un icono del catálogo, editarlo (nombre e icono) y ver que se dibuja en la lista', async ({
  page,
}, info) => {
  const radio = nombre('Radio')
  await entrar(page, duena)
  await abrirTiposDeSeguimiento(page)
  await page.getByRole('button', { name: 'Nuevo tipo' }).first().click()
  const nuevo = modalDeTipoDeSeguimiento(page, 'Nuevo tipo de seguimiento')
  await expect(nuevo).toBeVisible()
  await expect(page).toHaveURL(/panel=nuevo-tipo-de-seguimiento/)
  await expect(nuevo.getByRole('radio', { name: 'Sin icono' })).toBeChecked()
  await nuevo.getByLabel('Nombre').fill(radio)
  await elegirIcono(nuevo, 'Megáfono')
  await sinScrollHorizontal(page)
  await capturar(page, info, 'seguimientos-nuevo-con-icono')
  await nuevo.getByRole('button', { name: 'Crear tipo' }).click()
  await expect(nuevo).toBeHidden()
  const fila = filaDeTipoDeSeguimiento(page, radio)
  await expect(fila).toBeVisible()
  expect(await iconoDeLaFila(fila)).toBe('megafono')
  expect(await tipoDeSeguimientoEnLaBase(radio)).toMatchObject({ icono: 'megafono', activo: true })

  // Editar: abrir con un clic en la fila, cambiar el icono y el nombre.
  await page.getByRole('button', { name: `Abrir ${radio}`, exact: true }).click()
  const edicion = modalDeTipoDeSeguimiento(page, 'Editar tipo de seguimiento')
  await expect(edicion).toBeVisible()
  await expect(page).toHaveURL(/panel=editar-tipo-de-seguimiento&tipo-de-seguimiento=/)
  await expect(edicion.getByRole('radio', { name: 'Megáfono' })).toBeChecked()
  await edicion.getByLabel('Nombre').fill(nombre('Radio 2'))
  await elegirIcono(edicion, 'Estrella')
  await edicion.getByRole('button', { name: 'Guardar' }).click()
  await expect(edicion).toBeHidden()
  const renombrada = filaDeTipoDeSeguimiento(page, nombre('Radio 2'))
  expect(await iconoDeLaFila(renombrada)).toBe('estrella')
  expect(await tipoDeSeguimientoEnLaBase(nombre('Radio 2'))).toMatchObject({ icono: 'estrella' })

  // Quitar el icono: «Sin icono» y la fila deja de dibujar uno.
  await page.getByRole('button', { name: `Abrir ${nombre('Radio 2')}`, exact: true }).click()
  await elegirIcono(edicion, 'Sin icono')
  await edicion.getByRole('button', { name: 'Guardar' }).click()
  await expect(edicion).toBeHidden()
  expect(await iconoDeLaFila(renombrada)).toBeNull()
  expect(await tipoDeSeguimientoEnLaBase(nombre('Radio 2'))).toMatchObject({ icono: null })
})

test('cerrar el modal con algo escrito pregunta; descartar o seguir editando', async ({ page }) => {
  await entrar(page, duena)
  await abrirTiposDeSeguimiento(page)
  await page.getByRole('button', { name: 'Nuevo tipo' }).first().click()
  const modal = modalDeTipoDeSeguimiento(page, 'Nuevo tipo de seguimiento')
  await modal.getByLabel('Nombre').fill(nombre('Sin guardar'))
  await elegirIcono(modal, 'Casa')
  await page.keyboard.press('Escape')
  await expect(modal.getByText('Tienes cambios sin guardar.')).toBeVisible()
  await modal.getByRole('button', { name: 'Seguir editando' }).click()
  await expect(modal.getByLabel('Nombre')).toHaveValue(nombre('Sin guardar'))
  await page.keyboard.press('Escape')
  await modal.getByRole('button', { name: 'Descartar' }).click()
  await expect(modal).toBeHidden()
  await expect(page).not.toHaveURL(/panel=/)
  expect(await tipoDeSeguimientoEnLaBase(nombre('Sin guardar'))).toBeUndefined()
  // Un modal abierto y no tocado se cierra sin preguntar.
  await page.getByRole('button', { name: 'Nuevo tipo' }).first().click()
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
})

test('ordenar con el teclado: subir y bajar, el foco sigue y el lector oye el lugar', async ({
  page,
}) => {
  const uno = await sembrarTipoDeSeguimiento(nombre('Orden uno'))
  const dos = await sembrarTipoDeSeguimiento(nombre('Orden dos'))
  await entrar(page, duena)
  await abrirTiposDeSeguimiento(page)
  const antes = await nombresDeSeguimientoEnPantalla(page)
  expect(antes.indexOf(uno.nombre)).toBeLessThan(antes.indexOf(dos.nombre))
  const subir = page.getByRole('button', { name: `Subir ${dos.nombre}`, exact: true })
  await subir.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status')).toContainText(`«${dos.nombre}» quedó en el lugar`)
  const despues = await nombresDeSeguimientoEnPantalla(page)
  expect(despues.indexOf(dos.nombre)).toBeLessThan(despues.indexOf(uno.nombre))
  await expect(subir).toBeFocused()
  expect((await tipoDeSeguimientoEnLaBase(dos.nombre))?.orden).toBeLessThan(
    (await tipoDeSeguimientoEnLaBase(uno.nombre))?.orden ?? 0,
  )
  // El primero de la lista no sube y lo dice.
  const primero = despues[0] ?? ''
  await expect(page.getByRole('button', { name: `Subir ${primero}`, exact: true })).toBeDisabled()
  // Bajar uno vuelve a su lugar.
  const bajar = page.getByRole('button', { name: `Bajar ${dos.nombre}`, exact: true })
  await bajar.focus()
  await page.keyboard.press('Enter')
  await expect
    .poll(async () => (await nombresDeSeguimientoEnPantalla(page)).indexOf(dos.nombre))
    .toBeGreaterThan((await nombresDeSeguimientoEnPantalla(page)).indexOf(uno.nombre) - 1)
})

test('desactivar y volver a activar con «Deshacer»; el «⋯» dice lo que se puede', async ({
  page,
}) => {
  const tipo = nombre('Apagable')
  await sembrarTipoDeSeguimiento(tipo, { icono: 'nota' })
  await entrar(page, duena)
  await abrirTiposDeSeguimiento(page)
  const fila = filaDeTipoDeSeguimiento(page, tipo)
  await masAccionesDe(page, tipo).click()
  await expect(page.getByRole('menuitem', { name: 'Editar', exact: true })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Eliminar', exact: true })).toBeEnabled()
  await page.getByRole('menuitem', { name: 'Desactivar', exact: true }).click()
  await expect(fila.getByText('Desactivado')).toBeVisible()
  await expect(page.getByText(`«${tipo}» desactivado.`)).toBeVisible()
  expect(await tipoDeSeguimientoEnLaBase(tipo)).toMatchObject({ activo: false })
  // Una fila apagada se sigue nombrando y se puede volver a encender.
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(fila.getByText('Desactivado')).toBeHidden()
  await expect.poll(async () => (await tipoDeSeguimientoEnLaBase(tipo))?.activo).toBe(true)
  await elegirDelMenu(page, tipo, 'Desactivar')
  await expect(fila.getByText('Desactivado')).toBeVisible()
  await elegirDelMenu(page, tipo, 'Activar')
  await expect(fila.getByText('Desactivado')).toBeHidden()
})

test('al 200 %: la página no se ensancha y el nombre y el «⋯» de cada fila están a la vista', async ({
  page,
}, info) => {
  await sembrarTipoDeSeguimiento(nombre('Largo largo largo'), {
    icono: 'documento',
  })
  await entrar(page, duena)
  await abrirTiposDeSeguimiento(page)
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await sinScrollHorizontal(page)
  const filas = page.getByRole('button', { name: /^Más acciones de / })
  const total = await filas.count()
  expect(total).toBeGreaterThan(6)
  for (const n of [0, 1, total - 1]) {
    await aLaVistaSinDesplazar(filas.nth(n), `el «⋯» de la fila ${String(n + 1)}`)
    await aLaVistaSinDesplazar(
      nombresDeLaLista(page).nth(n),
      `el nombre de la fila ${String(n + 1)}`,
    )
  }
  await tactil(page, filas.first())
  await capturar(page, info, 'seguimientos-200')
  await page.evaluate(() => {
    document.documentElement.style.fontSize = ''
  })
})
