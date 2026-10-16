import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import { irALeads } from './soporte/leads-listado'
import { nuevoLead } from './soporte/leads-ficha'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { abrirMenuDelLead, menuDelLead } from './soporte/leads-marcas'
import {
  editorDe,
  modalDeRecordatorio,
  modalDeSeguimiento,
  recordatoriosEnLaBase,
  seguimientosEnLaBase,
} from './soporte/leads-seguimientos'

// El «⋯» de cada fila (tabla en escritorio, tarjeta en el celular) anota un seguimiento o agenda un
// recordatorio sin abrir el drawer ni la ficha (`?panel=…&para=<id>`): sólo en los leads de la
// cartera, con el foco de vuelta al «⋯», un aviso al guardar y el editor pedido recién al abrir.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

const NO_DISPONIBLE = 'No encontramos este lead o no tienes acceso.'

async function leadDe(deQuien: string, corto: string) {
  return nuevoLead({ corto, telefono: completoCon(t, nacional()), deQuien })
}

// Busca al lead por su nombre: queda primero en la lista y a la vista.
const conElLead = (nombre: string) => `?${new URLSearchParams({ q: nombre }).toString()}`

async function elegir(page: Page, nombre: string, item: string) {
  const menu = await abrirMenuDelLead(page, nombre)
  await menu.getByRole('menuitem', { name: item }).click()
}

test('anotar desde el «⋯»: sin abrir el drawer, con aviso y el foco de vuelta al «⋯»', async ({
  page,
}, info) => {
  const editor: string[] = []
  page.on('response', (respuesta) => {
    const url = respuesta.url()
    if (url.includes('/_next/static/') && url.endsWith('.js')) {
      void respuesta
        .text()
        .then((texto) => {
          if (texto.includes('ProseMirror')) {
            editor.push(url)
          }
        })
        .catch(() => undefined)
    }
  })
  const lead = await leadDe(t.personas.berta, `Fila Anotar ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irALeads(page, conElLead(lead.nombre))
  await page.waitForLoadState('networkidle')
  // El editor no viaja con el listado: se pide al abrir el modal.
  expect(editor).toEqual([])

  await elegir(page, lead.nombre, 'Anotar seguimiento…')
  const modal = modalDeSeguimiento(page, 'Anotar')
  await expect(modal).toBeVisible()
  await expect(editorDe(modal)).toBeVisible()
  expect(editor.length).toBeGreaterThan(0)
  await expect(page).toHaveURL(new RegExp(`panel=anotar-seguimiento&para=${lead.id}`))
  await expect(page).not.toHaveURL(/lead=/)
  await expect(page.getByRole('dialog', { name: lead.nombre })).toHaveCount(0)

  // Recargar lo reabre; «Guardar» lo deja en la base y avisa.
  await page.reload()
  await expect(modalDeSeguimiento(page, 'Anotar')).toBeVisible()
  await modal.getByLabel('Resumen').fill('Anotado desde la fila')
  await modal.getByRole('button', { name: 'Guardar' }).click()
  await expect(page.getByText(`Seguimiento anotado en «${lead.nombre}».`)).toBeVisible()
  await expect(modal).toHaveCount(0)
  await expect(page).not.toHaveURL(/para=/)
  await expect(menuDelLead(page, lead.nombre)).toBeFocused()
  expect((await seguimientosEnLaBase(lead.id)).map((s) => s.titulo)).toEqual([
    'Anotado desde la fila',
  ])
})

test('agendar desde el «⋯», también con el teclado', async ({ page }, info) => {
  const lead = await leadDe(t.personas.berta, `Fila Agendar ${info.project.name}`)
  await entrar(page, t.personas.berta)
  await irALeads(page, conElLead(lead.nombre))
  await abrirMenuDelLead(page, lead.nombre)
  await page.keyboard.press('Escape')
  await expect(menuDelLead(page, lead.nombre)).toBeFocused()

  // Enter abre el menú y las flechas llegan a «Agendar recordatorio…».
  await page.keyboard.press('Enter')
  const item = page.getByRole('menuitem', { name: 'Agendar recordatorio…' })
  await expect(item).toBeVisible()
  await expect(async () => {
    await page.keyboard.press('ArrowDown')
    await expect(item).toBeFocused({ timeout: 200 })
  }).toPass()
  await page.keyboard.press('Enter')
  const modal = modalDeRecordatorio(page, 'Agendar')
  await expect(modal.getByLabel('De qué es')).toBeFocused()
  await page.keyboard.type('Llamarlo el lunes')
  await modal.getByRole('button', { name: 'Mañana 09:00' }).click()
  await modal.getByLabel('De qué es').focus()
  await page.keyboard.press('ControlOrMeta+s')
  await expect(page.getByText(`Recordatorio agendado para «${lead.nombre}».`)).toBeVisible()
  await expect(modal).toHaveCount(0)
  await expect(menuDelLead(page, lead.nombre)).toBeFocused()
  expect((await recordatoriosEnLaBase(lead.id)).map((r) => r.titulo)).toEqual(['Llamarlo el lunes'])
})

test('sólo en los leads de la cartera, y un `para=` inventado o ajeno no abre', async ({
  page,
}, info) => {
  const deBerta = await leadDe(t.personas.berta, `Fila Ajeno ${info.project.name}`)
  const propio = await leadDe(t.personas.duena, `Fila Propio ${info.project.name}`)
  await entrar(page, t.personas.duena)

  await irALeads(page, `${conElLead(deBerta.nombre)}&alcance=todos`)
  const ajeno = await abrirMenuDelLead(page, deBerta.nombre)
  await expect(ajeno.getByRole('menuitem', { name: 'Anotar seguimiento…' })).toHaveCount(0)
  await expect(ajeno.getByRole('menuitem', { name: 'Agendar recordatorio…' })).toHaveCount(0)
  await page.keyboard.press('Escape')

  await irALeads(page, conElLead(propio.nombre))
  const suyo = await abrirMenuDelLead(page, propio.nombre)
  await expect(suyo.getByRole('menuitem', { name: 'Anotar seguimiento…' })).toBeVisible()
  await expect(suyo.getByRole('menuitem', { name: 'Agendar recordatorio…' })).toBeVisible()
  await page.keyboard.press('Escape')

  // A mano: uno ajeno (está en la lista con «todos», pero no en su cartera) y uno inventado.
  for (const consulta of [
    `${conElLead(deBerta.nombre)}&alcance=todos&panel=anotar-seguimiento&para=${deBerta.id}`,
    '?panel=agendar-recordatorio&para=00000000-0000-4000-8000-000000000000',
  ]) {
    await irALeads(page, consulta)
    await expect(page.getByText(NO_DISPONIBLE)).toBeVisible()
    await expect(page).not.toHaveURL(/para=/)
    await expect(modalDeSeguimiento(page, 'Anotar')).toHaveCount(0)
    await expect(modalDeRecordatorio(page, 'Agendar')).toHaveCount(0)
  }
  expect(await seguimientosEnLaBase(deBerta.id)).toEqual([])
})
