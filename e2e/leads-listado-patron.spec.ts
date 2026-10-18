import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { aLaVista, esMovil } from './soporte/inventario'
import { crearCampoDePrueba } from './soporte/leads-alta'
import { crearLead } from './soporte/leads'
import {
  delLead,
  irALeads,
  limpiarListado,
  nombre,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { menuDeFila } from './soporte/leads-marcas'
import { nadaSeSaleDelPanel } from './soporte/panel'

// El patrón de lista en el listado de leads (9i, `.claude/rules/ui.md`): un clic en cualquier parte de la fila o la tarjeta abre el resumen,
// salvo el del «⋯» y el de un enlace de la fila; con el teclado se alcanza el nombre, Enter abre y el foco vuelve al cerrar; la fila abierta
// se marca. Lo mismo vale para el inventario de vehículos (`vehiculos-resumen.spec.ts`).
test.describe.configure({ mode: 'serial' })

const CORTO = 'Patron fila'
let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  // Un campo de texto con una URL se dibuja como «Abrir enlace» y entra en la tabla y en la tarjeta.
  await crearCampoDePrueba({ clave: 'e2e_web', etiqueta: 'Web E2E', tipo: 'url', enTabla: true })
  await crearLead({
    nombre: CORTO,
    telefono: `59171${String(Math.floor(Math.random() * 900000) + 100000)}`,
    deQuien: t.personas.berta,
    atributos: { e2e_web: 'https://ejemplo.test/ana' },
  })
})

test.afterAll(async () => {
  await limpiarListado(t)
})

const resumen = (page: Parameters<typeof irALeads>[0]) =>
  page.getByRole('dialog', { name: nombre(CORTO) })

test('un clic en cualquier parte de la fila o la tarjeta abre el resumen, y la fila abierta se marca', async ({
  page,
}) => {
  await entrar(page, t.personas.berta)
  await irALeads(page)
  // La esquina de la fila o la tarjeta: ni el nombre ni una acción.
  await delLead(page, CORTO)
    .first()
    .click({ position: { x: 6, y: 6 } })
  await expect(resumen(page)).toBeVisible()
  await expect(page).toHaveURL(/lead=/)
  await expect(delLead(page, CORTO).first()).toHaveAttribute('data-state', 'selected')
})

test('en la tabla, una celda cualquiera (el teléfono, el tipo) también abre', async ({ page }) => {
  test.skip(esMovil(page), 'Las celdas son de la tabla; la tarjeta no las tiene.')
  await entrar(page, t.personas.berta)
  await irALeads(page)
  await delLead(page, CORTO).first().getByRole('cell').nth(2).click()
  await expect(resumen(page)).toBeVisible()
})

test('el «⋯» y el enlace de la fila no abren el resumen', async ({ page }) => {
  await entrar(page, t.personas.berta)
  await irALeads(page)
  // El enlace se abre en otra pestaña y la fila no se abre.
  const enlace = aLaVista(delLead(page, CORTO).getByRole('link', { name: 'Abrir enlace' }))
  // En la tabla el enlace está en una columna que se desplaza: se lleva a la vista, sin la columna pegada encima.
  await enlace.evaluate((a) => {
    const contenedor = a.closest('[data-slot="table-container"]')
    if (contenedor) {
      contenedor.scrollLeft = contenedor.scrollWidth
    }
  })
  const [otra] = await Promise.all([page.context().waitForEvent('page'), enlace.click()])
  await otra.close()
  await expect(page).not.toHaveURL(/lead=/)
  await expect(resumen(page)).toHaveCount(0)
  // El «⋯» abre su menú y no el resumen.
  await menuDeFila(page, CORTO).click()
  await expect(page.getByRole('menu')).toBeVisible()
  await expect(page).not.toHaveURL(/lead=/)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toBeHidden()
})

test('con el teclado se alcanza el nombre, Enter abre el resumen y al cerrarlo el foco vuelve', async ({
  page,
}) => {
  await entrar(page, t.personas.berta)
  await irALeads(page)
  const boton = aLaVista(page.getByRole('button', { name: `Abrir ${nombre(CORTO)}`, exact: true }))
  await boton.focus()
  await page.keyboard.press('Enter')
  await expect(resumen(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(resumen(page)).toHaveCount(0)
  await expect(boton).toBeFocused()
})

test('con el texto al 200 % el resumen no se corta por la derecha', async ({ page }) => {
  await entrar(page, t.personas.berta)
  await irALeads(page)
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  await aLaVista(page.getByRole('button', { name: `Abrir ${nombre(CORTO)}`, exact: true })).click()
  await expect(resumen(page)).toBeVisible()
  await nadaSeSaleDelPanel(resumen(page))
})
