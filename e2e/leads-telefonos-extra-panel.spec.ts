import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import {
  abrirEdicion,
  extrasDeLead,
  idDeLead,
  irAFicha,
  nuevoLead,
  panelDeEdicion,
  ponerExtras,
  versionDe,
} from './soporte/leads-ficha'
import { completoCon, fichaDeBerta, modalDeExtra, nacional } from './soporte/leads-ficha-telefonos'
import {
  PROPIO_BERTA,
  delLead,
  fila,
  irALeads,
  limpiarListado,
  nombre,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import {
  ajustesDeFabricaDeTelefonos,
  fijarAjustesDeTelefonos,
} from './soporte/leads-telefonos-extra'
import { capturar } from './soporte/recorrido'

// Los teléfonos extra desde el panel de edición de la ficha y desde el resumen del listado (`?extra=nuevo`: `?panel=` ya es el panel), con
// el máximo y la regla de la empresa. Capturas: `E2E_CAPTURAS=e2e-capturas/t03`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  await ajustesDeFabricaDeTelefonos()
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await ajustesDeFabricaDeTelefonos()
  await limpiarListado(t)
})

const agregarEn = (dialogo: ReturnType<typeof panelDeEdicion>) =>
  dialogo.getByRole('button', { name: 'Agregar teléfono' })

test('en el panel de edición agrega, quita y deshace un extra, y guardar el formulario no choca', async ({
  page,
}, info) => {
  const lead = await fichaDeBerta(t, page, `Panel extras ${info.project.name}`)
  const version = await versionDe(lead.id)
  const casa = nacional()
  const panel = await abrirEdicion(page)
  await capturar(page, info, 'panel-con-telefonos-extra')

  // «Agregar teléfono» abre su modal sin cerrar el panel: va en `?extra=nuevo`.
  await agregarEn(panel).click()
  await expect(page).toHaveURL(/extra=nuevo/)
  await expect(page).toHaveURL(/panel=editar-lead/)
  const modal = modalDeExtra(page)
  await expect(modal.getByLabel('Teléfono extra')).toBeFocused()
  await modal.getByLabel('Teléfono extra').fill(casa)
  await modal.getByLabel('Etiqueta (opcional)').fill('Casa')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Teléfono agregado.')).toBeVisible()
  await expect(modal).toHaveCount(0)
  await expect(panel).toBeVisible()
  await expect(panel.getByText('Casa', { exact: true })).toBeVisible()
  expect(await extrasDeLead(lead.id)).toMatchObject([
    { telefono: completoCon(t, casa), etiqueta: 'Casa' },
  ])
  // Los extras no mueven la versión del lead: el formulario no tiene de qué chocar.
  expect(await versionDe(lead.id)).toBe(version)
  // En el celular el aviso puede quedar sobre el pie del panel: se cierra si todavía está (se va solo).
  await page
    .locator('[data-sonner-toast]')
    .filter({ hasText: 'Teléfono agregado.' })
    .getByRole('button', { name: 'Cerrar aviso' })
    .click({ timeout: 1500 })
    .catch(() => undefined)

  await panel.getByRole('button', { name: 'Quitar' }).click()
  await expect(page.getByText('Teléfono quitado.')).toBeVisible()
  expect(await extrasDeLead(lead.id)).toEqual([])
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(page.getByText('Teléfono restituido.')).toBeVisible()
  expect(await extrasDeLead(lead.id)).toHaveLength(1)

  // Guardar el formulario con lo de los extras ya hecho: sin conflicto.
  await panel.getByLabel('Nombre', { exact: true }).fill(`${lead.nombre} editado`)
  await panel.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(panelDeEdicion(page)).toBeHidden()
  await expect(
    page.getByRole('heading', { name: `${lead.nombre} editado`, level: 1 }),
  ).toBeVisible()
  expect(await extrasDeLead(lead.id)).toHaveLength(1)
})

test('desde el resumen agrega un extra, y con el panel encima no se monta un segundo modal', async ({
  page,
}, info) => {
  await entrar(page, t.personas.berta)
  await irALeads(page)
  await fila(page, PROPIO_BERTA).click()
  const resumen = page.getByRole('dialog', { name: nombre(PROPIO_BERTA) })
  await expect(resumen).toBeVisible()
  await expect(resumen.getByText('Principal', { exact: true })).toBeVisible()
  await capturar(page, info, 'resumen-con-telefonos-extra')
  const antes = await idDeLead(PROPIO_BERTA)
  // El lead del terreno no guarda su código de país: el número va completo, con «+».
  const numero = `+${completoCon(t, nacional())}`

  await agregarEn(resumen).click()
  await expect(page).toHaveURL(/extra=nuevo/)
  const modal = modalDeExtra(page)
  await modal.getByLabel('Teléfono extra').fill(numero)
  await modal.getByLabel('Etiqueta (opcional)').fill('Oficina')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Teléfono agregado.')).toBeVisible()
  await expect(modal).toHaveCount(0)
  await expect(resumen.getByText('Oficina', { exact: true })).toBeVisible()
  expect(await extrasDeLead(antes)).toMatchObject([{ etiqueta: 'Oficina' }])

  // Con «Editar» abierto encima, «Agregar teléfono» del panel abre un solo modal.
  await resumen.getByRole('button', { name: 'Editar', exact: true }).click()
  const panel = page.getByRole('dialog', { name: `Editar ${nombre(PROPIO_BERTA)}` })
  await expect(panel).toBeVisible()
  await agregarEn(panel).click()
  await expect(modalDeExtra(page)).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(modalDeExtra(page)).toHaveCount(0)
  await panel.getByRole('button', { name: 'Cancelar' }).click()
  await expect(panelDeEdicion(page)).toBeHidden()
  await expect(delLead(page, PROPIO_BERTA)).toBeVisible()

  // Se deja como estaba.
  await resumen.getByRole('button', { name: 'Quitar' }).click()
  await expect(page.getByText('Teléfono quitado.')).toBeVisible()
  expect(await extrasDeLead(antes)).toEqual([])
})

test('con la regla encendida el principal de otro lead bloquea y ofrece «Ver ese lead»; apagada, avisa y agrega', async ({
  page,
}, info) => {
  const lead = await fichaDeBerta(t, page, `Regla panel ${info.project.name}`)
  const otro = await nuevoLead({
    corto: `Regla otro ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
  })
  const delOtro = otro.telefono.slice(t.codigo.length)

  await fijarAjustesDeTelefonos(6, true)
  await irAFicha(page, lead.id)
  const panel = await abrirEdicion(page)
  await agregarEn(panel).click()
  let modal = modalDeExtra(page)
  await modal.getByLabel('Teléfono extra').fill(delOtro)
  await expect(modal.getByText(/Un teléfono extra no puede repetirse en otro lead/)).toBeVisible()
  await expect(modal.getByRole('button', { name: 'Agregar', exact: true })).toBeDisabled()
  const enlace = modal.getByRole('link', { name: 'Ver ese lead' })
  await expect(enlace).toHaveAttribute('href', `/leads/${otro.id}`)
  await capturar(page, info, 'extra-bloqueado-por-la-regla')
  expect(await extrasDeLead(lead.id)).toEqual([])
  // Con algo escrito, cerrar pregunta antes de descartar.
  await modal.getByRole('button', { name: 'Cancelar' }).click()
  await modal.getByRole('button', { name: 'Descartar' }).click()
  await expect(modalDeExtra(page)).toHaveCount(0)

  // Apagada: como hoy, avisa sin bloquear.
  await fijarAjustesDeTelefonos(6, false)
  await irAFicha(page, lead.id)
  await abrirEdicion(page)
  await agregarEn(panelDeEdicion(page)).click()
  modal = modalDeExtra(page)
  await modal.getByLabel('Teléfono extra').fill(delOtro)
  await expect(modal.getByText(/Es el teléfono principal de/)).toBeVisible()
  await expect(modal.getByRole('button', { name: 'Agregar', exact: true })).toBeEnabled()
  await page.keyboard.press('Enter')
  await expect(page.getByText('Teléfono agregado.')).toBeVisible()
  expect(await extrasDeLead(lead.id)).toHaveLength(1)
})

test('con el máximo en 2 y un lead de 3, el aviso dice cuántos quitar y la dueña ve «Cambiar el máximo»', async ({
  page,
}, info) => {
  const propio = await nuevoLead({
    corto: `Tope panel ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.duena,
  })
  await ponerExtras(
    propio.id,
    Array.from({ length: 3 }, () => ({ telefono: completoCon(t, nacional()), etiqueta: null })),
  )
  await fijarAjustesDeTelefonos(2, false)
  await entrar(page, t.personas.duena)
  await irAFicha(page, propio.id)
  await expect(page.getByRole('button', { name: 'Agregar teléfono' })).toBeDisabled()
  await expect(
    page.getByText(
      'Este lead tiene 3 teléfonos extra y el máximo es 2: quita 2 para agregar otro.',
    ),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Cambiar el máximo' })).toHaveAttribute(
    'href',
    /seccion=telefonos/,
  )
  // Los suyos quedan, y quitar sigue valiendo.
  expect(await extrasDeLead(propio.id)).toHaveLength(3)
  await page.getByRole('button', { name: 'Quitar' }).first().click()
  await expect(page.getByText('Teléfono quitado.')).toBeVisible()
  expect(await extrasDeLead(propio.id)).toHaveLength(2)
})
