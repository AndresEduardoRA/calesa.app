import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import { irALeads } from './soporte/leads-listado'
import { nuevoLead } from './soporte/leads-ficha'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import {
  abrirAgendar,
  abrirAnotar,
  abrirPestanaDeSeguimientos,
  modalDeSeguimiento,
  recordatorio,
  recordatoriosEnLaBase,
  seguimiento,
  seguimientosEnLaBase,
} from './soporte/leads-seguimientos'

// La pestaña «Seguimientos» del drawer rápido (`?lead=<id>&pestana=seguimientos`): se lee al elegirla,
// vive en la URL, anota y agenda con los modales de la ficha dibujados dentro del drawer (Esc y
// «atrás» cierran sólo el modal), y sin la cartera no ofrece nada.
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

type Pagina = Parameters<typeof irALeads>[0]

const drawerDe = (page: Pagina, nombre: string) => page.getByRole('dialog', { name: nombre })

// Entrar con el drawer ya abierto: el título de la lista queda detrás del drawer (no se espera ese).
async function irAlDrawer(page: Pagina, consulta: string, nombre: string) {
  await page.goto(`/leads${consulta}`)
  await expect(drawerDe(page, nombre)).toBeVisible()
}

test('la pestaña vive en la URL, se lee sólo al elegirla, no lleva número y sobrevive a recargar', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Rap Pestana ${info.project.name}`)
  await entrar(page, t.personas.berta)
  let lecturas = 0
  page.on('request', (pedido) => {
    if (pedido.url().includes('/rpc/lead_seguimientos')) {
      lecturas++
    }
  })
  await irALeads(page)
  await expect(async () => {
    await page.getByText(lead.nombre, { exact: true }).locator('visible=true').first().click()
    await expect(drawerDe(page, lead.nombre)).toBeVisible({ timeout: 1000 })
  }).toPass()
  const drawer = drawerDe(page, lead.nombre)
  await expect(drawer.getByText('Origen del lead')).toBeVisible()
  expect(lecturas).toBe(0)

  await abrirPestanaDeSeguimientos(page, drawer)
  expect(lecturas).toBeGreaterThan(0)
  await expect(drawer.getByRole('tab', { name: 'Seguimientos', exact: true })).toHaveText(
    'Seguimientos',
  )
  await expect(drawer.getByText('Todavía no hay seguimientos')).toBeVisible()
  await expect(drawer.getByRole('region', { name: 'Tus recordatorios' })).toBeVisible()

  await page.reload()
  await expect(drawerDe(page, lead.nombre)).toBeVisible()
  await expect(
    drawerDe(page, lead.nombre).getByRole('tab', { name: 'Seguimientos', exact: true }),
  ).toHaveAttribute('aria-selected', 'true')
  await expect(
    drawerDe(page, lead.nombre).getByRole('region', { name: 'Seguimientos' }),
  ).toBeVisible()

  // Cambiar de pestaña no suma al historial: «atrás» cierra el drawer.
  await irALeads(page)
  await page.getByText(lead.nombre, { exact: true }).locator('visible=true').first().click()
  // Con el teclado: la pestaña elegida es la parada de Tab y las flechas cambian de pestaña.
  const resumen = drawerDe(page, lead.nombre).getByRole('tab', { name: 'Resumen' })
  await resumen.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/pestana=seguimientos/)
  await expect(
    drawerDe(page, lead.nombre).getByRole('tab', { name: 'Seguimientos', exact: true }),
  ).toBeFocused()
  await expect(
    drawerDe(page, lead.nombre).getByRole('region', { name: 'Seguimientos' }),
  ).toBeVisible()
  await page.goBack()
  await expect(page).not.toHaveURL(/lead=/)
  await expect(drawerDe(page, lead.nombre)).toHaveCount(0)
})

test('anotar desde el drawer: el modal va adentro, Esc y «atrás» cierran sólo el modal', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Rap Anotar ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irAlDrawer(page, `?lead=${lead.id}&pestana=seguimientos`, lead.nombre)
  const drawer = drawerDe(page, lead.nombre)
  await expect(drawer.getByRole('region', { name: 'Seguimientos' })).toBeVisible()

  await abrirAnotar(page)
  await page.keyboard.press('Escape')
  await expect(modalDeSeguimiento(page, 'Anotar')).toHaveCount(0)
  await expect(drawer).toBeVisible()
  await expect(page).toHaveURL(/pestana=seguimientos/)
  await expect(drawer.getByRole('button', { name: 'Anotar seguimiento' })).toBeFocused()

  await abrirAnotar(page)
  await page.goBack()
  await expect(modalDeSeguimiento(page, 'Anotar')).toHaveCount(0)
  await expect(drawer.getByRole('region', { name: 'Seguimientos' })).toBeVisible()

  const modal = await abrirAnotar(page)
  await modal.getByLabel('Resumen').fill('Anotado desde el drawer')
  await modal.getByRole('button', { name: 'Programar próximo contacto' }).click()
  await modal.getByRole('button', { name: 'Mañana 09:00' }).click()
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(seguimiento(page, 'Anotado desde el drawer')).toBeVisible()
  await expect(recordatorio(page, 'Anotado desde el drawer')).toBeVisible()
  await expect(drawer).toBeVisible()
  expect(await seguimientosEnLaBase(lead.id)).toHaveLength(1)
  expect(await recordatoriosEnLaBase(lead.id)).toHaveLength(1)
})

test('agendar y eliminar con «Deshacer», también desde el drawer', async ({ page }, info) => {
  const lead = await leadDeBerta(`Rap Agendar ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irAlDrawer(page, `?lead=${lead.id}&pestana=seguimientos`, lead.nombre)
  const drawer = drawerDe(page, lead.nombre)
  await expect(drawer.getByRole('region', { name: 'Tus recordatorios' })).toBeVisible()

  const agenda = await abrirAgendar(page)
  await agenda.getByLabel('De qué es').fill('Llamarlo desde el drawer')
  await agenda.getByRole('button', { name: 'Mañana 09:00' }).click()
  await agenda.getByRole('button', { name: 'Guardar' }).click()
  await expect(recordatorio(page, 'Llamarlo desde el drawer')).toBeVisible()
  await expect(drawer).toBeVisible()

  const modal = await abrirAnotar(page)
  await modal.getByLabel('Resumen').fill('Para eliminar en el drawer')
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await seguimiento(page, 'Para eliminar en el drawer')
    .getByRole('button', { name: 'Eliminar' })
    .click()
  await expect(seguimiento(page, 'Para eliminar en el drawer')).toHaveCount(0)
  await page.getByRole('button', { name: 'Deshacer' }).click()
  await expect(seguimiento(page, 'Para eliminar en el drawer')).toBeVisible()
})

test('fuera de la cartera: ni «Anotar» ni «Agendar», y la URL no abre el modal', async ({
  page,
}, info) => {
  const lead = await leadDeBerta(`Rap Ajeno ${info.project.name}`)
  await entrar(page, t.personas.duena)
  await irAlDrawer(
    page,
    `?alcance=todos&lead=${lead.id}&pestana=seguimientos&panel=anotar-seguimiento`,
    lead.nombre,
  )
  const drawer = drawerDe(page, lead.nombre)
  await expect(drawer.getByRole('region', { name: 'Seguimientos' })).toBeVisible()
  await expect(drawer.getByRole('button', { name: 'Anotar seguimiento' })).toHaveCount(0)
  await expect(drawer.getByRole('button', { name: 'Agendar recordatorio' })).toHaveCount(0)
  await expect(modalDeSeguimiento(page, 'Anotar')).toHaveCount(0)
})
