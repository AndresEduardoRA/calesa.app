import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { telefonoAlAzar } from './soporte/leads-alta'
import { limpiarListado, prepararListado, type TerrenoDelListado } from './soporte/leads-listado'
import {
  abrirEdicion,
  irAFicha,
  nuevoLead,
  panelDeEdicion,
  tituloDeLaFicha,
} from './soporte/leads-ficha'

// El panel de edición de la ficha (`?panel=editar-lead`) pide el layout y los catálogos de lead (hasta 100 orígenes y 100 tipos) cuando se
// abre, desde el navegador, y no viajan con el documento de la ficha (cierre 5b; cuánto pesa la ficha con los catálogos al tope:
// `leads-ficha.spec.ts`). Lo que se escribe y se guarda va en `leads-ficha-edicion.spec.ts`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

// Un lead de Berta para este test, y a su ficha como ella.
async function fichaDeBerta(page: Page, corto: string) {
  const lead = await nuevoLead({
    corto,
    telefono: `${t.codigo}${telefonoAlAzar()}`,
    deQuien: t.personas.berta,
  })
  await entrar(page, t.personas.berta)
  await irAFicha(page, lead.id)
  await expect(tituloDeLaFicha(page, lead.nombre)).toBeVisible()
  return lead
}

test('el panel pide sus catálogos al abrirse: antes no, sin red dice que no pudo y «Reintentar» lo abre', async ({
  page,
}, info) => {
  const pedidos: string[] = []
  page.on('request', (pedido) => {
    if (pedido.url().includes('/rpc/leads_catalogos')) {
      pedidos.push(pedido.url())
    }
  })
  const lead = await fichaDeBerta(page, `Catálogos ${info.project.name}`)
  // La ficha vino del servidor con lo suyo: el navegador no leyó los catálogos de lead (el layout y los 100 orígenes y tipos).
  expect(pedidos).toHaveLength(0)

  let caida = true
  await page.route('**/rpc/leads_catalogos*', async (ruta) => {
    if (caida) {
      await ruta.abort()
    } else {
      await ruta.continue()
    }
  })
  const panel = await abrirEdicion(page)
  await expect(panel.getByText('No se pudo cargar el formulario.')).toBeVisible()
  await expect(panel.getByLabel('Nombre')).toHaveCount(0)

  caida = false
  await panel.getByRole('button', { name: 'Reintentar' }).click()
  await expect(panel.getByLabel('Nombre')).toHaveValue(lead.nombre)
  // Cada apertura lee los catálogos al día: abrirlo otra vez los vuelve a pedir.
  const leidos = pedidos.length
  await panel.getByRole('button', { name: 'Cancelar' }).click()
  await expect(panel).toBeHidden()
  await abrirEdicion(page)
  await expect(panel.getByLabel('Nombre')).toHaveValue(lead.nombre)
  expect(pedidos.length).toBe(leidos + 1)
})

test('un ?panel=editar-lead en la URL abre el panel al llegar, con sus catálogos', async ({
  page,
}, info) => {
  const lead = await fichaDeBerta(page, `Directo ${info.project.name}`)
  await page.goto(`/leads/${lead.id}?panel=editar-lead`)
  await expect(panelDeEdicion(page).getByLabel('Nombre')).toHaveValue(lead.nombre)
})
