import type { Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { exigir } from './soporte/leads'
import { idDePersona } from './soporte/leads-alta'
import { nuevoLead } from './soporte/leads-ficha'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import {
  delLead,
  irALeads,
  limpiarListado,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import {
  meterRecordatorio,
  modalDeSeguimiento,
  tipoDeSeguimiento,
} from './soporte/leads-seguimientos'

// El listado de leads dice cuándo fue el último seguimiento (con su tipo y su título si quien mira lo ve) y cuál es su próximo recordatorio: «hace 3 días»,
// «en 2 días», «vencido hace 1 día». Un último seguimiento privado de otra persona sólo da la fecha; los vacíos ofrecen su atajo (sólo en la cartera).
test.describe.configure({ mode: 'serial' })

const HORA = 3_600_000
const DIA = 24 * HORA

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

const conElLead = (nombre: string) => `?${new URLSearchParams({ q: nombre }).toString()}`
const haceMs = (ms: number) => new Date(Date.now() - ms).toISOString()
const dentroDe = (ms: number) => new Date(Date.now() + ms).toISOString()

async function leadDe(deQuien: string, corto: string) {
  return nuevoLead({ corto, telefono: completoCon(t, nacional()), deQuien })
}

// Un seguimiento puesto por la base (la RPC no deja fechar en el pasado sin pasar por la pantalla).
async function meterSeguimiento(datos: {
  leadId: string
  quien: string
  titulo: string
  haceMs: number
  visibilidad: 'publico' | 'privado'
}) {
  const tipo = await tipoDeSeguimiento('llamada')
  const { error } = await admin()
    .from('seguimientos')
    .insert({
      lead_id: datos.leadId,
      usuario_id: await idDePersona(datos.quien),
      tipo_id: tipo.id,
      titulo: datos.titulo,
      visibilidad: datos.visibilidad,
      ocurrido_en: haceMs(datos.haceMs),
    })
  exigir(error, 'insertar el seguimiento')
}

async function verLaFila(page: Page, quien: string, lead: { nombre: string }, mas = '') {
  await entrar(page, quien)
  await irALeads(page, `${conElLead(lead.nombre)}${mas}`)
  const fila = delLead(page, lead.nombre.replace(/^E2E /, ''))
  await expect(fila).toBeVisible()
  return fila
}

test('E2E la fila dice el último seguimiento con su tipo y «hace 3 días», y el recordatorio «en 2 días»', async ({
  page,
}, info) => {
  const lead = await leadDe(t.personas.berta, `Contacto Completo ${info.project.name}`)
  await meterSeguimiento({
    leadId: lead.id,
    quien: t.personas.berta,
    titulo: `Hablamos del precio ${info.project.name}`,
    haceMs: 3 * DIA,
    visibilidad: 'publico',
  })
  await meterRecordatorio({
    leadId: lead.id,
    usuarioId: await idDePersona(t.personas.berta),
    titulo: `Volver a llamar ${info.project.name}`,
    recordarEn: dentroDe(2 * DIA),
  })
  const fila = await verLaFila(page, t.personas.berta, lead)
  const seguimiento = fila.locator('[data-ultimo-seguimiento]')
  await expect(seguimiento).toContainText(`Hablamos del precio ${info.project.name}`)
  await expect(seguimiento).toContainText('Llamada')
  await expect(seguimiento).toContainText('hace 3 días')
  const recordatorio = fila.locator('[data-recordatorio-de-fila]')
  await expect(recordatorio).toContainText(`Volver a llamar ${info.project.name}`)
  await expect(recordatorio).toContainText('en 2 días')
  await expect(recordatorio).not.toHaveAttribute('data-vencido', 'true')

  // Un clic en el seguimiento abre la ficha en sus seguimientos (no el drawer); uno en el recordatorio, el recordatorio.
  await seguimiento.click()
  await expect(page).toHaveURL(new RegExp(`/leads/${lead.id}\\?seccion=seguimientos`))
  await irALeads(page, conElLead(lead.nombre))
  await fila.locator('[data-recordatorio-de-fila]').click()
  await expect(page).toHaveURL(new RegExp(`/leads/${lead.id}\\?.*panel=editar-recordatorio`))
  await expect(page.getByRole('dialog', { name: 'Editar recordatorio' })).toBeVisible()
})

test('E2E un recordatorio vencido se resalta y lo dice con texto', async ({ page }, info) => {
  const lead = await leadDe(t.personas.berta, `Contacto Vencido ${info.project.name}`)
  await meterRecordatorio({
    leadId: lead.id,
    usuarioId: await idDePersona(t.personas.berta),
    titulo: `Se pasó ${info.project.name}`,
    recordarEn: haceMs(DIA),
  })
  const fila = await verLaFila(page, t.personas.berta, lead)
  const recordatorio = fila.locator('[data-recordatorio-de-fila]')
  await expect(recordatorio).toContainText('vencido hace 1 día')
  await expect(recordatorio).toHaveAttribute('data-vencido', 'true')
})

test('E2E sin seguimientos ni recordatorio: «Sin seguimientos» con «Anotar seguimiento» y «—» con «Programar»', async ({
  page,
}, info) => {
  const lead = await leadDe(t.personas.berta, `Contacto Vacio ${info.project.name}`)
  const fila = await verLaFila(page, t.personas.berta, lead)
  await expect(fila.getByText('Sin seguimientos')).toBeVisible()
  await expect(fila.getByRole('img', { name: 'Sin recordatorio' })).toBeVisible()
  await fila.getByRole('button', { name: 'Programar' }).click()
  await expect(page.getByRole('dialog', { name: 'Agendar recordatorio' })).toBeVisible()
  await page.keyboard.press('Escape')
  await fila.getByRole('button', { name: 'Anotar seguimiento' }).click()
  await expect(modalDeSeguimiento(page, 'Anotar')).toBeVisible()
})

test('E2E un último seguimiento privado de otra persona sólo da la fecha; el lead fuera de la cartera no ofrece atajos', async ({
  page,
}, info) => {
  const lead = await leadDe(t.personas.berta, `Contacto Privado ${info.project.name}`)
  const privado = `Dato privado de Berta ${info.project.name}`
  await meterSeguimiento({
    leadId: lead.id,
    quien: t.personas.berta,
    titulo: `Publico viejo ${info.project.name}`,
    haceMs: 5 * DIA,
    visibilidad: 'publico',
  })
  await meterSeguimiento({
    leadId: lead.id,
    quien: t.personas.berta,
    titulo: privado,
    haceMs: 2 * DIA,
    visibilidad: 'privado',
  })
  // La dueña lo ve con «todos»: el último es privado de Berta, así que llega sólo «hace 2 días».
  const fila = await verLaFila(page, t.personas.duena, lead, '&alcance=todos')
  const seguimiento = fila.locator('[data-ultimo-seguimiento]')
  await expect(seguimiento).toContainText('hace 2 días')
  await expect(seguimiento).not.toContainText('Llamada')
  await expect(page.getByText(privado)).toHaveCount(0)
  await expect(page.getByText(`Publico viejo ${info.project.name}`)).toHaveCount(0)
  // Fuera de su cartera, y sin recordatorio propio: sin «Programar» ni «Anotar».
  await expect(fila.getByRole('button', { name: 'Programar' })).toHaveCount(0)
  await expect(fila.getByRole('button', { name: 'Anotar seguimiento' })).toHaveCount(0)

  // Berta, su autora, sí ve el detalle.
  const deBerta = await verLaFila(page, t.personas.berta, lead)
  await expect(deBerta.locator('[data-ultimo-seguimiento]')).toContainText(privado)
})
