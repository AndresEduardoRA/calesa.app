import { admin } from './soporte/base'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/inventario'
import { capturar } from './soporte/recorrido'
import { vehiculoPorTitulo } from './soporte/vehiculos'
import {
  NO_DISPONIBLE,
  NO_EXISTE,
  OTRO,
  TITULO,
  abrirConUnClic,
  alInventario,
  filaDe,
  limpiarResumen,
  prepararResumen,
  resumenDe,
  type TerrenoDelResumen,
} from './soporte/vehiculos-resumen'

// Editar un vehículo desde su resumen y volver (el panel se apila encima: Esc, «Cancelar» y guardar cierran sólo el panel), y los
// casos que no son el feliz: sin permiso de editar, el vehículo que desaparece, sin red al abrir y al elegir una pestaña.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelResumen

test.beforeAll(async ({}, info) => {
  t = await prepararResumen(`${info.project.name}_casos`)
})

test.afterAll(async () => {
  await limpiarResumen(t.id)
})

test('«Editar» abre el panel encima del resumen y, al guardar, vuelve al resumen con el dato al día', async ({
  page,
}, info) => {
  await entrar(page, t.terreno.duena)
  await alInventario(page, t.terreno.corea.id)
  const resumen = await abrirConUnClic(page, TITULO)
  await resumen.getByRole('button', { name: 'Editar', exact: true }).click()
  const panel = page.getByRole('dialog', { name: `Editar ${TITULO}` })
  await expect(panel).toBeVisible()
  // El resumen sigue debajo: la URL lleva el vehículo y el panel.
  await expect(page).toHaveURL(new RegExp(`vehiculo=${t.id}`))
  await expect(page).toHaveURL(new RegExp(`editar=${t.id}`))
  await panel.getByLabel('Título (obligatorio)').fill(`${TITULO} Editado`)
  await capturar(page, info, 'resumen-editando')
  await panel.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(panel).toBeHidden()
  // Vuelve al resumen, ya con el título nuevo (la fila de la página trae la versión guardada).
  await expect(resumenDe(page, `${TITULO} Editado`)).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`vehiculo=${t.id}`))
  await expect(page).not.toHaveURL(/editar=/)
  await expect(filaDe(page, `${TITULO} Editado`)).toBeVisible()
  expect((await vehiculoPorTitulo(`${TITULO} Editado`))?.id).toBe(t.id)
  // Y se puede volver a editar para dejarlo como estaba.
  await resumenDe(page, `${TITULO} Editado`)
    .getByRole('button', { name: 'Editar', exact: true })
    .click()
  const otra = page.getByRole('dialog', { name: `Editar ${TITULO} Editado` })
  await otra.getByLabel('Título (obligatorio)').fill(TITULO)
  await otra.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(resumenDe(page, TITULO)).toBeVisible()
})

test('cancelar o pulsar Esc en el panel cierra sólo el panel: el resumen queda y el foco vuelve a «Editar»', async ({
  page,
}) => {
  await entrar(page, t.terreno.duena)
  await alInventario(page, t.terreno.corea.id)
  const resumen = await abrirConUnClic(page, TITULO)
  const editar = resumen.getByRole('button', { name: 'Editar', exact: true })
  await editar.click()
  const panel = page.getByRole('dialog', { name: `Editar ${TITULO}` })
  await expect(panel).toBeVisible()
  await panel.getByRole('button', { name: 'Cancelar' }).click()
  await expect(panel).toBeHidden()
  await expect(resumen).toBeVisible()
  await expect(editar).toBeFocused()
  await editar.click()
  await expect(panel).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
  await expect(resumen).toBeVisible()
  await expect(page).toHaveURL(new RegExp(`vehiculo=${t.id}`))
})

test('sin permiso de editar el resumen no ofrece «Editar», pero sí «Abrir ficha»', async ({
  page,
}) => {
  await entrar(page, t.lector)
  await alInventario(page, t.terreno.corea.id)
  const resumen = await abrirConUnClic(page, TITULO)
  await expect(resumen.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0)
  await expect(resumen.getByRole('link', { name: 'Abrir ficha' })).toBeVisible()
})

test('un vehículo que desaparece con el resumen abierto lo dice, igual que uno que no existe', async ({
  page,
}) => {
  await entrar(page, t.terreno.duena)
  await alInventario(page, t.terreno.corea.id)
  await abrirConUnClic(page, OTRO)
  const otroId = (await vehiculoPorTitulo(OTRO))?.id ?? ''
  // Mientras tanto, otra persona lo manda a la papelera.
  const { error } = await admin()
    .from('vehiculos')
    .update({ eliminado_en: new Date().toISOString() })
    .eq('id', otroId)
  expect(error).toBeNull()
  await page.evaluate(() => {
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('focus'))
  })
  await expect(page.getByText(NO_DISPONIBLE)).toBeVisible()
  await admin().from('vehiculos').update({ eliminado_en: null }).eq('id', otroId)

  await alInventario(page, t.terreno.corea.id, `&vehiculo=${NO_EXISTE}`)
  await expect(
    page.getByRole('dialog', { name: 'Vehículo no disponible' }).getByText(NO_DISPONIBLE),
  ).toBeVisible()
})

test('sin red al abrir el resumen lo dice con «Reintentar», y sin red al elegir una pestaña, también', async ({
  page,
  context,
}) => {
  await entrar(page, t.terreno.duena)
  await alInventario(page, t.terreno.corea.id)
  await expect(filaDe(page, TITULO)).toBeVisible()
  // El código del resumen no se pidió todavía: sin red, no llega.
  await context.setOffline(true)
  await filaDe(page, TITULO).click({ position: { x: 6, y: 6 } })
  await expect(page.getByText('Sin conexión. No se pudo abrir esto.')).toBeVisible()
  await context.setOffline(false)
  await page.getByRole('button', { name: 'Reintentar' }).click()
  const resumen = resumenDe(page, TITULO)
  await expect(resumen).toBeVisible()
  // Lo mismo con una pestaña cuyo código no se pidió.
  await context.setOffline(true)
  await resumen.getByRole('tab', { name: 'Fotos' }).click()
  await expect(resumen.getByText('Sin conexión. No se pudo abrir esto.')).toBeVisible()
  await context.setOffline(false)
  await resumen.getByRole('button', { name: 'Reintentar' }).click()
  await expect(resumen.getByText('Este vehículo no tiene fotos todavía.')).toBeVisible()
})
