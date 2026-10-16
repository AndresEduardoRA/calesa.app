import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { idDePersona } from './soporte/leads-alta'
import { extrasDeLead, irAFicha, meterSeguimiento, ponerExtras } from './soporte/leads-ficha'
import { abrirAgregarTelefono, nacional } from './soporte/leads-ficha-telefonos'
import { irALeads, nombre } from './soporte/leads-listado'
import { abrirMenuDelLead } from './soporte/leads-marcas'
import {
  abrirPestanaDeSeguimientos,
  modalDeSeguimiento,
  seguimientosEnLaBase,
} from './soporte/leads-seguimientos'
import {
  capturar,
  limpiarRecorrido,
  prepararRecorrido,
  recibeElClic,
  type TerrenoDelRecorrido,
} from './soporte/recorrido'

// El recorrido de la IA (9d-3), tercera parte: un aviso con un modal sucio abierto (D) y la red que se
// cae con un modal abierto y al paginar (E). Capturas con `E2E_CAPTURAS`.
test.describe.configure({ mode: 'serial' })

let r: TerrenoDelRecorrido

test.beforeAll(async ({}, info) => {
  r = await prepararRecorrido(info.project.name, 'Avisos')
})

test.afterAll(async () => {
  await limpiarRecorrido(r)
})

test('D · un aviso con un modal sucio abierto: su botón recibe el clic y el modal queda con lo escrito', async ({
  page,
}, info) => {
  await ponerExtras(r.dos.id, [{ telefono: `${r.t.codigo}${nacional()}`, etiqueta: 'Casa' }])
  await entrar(page, r.ana.email)
  await irAFicha(page, r.dos.id)
  await page.getByRole('button', { name: 'Quitar' }).click()
  const aviso = page.locator('[data-sonner-toast]').filter({ hasText: 'Teléfono quitado.' })
  await expect(aviso).toBeVisible()
  const modal = await abrirAgregarTelefono(page)
  const escrito = nacional()
  await modal.getByLabel('Teléfono extra').fill(escrito)
  await capturar(page, info, 'aviso-con-modal')
  const deshacer = aviso.getByRole('button', { name: 'Deshacer' })
  await recibeElClic(deshacer)
  await deshacer.click()
  await expect(page.getByText('Teléfono restituido.')).toBeVisible()
  await expect(modal).toBeVisible()
  await expect(modal.getByLabel('Teléfono extra')).toHaveValue(escrito)
  await expect(modal.getByText('Tienes cambios sin guardar.')).toHaveCount(0)
  await capturar(page, info, 'aviso-deshacer-con-modal')
  expect(await extrasDeLead(r.dos.id)).toHaveLength(1)
})

test('D · «Abrir ficha» del aviso de un lead nuevo con un modal sucio abierto', async ({
  page,
}, info) => {
  await entrar(page, r.ana.email)
  await irALeads(page)
  await expect(async () => {
    await page.getByRole('button', { name: 'Nuevo lead' }).click()
    await expect(page.getByRole('dialog', { name: 'Nuevo lead' })).toBeVisible({ timeout: 1000 })
  }).toPass()
  const alta = page.getByRole('dialog', { name: 'Nuevo lead' })
  await alta.getByLabel('Teléfono principal').fill(nacional())
  await alta.getByLabel('Nombre').fill(nombre(`Nuevo del aviso ${info.project.name}`))
  await page.keyboard.press('Control+s')
  const aviso = page
    .locator('[data-sonner-toast]')
    .filter({ hasText: /guardado|creado|Abrir ficha/i })
  await expect(aviso.getByRole('button', { name: 'Abrir ficha' })).toBeVisible()
  // El alta queda abierta y vacía para el siguiente: se cierra para volver a la tabla.
  await expect(alta.getByLabel('Teléfono principal')).toHaveValue('')
  await capturar(page, info, 'alta-guardada')
  await page.keyboard.press('Escape')
  await expect(alta).toBeHidden()
  await (
    await abrirMenuDelLead(page, r.uno.nombre)
  )
    .getByRole('menuitem', { name: 'Anotar seguimiento…' })
    .click()
  const anotar = modalDeSeguimiento(page, 'Anotar')
  await anotar.getByLabel('Resumen').fill('Lo que no quiero perder')
  await capturar(page, info, 'aviso-abrir-ficha-con-modal')
  const abrir = aviso.getByRole('button', { name: 'Abrir ficha' })
  await recibeElClic(abrir)
  const antes = page.url()
  await abrir.click()
  // El modal no se cierra sin preguntar: la pregunta va en su pie, con el foco en «Seguir editando».
  await expect(anotar.getByText('Tienes cambios sin guardar.')).toBeVisible()
  await expect(anotar.getByRole('button', { name: 'Seguir editando' })).toBeFocused()
  await expect(anotar.getByLabel('Resumen')).toHaveValue('Lo que no quiero perder')
  expect(page.url()).toBe(antes)
  await capturar(page, info, 'aviso-abrir-ficha-pregunta')
  // Descartar cierra el modal y recién ahí va a la ficha del lead nuevo.
  await anotar.getByRole('button', { name: 'Descartar' }).click()
  await expect(page).toHaveURL(/\/leads\/[0-9a-f-]{36}\?seccion=seguimientos$/)
  await expect(
    page.getByRole('heading', { name: nombre(`Nuevo del aviso ${info.project.name}`), level: 1 }),
  ).toBeVisible()
})

test('E · sin red: lo escrito en el modal queda y sale una vez; «Ver más» dice que es la conexión', async ({
  page,
}, info) => {
  for (let i = 0; i < 21; i++) {
    await meterSeguimiento(r.dos.id, await idDePersona(r.ana.email))
  }
  const antes = (await seguimientosEnLaBase(r.dos.id)).length
  await entrar(page, r.ana.email)
  await page.goto(`/leads?lead=${r.dos.id}`)
  const drawer = page.getByRole('dialog', { name: r.dos.nombre })
  await abrirPestanaDeSeguimientos(page, drawer)
  const linea = drawer.getByRole('region', { name: 'Seguimientos' })

  // El código del modal se pide al abrirlo por primera vez: se abre una vez con red.
  await drawer.getByRole('button', { name: 'Anotar seguimiento' }).click()
  await expect(modalDeSeguimiento(page, 'Anotar').getByLabel('Resumen')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(modalDeSeguimiento(page, 'Anotar')).toHaveCount(0)

  await page.context().setOffline(true)
  await linea.getByRole('button', { name: 'Ver más' }).click()
  // Dice que es la conexión, no «algo falló de nuestro lado»; lo cargado queda.
  await expect(
    page.locator('[data-sonner-toast]').filter({ hasText: 'No hay conexión. Vuelve a intentar' }),
  ).toBeVisible()
  await expect(page.getByText(/Algo falló de nuestro lado/)).toHaveCount(0)
  await expect(linea.getByRole('article')).toHaveCount(20)
  await capturar(page, info, 'sin-red-ver-mas')

  await drawer.getByRole('button', { name: 'Anotar seguimiento' }).click()
  const anotar = modalDeSeguimiento(page, 'Anotar')
  await anotar.getByLabel('Resumen').fill('Escrito sin conexión')
  await anotar.getByRole('button', { name: 'Guardar' }).click()
  await expect(anotar.getByText(/se va a guardar solo cuando vuelva/)).toBeVisible()
  await expect(anotar.getByLabel('Resumen')).toHaveValue('Escrito sin conexión')
  await capturar(page, info, 'sin-red-modal')
  await page.context().setOffline(false)
  await expect(anotar).toHaveCount(0)
  await expect.poll(async () => (await seguimientosEnLaBase(r.dos.id)).length).toBe(antes + 1)
  await linea.getByRole('button', { name: 'Ver más' }).click()
  await expect(linea.getByRole('article')).not.toHaveCount(20)
})
