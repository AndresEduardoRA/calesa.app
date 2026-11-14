import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { exigir } from './soporte/leads'
import { nuevoLead } from './soporte/leads-ficha'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import {
  irALeads,
  limpiarListado,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'

// «+ Oportunidad» de cada fila del listado (tabla en escritorio, tarjeta en el celular): un modal corto (`?panel=oportunidad-rapida&para=<id>`) con
// el nombre del lead de título y el monto opcional; crea en la etapa inicial del embudo por defecto de quien mira, sin salir de la lista. Sólo
// en los leads de la cartera.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

const conElLead = (nombre: string) => `?${new URLSearchParams({ q: nombre }).toString()}`

const boton = (page: Parameters<typeof irALeads>[0], nombre: string) =>
  page.getByRole('button', { name: `+ Oportunidad para ${nombre}` })

async function deLaBase(leadId: string) {
  const { data, error } = await admin()
    .from('oportunidades')
    .select('titulo, monto_estimado, estado, embudo_id, etapa_id')
    .eq('lead_id', leadId)
    .returns<
      { titulo: string; monto_estimado: number | null; estado: string; etapa_id: string }[]
    >()
  exigir(error, 'leer las oportunidades del lead')
  return data ?? []
}

test('crear en dos toques desde la lista: título precargado, monto opcional y la etapa inicial', async ({
  page,
}, info) => {
  const lead = await nuevoLead({
    corto: `Rapida ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
  })
  await entrar(page, t.personas.berta)
  await irALeads(page, conElLead(lead.nombre))
  await boton(page, lead.nombre).click()
  await expect(page).toHaveURL(new RegExp(`panel=oportunidad-rapida&para=${lead.id}`))
  await expect(page).not.toHaveURL(/lead=/)
  const modal = page.getByRole('dialog', { name: 'Nueva oportunidad' })
  await expect(modal.getByLabel('Título')).toHaveValue(lead.nombre)

  // Un monto roto se dice junto al campo y el modal sigue abierto con lo escrito.
  await modal.getByLabel(/Monto estimado/).fill('mucho')
  await modal.getByRole('button', { name: 'Crear oportunidad' }).click()
  await expect(modal.getByText(/Escribe el monto con números/)).toBeVisible()
  expect(await deLaBase(lead.id)).toEqual([])

  await modal.getByLabel(/Monto estimado/).fill('25.000,50')
  await modal.getByRole('button', { name: 'Crear oportunidad' }).click()
  await expect(page.getByText(`Oportunidad creada para «${lead.nombre}».`)).toBeVisible()
  await expect(modal).toHaveCount(0)
  await expect(page).not.toHaveURL(/para=/)
  await expect(boton(page, lead.nombre)).toBeFocused()

  const creadas = await deLaBase(lead.id)
  expect(creadas).toHaveLength(1)
  expect(creadas[0]).toMatchObject({
    titulo: lead.nombre,
    monto_estimado: 25000.5,
    estado: 'abierta',
  })
  const { data: inicial } = await admin()
    .from('embudos_etapas')
    .select('es_inicial')
    .eq('id', creadas[0]?.etapa_id ?? '')
    .single<{ es_inicial: boolean }>()
  expect(inicial?.es_inicial).toBe(true)
})

test('sólo en los leads de la cartera, y un `para=` ajeno no abre', async ({ page }, info) => {
  const deBerta = await nuevoLead({
    corto: `Rapida Ajeno ${info.project.name}`,
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
  })
  await entrar(page, t.personas.duena)
  await irALeads(page, `${conElLead(deBerta.nombre)}&alcance=todos`)
  await expect(page.getByText(deBerta.nombre).first()).toBeVisible()
  await expect(boton(page, deBerta.nombre)).toHaveCount(0)

  await irALeads(
    page,
    `${conElLead(deBerta.nombre)}&alcance=todos&panel=oportunidad-rapida&para=${deBerta.id}`,
  )
  await expect(page.getByRole('dialog', { name: 'Nueva oportunidad' })).toHaveCount(0)
  expect(await deLaBase(deBerta.id)).toEqual([])
})
