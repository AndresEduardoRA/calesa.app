import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import {
  AJENO_CARLOS,
  PROPIO_BERTA,
  delLead,
  fila,
  irALeads,
  limpiarListado,
  nombre,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { capturar } from './soporte/recorrido'

// «Editar» en el resumen de un lead (`?lead=<id>`, 9i): abre el panel de edición de la ficha encima del resumen, lo lee al pulsar (un
// pedido) y, al guardar o cancelar, vuelve al resumen con el dato al día. Sin la cartera no hay «Editar». Capturas:
// `E2E_CAPTURAS=e2e-capturas/9i`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

type Pagina = Parameters<typeof irALeads>[0]

const resumenDe = (page: Pagina, corto: string) => page.getByRole('dialog', { name: nombre(corto) })
const panelDe = (page: Pagina, corto: string) =>
  page.getByRole('dialog', { name: `Editar ${nombre(corto)}` })

async function abrirResumen(page: Pagina, corto: string) {
  await irALeads(page)
  await fila(page, corto).click()
  const resumen = resumenDe(page, corto)
  await expect(resumen).toBeVisible()
  return resumen
}

test('«Editar» abre el panel encima del resumen, y al guardar vuelve al resumen con el nombre nuevo', async ({
  page,
}, info) => {
  await entrar(page, t.personas.berta)
  const resumen = await abrirResumen(page, PROPIO_BERTA)
  // El resumen no leyó la ficha: sólo lo del lead.
  const fichas: string[] = []
  page.on('request', (pedido) => {
    if (pedido.url().includes('/rpc/lead_ficha')) {
      fichas.push(pedido.url())
    }
  })
  await resumen.getByRole('button', { name: 'Editar', exact: true }).click()
  const panel = panelDe(page, PROPIO_BERTA)
  await expect(panel).toBeVisible()
  await expect(page).toHaveURL(/panel=editar-lead/)
  await expect(page).toHaveURL(/lead=/)
  // Pulsar «Editar» costó un pedido: la ficha, con su versión.
  expect(fichas).toHaveLength(1)
  await capturar(page, info, 'resumen-de-lead-editando')
  await panel.getByLabel('Nombre', { exact: true }).fill(`${nombre(PROPIO_BERTA)} editado`)
  await panel.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(panel).toBeHidden()
  // Vuelve al resumen, ya con el nombre nuevo (lo leyó de nuevo).
  await expect(resumenDe(page, `${PROPIO_BERTA} editado`)).toBeVisible()
  await expect(page).toHaveURL(/lead=/)
  await expect(page).not.toHaveURL(/panel=/)
  await expect(delLead(page, `${PROPIO_BERTA} editado`)).toBeVisible()
  // Se deja como estaba.
  await resumenDe(page, `${PROPIO_BERTA} editado`)
    .getByRole('button', { name: 'Editar', exact: true })
    .click()
  const otra = panelDe(page, `${PROPIO_BERTA} editado`)
  await otra.getByLabel('Nombre', { exact: true }).fill(nombre(PROPIO_BERTA))
  await otra.getByRole('button', { name: 'Guardar', exact: true }).click()
  await expect(resumenDe(page, PROPIO_BERTA)).toBeVisible()
})

test('cancelar o pulsar Esc cierra sólo el panel: el resumen queda y el foco vuelve a «Editar»', async ({
  page,
}) => {
  await entrar(page, t.personas.berta)
  const resumen = await abrirResumen(page, PROPIO_BERTA)
  const editar = resumen.getByRole('button', { name: 'Editar', exact: true })
  await editar.click()
  const panel = panelDe(page, PROPIO_BERTA)
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
  await expect(page).toHaveURL(/lead=/)
})

test('recargar con el panel abierto lo reabre sobre el resumen', async ({ page }) => {
  await entrar(page, t.personas.berta)
  const resumen = await abrirResumen(page, PROPIO_BERTA)
  await resumen.getByRole('button', { name: 'Editar', exact: true }).click()
  await expect(panelDe(page, PROPIO_BERTA)).toBeVisible()
  await page.reload()
  await expect(panelDe(page, PROPIO_BERTA)).toBeVisible()
  await expect(resumenDe(page, PROPIO_BERTA)).toBeVisible()
})

test('sin el lead en su cartera el resumen no ofrece «Editar», pero sí «Abrir ficha»', async ({
  page,
}) => {
  await entrar(page, t.personas.veTodos)
  await irALeads(page, '?alcance=todos')
  await fila(page, AJENO_CARLOS).click()
  const resumen = resumenDe(page, AJENO_CARLOS)
  await expect(resumen).toBeVisible()
  await expect(resumen.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0)
  await expect(resumen.getByRole('link', { name: 'Abrir ficha' })).toBeVisible()
})

test('sin red al pulsar «Editar» lo dice con «Reintentar»', async ({ page, context }) => {
  await entrar(page, t.personas.berta)
  const resumen = await abrirResumen(page, PROPIO_BERTA)
  // El código del panel no se pidió todavía: sin red, no llega.
  await context.setOffline(true)
  await resumen.getByRole('button', { name: 'Editar', exact: true }).click()
  await expect(page.getByText('Sin conexión. No se pudo abrir esto.')).toBeVisible()
  await context.setOffline(false)
  await page.getByRole('button', { name: 'Reintentar' }).click()
  await expect(panelDe(page, PROPIO_BERTA)).toBeVisible()
  await panelDe(page, PROPIO_BERTA).getByRole('button', { name: 'Cancelar' }).click()
})
