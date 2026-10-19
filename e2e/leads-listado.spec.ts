import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { aLaVista, cerrarPanelDeFiltros, esMovil, panelDeFiltros } from './soporte/inventario'
import { crearLead } from './soporte/leads'
import { mandarAlLimbo, telefonoAlAzar } from './soporte/leads-alta'
import {
  AJENO_CARLOS,
  CI_DE_CARLOS,
  PROPIO_BERTA,
  PROPIO_DALIA,
  buscar,
  delLead,
  fila,
  filas,
  irALeads,
  limpiarListado,
  mandarALaPapelera,
  nombre,
  numeroDe,
  prepararListado,
  sinResultados,
  type TerrenoDelListado,
} from './soporte/leads-listado'

// El listado de leads (`/leads`) contra la app compilada y el Supabase local: quién ve qué según su
// alcance, el teléfono enmascarado, los privados (ni filtrando se revelan), el limbo, la papelera y
// la búsqueda. Filtros, vistas, drawer y paginación van en `leads-listado-filtros.spec.ts`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

const telefonoNuevo = () => `${t.codigo}${telefonoAlAzar()}`

test('sin leads.ver: sin ítem en el menú, sin lista y sin datos', async ({ page }) => {
  await entrar(page, t.sinVer)
  if (esMovil(page)) {
    await page.getByRole('button', { name: 'Abrir el menú' }).click()
  }
  await expect(aLaVista(page.getByRole('link', { name: 'Leads', exact: true }))).toHaveCount(0)
  await page.goto('/leads')
  await expect(page.getByText('No tienes permiso para ver leads.')).toBeVisible()
  // Ni un nombre en la página: no se consultó nada.
  const html = await page.content()
  expect(html).not.toContain(nombre(PROPIO_BERTA))
  expect(html).not.toContain(nombre(AJENO_CARLOS))
})

test('«propios» ve sólo lo suyo y no tiene el selector de «todos»', async ({ page }) => {
  await entrar(page, t.personas.berta)
  await irALeads(page)
  await expect(fila(page, PROPIO_BERTA)).toBeVisible()
  await expect(fila(page, AJENO_CARLOS)).toHaveCount(0)
  await expect(page.getByRole('group', { name: 'Qué leads ver' })).toHaveCount(0)
  // Pedir «todos» por la URL no amplía nada.
  await irALeads(page, '?alcance=todos')
  await expect(fila(page, PROPIO_BERTA)).toBeVisible()
  await expect(fila(page, AJENO_CARLOS)).toHaveCount(0)
  expect(await page.content()).not.toContain(CI_DE_CARLOS)
  // Ni buscándolo: el lead de Carlos no es de su cartera.
  await irALeads(page, buscar(AJENO_CARLOS))
  await expect(fila(page, AJENO_CARLOS)).toHaveCount(0)
})

test('«todos» ve lo ajeno con el teléfono enmascarado y sin los privados', async ({ page }) => {
  await entrar(page, t.personas.duena)
  await irALeads(page)
  // Por defecto, «míos»: sólo lo de su cartera.
  await expect(fila(page, PROPIO_DALIA)).toBeVisible()
  await expect(fila(page, AJENO_CARLOS)).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Míos' })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: 'Todos', exact: true }).click()
  await expect(page).toHaveURL(/alcance=todos/)
  const delAjeno = delLead(page, AJENO_CARLOS)
  await expect(delAjeno).toBeVisible()
  // Enmascarado, y sin la cédula, que es «solo la cartera»: lo dice en vez de un guion.
  await expect(delAjeno).toContainText('•')
  await expect(delAjeno).not.toContainText(t.telefonoDeCarlos)
  await expect(delAjeno).toContainText('Solo la cartera')
  await expect(delAjeno).not.toContainText(CI_DE_CARLOS)
  await expect(delAjeno).toContainText('azul')
  const html = await page.content()
  expect(html).not.toContain(CI_DE_CARLOS)
  expect(html).not.toContain(t.telefonoDeCarlos)
  // Lo suyo, completo.
  await expect(delLead(page, PROPIO_DALIA)).not.toContainText('•')
})

test('ni filtrando por el valor exacto de un privado ajeno se revela algo, y lo dice', async ({
  page,
}) => {
  await entrar(page, t.personas.duena)
  await irALeads(page, '?alcance=todos')
  await expect(fila(page, AJENO_CARLOS)).toBeVisible()
  const panel = await panelDeFiltros(page)
  // La aclaración, bajo el filtro del privado, sólo porque ve «todos».
  await expect(panel.getByText(/solo busca en tus leads/i).first()).toBeVisible()
  await panel.getByLabel('Cédula E2E').fill(CI_DE_CARLOS)
  await cerrarPanelDeFiltros(page)
  await expect(page).toHaveURL(/a\.e2e_ci=/)
  await expect(fila(page, AJENO_CARLOS)).toHaveCount(0)
  await expect(page.getByText(/El filtro «Cédula E2E» solo busca en tus leads/)).toBeVisible()
})

test('un lead en limbo o en la papelera no aparece, ni por nombre ni por número', async ({
  page,
}) => {
  const enLimbo = telefonoNuevo()
  const enPapelera = telefonoNuevo()
  const idLimbo = await crearLead({
    nombre: 'Limbo Uno',
    telefono: enLimbo,
    deQuien: t.personas.carlos,
  })
  const idPapelera = await crearLead({
    nombre: 'Papelera Uno',
    telefono: enPapelera,
    deQuien: t.personas.carlos,
  })
  const numeroLimbo = await numeroDe(enLimbo)
  const numeroPapelera = await numeroDe(enPapelera)
  await mandarAlLimbo(idLimbo)
  await mandarALaPapelera(idPapelera)

  await entrar(page, t.personas.duena)
  for (const consulta of [
    buscar(nombre('Limbo Uno')),
    buscar(nombre('Papelera Uno')),
    buscar(`#${String(numeroLimbo)}`),
    buscar(`#${String(numeroPapelera)}`),
  ]) {
    await irALeads(page, `${consulta}&alcance=todos`)
    await expect(sinResultados(page)).toBeVisible()
    await expect(filas(page)).toHaveCount(0)
  }
  // Y sin filtrar, en «todos», tampoco están.
  await irALeads(page, '?alcance=todos')
  await expect(fila(page, AJENO_CARLOS)).toBeVisible()
  await expect(fila(page, 'Limbo Uno')).toHaveCount(0)
  await expect(fila(page, 'Papelera Uno')).toHaveCount(0)
})

test('la búsqueda trata %, _, comas y comillas como texto y no rompe', async ({ page }) => {
  const nombres = {
    porcentaje: 'Descuento 100%',
    sinPorcentaje: 'Descuento 1000',
    guion: 'Guion_bajo',
    sinGuion: 'GuionXbajo',
    raro: 'Ana, "la" Pérez (cliente)',
    // Tildes, ñ y mayúsculas (5a-fix-1b): la búsqueda por candidatos y la página tienen que coincidir.
    ene: 'Ñandú Gómez Suárez',
    barra: 'Barra \\ invertida',
  }
  for (const corto of Object.values(nombres)) {
    await crearLead({ nombre: corto, telefono: telefonoNuevo(), deQuien: t.personas.berta })
  }
  await entrar(page, t.personas.berta)

  await irALeads(page, buscar('100%'))
  await expect(fila(page, nombres.porcentaje)).toBeVisible()
  await expect(fila(page, nombres.sinPorcentaje)).toHaveCount(0)

  // Un «%» solo no alcanza para buscar por nombre (5a-8: hacen falta 3 letras o dígitos seguidos): la lista entera, sin filtrar.
  await irALeads(page, buscar('%'))
  await expect(fila(page, nombres.porcentaje)).toBeVisible()
  await expect(fila(page, nombres.sinPorcentaje)).toBeVisible()
  await expect(fila(page, PROPIO_BERTA)).toBeVisible()

  await irALeads(page, buscar('Guion_bajo'))
  await expect(fila(page, nombres.guion)).toBeVisible()
  await expect(fila(page, nombres.sinGuion)).toHaveCount(0)

  // Con coma, paréntesis y comillas: llega a la base citado.
  await irALeads(page, buscar('Ana, "la"'))
  await expect(fila(page, nombres.raro)).toBeVisible()
  await irALeads(page, buscar('(cliente)'))
  await expect(fila(page, nombres.raro)).toBeVisible()
  await irALeads(page, buscar(`o'brien \\ * ,)`))
  await expect(sinResultados(page)).toBeVisible()

  // Tildes, ñ, mayúsculas y una barra: lo escrito es literal y se encuentra igual escrito de cualquier forma.
  await irALeads(page, buscar('ñandú'))
  await expect(fila(page, nombres.ene)).toBeVisible()
  await irALeads(page, buscar('GÓMEZ'))
  await expect(fila(page, nombres.ene)).toBeVisible()
  await irALeads(page, buscar('gómez suárez'))
  await expect(fila(page, nombres.ene)).toBeVisible()
  await irALeads(page, buscar('\\ inv'))
  await expect(fila(page, nombres.barra)).toBeVisible()
  await irALeads(page, buscar('Pérez (cliente)'))
  await expect(fila(page, nombres.ene)).toHaveCount(0)
  // Dos y un carácter no buscan por nombre (5a-8): se ve la lista entera, no «nada coincide». `leads-listado-busqueda-minima.spec.ts` mira la línea.
  await irALeads(page, buscar('ñ'))
  await expect(fila(page, nombres.ene)).toBeVisible()
  await expect(fila(page, PROPIO_BERTA)).toBeVisible()
  await irALeads(page, buscar('zq'))
  await expect(fila(page, PROPIO_BERTA)).toBeVisible()
  await expect(sinResultados(page)).toHaveCount(0)

  // Escrita en la barra, no sólo en la URL.
  await irALeads(page)
  await page.getByRole('searchbox', { name: 'Buscar por nombre o número' }).fill('Ana, "la"')
  await expect(page).toHaveURL(/q=Ana/)
  await expect(fila(page, nombres.raro)).toBeVisible()
  await expect(fila(page, PROPIO_BERTA)).toHaveCount(0)
})

test('se busca por el número que se ve, nunca por teléfono ni por el global ajeno', async ({
  page,
}) => {
  // Berta no tiene el permiso del número global: busca el propio, el que ve.
  await entrar(page, t.personas.berta)
  await irALeads(page, buscar(`#${String(t.numeroPropioDeBerta)}`))
  await expect(fila(page, PROPIO_BERTA)).toBeVisible()
  await irALeads(page, buscar(String(t.numeroPropioDeBerta)))
  await expect(fila(page, PROPIO_BERTA)).toBeVisible()
  // El número global de un lead que ve no se encuentra: sería un oráculo para saber cuál es.
  if (t.numeroDeBerta !== t.numeroPropioDeBerta) {
    await irALeads(page, buscar(`#${String(t.numeroDeBerta)}`))
    await expect(fila(page, PROPIO_BERTA)).toHaveCount(0)
  }
  // El teléfono de un lead no es un criterio de búsqueda: ni el ajeno ni, por lo mismo, el propio.
  await irALeads(page, buscar(t.telefonoDeCarlos))
  await expect(sinResultados(page)).toBeVisible()
})
