import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import {
  exigirBarraOrdenada,
  exigirMarcadorQueCabe,
  exigirPanelAlCostadoSoloSiCabe,
  type PiezaDeLaBarra,
} from './soporte/barra-de-filtros'
import { admin } from './soporte/base'
import { idDe } from './soporte/leads'
import { aLaVista, esMovil } from './soporte/inventario'
import { irAlEmbudo } from './soporte/leads-oportunidades'
import {
  irALeads,
  limpiarListado,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { capturar, sinScrollHorizontal } from './soporte/recorrido'

// La barra del listado de leads (`<FilterShell>`) se lee en orden y desde la izquierda con el texto al 100 % y al 200 %, en escritorio y
// en el celular (cierre 5b, defecto 4.1: al 200 % «Vistas» quedaba sola, «Lista | Embudo», «Importar» y «Papelera» se repartían a la
// derecha cada uno en su fila y «Ítems por página» quedaba al final). El inventario de vehículos usa la misma barra: su spec está aparte
// (`barra-de-filtros-vehiculos-200.spec.ts`), porque preparar el inventario borra las cuentas de prueba.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  // Un lead de Berta con un nombre que cabe en los 16 rem de la columna del nombre.
  const { error } = await admin()
    .from('leads')
    .insert({
      nombre: `E2E Panel ${info.project.name}`,
      telefono_principal: `5917${info.project.name === 'movil' ? '83' : '82'}00001`,
      creado_por: await idDe(t.personas.berta),
    })
  expect(error).toBeNull()
})

test.afterAll(async () => {
  await limpiarListado(t)
})

// Las piezas de la barra de leads para Berta, en el orden del DOM. «Ítems por página» está en la barra desde `md` (768 px); por debajo, arriba
// de la lista.
function piezasDeLeads(page: Page): PiezaDeLaBarra[] {
  const piezas: PiezaDeLaBarra[] = [
    { nombre: 'Buscar', lugar: aLaVista(page.getByPlaceholder('Nombre o número')) },
    {
      nombre: 'Filtros',
      lugar: aLaVista(page.getByRole('button', { name: 'Filtros', exact: true })),
    },
    {
      nombre: 'Vistas',
      lugar: aLaVista(page.getByRole('button', { name: 'Vistas', exact: true })),
    },
    {
      nombre: 'Lista | Embudo',
      lugar: aLaVista(page.getByRole('link', { name: 'Lista', exact: true }).locator('..')),
    },
    {
      nombre: 'Importar',
      lugar: aLaVista(page.getByRole('link', { name: 'Importar', exact: true })),
    },
    {
      nombre: 'Papelera',
      lugar: aLaVista(page.getByRole('link', { name: 'Papelera', exact: true })),
    },
  ]
  if (!esMovil(page)) {
    piezas.push({
      nombre: 'Ítems por página',
      lugar: aLaVista(page.locator('label').filter({ hasText: 'Ítems por página' })),
    })
  }
  return piezas
}

for (const zoom of ['100', '200'] as const) {
  test(`la barra de leads al ${zoom} %: orden de lectura, desde la izquierda y sin botones solos`, async ({
    page,
  }, info) => {
    await entrar(page, t.personas.berta)
    await irALeads(page)
    if (zoom === '200') {
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%'
      })
    }
    const barra = page.locator('[data-barra-de-filtros]')
    await expect(barra).toBeVisible()
    const cajas = await exigirBarraOrdenada(page, barra, piezasDeLeads(page))
    await exigirMarcadorQueCabe(page.getByPlaceholder('Nombre o número'))
    await sinScrollHorizontal(page)
    const filas = new Set(cajas.map((c) => c.fila)).size
    info.annotations.push({ type: `filas de la barra al ${zoom} %`, description: String(filas) })
    await capturar(page, info, `barra-de-leads-${zoom}`)
  })
}

// El kanban (`?vista=embudo`) tiene su propia búsqueda: su marcador también cabe, y la página no se ensancha al 200 % (en el celular el
// campo, el título del embudo y el aviso se salían por la derecha).
for (const zoom of ['100', '200'] as const) {
  test(`el buscador del embudo al ${zoom} %: el marcador cabe y la página no se ensancha`, async ({
    page,
  }, info) => {
    await entrar(page, t.personas.berta)
    await irAlEmbudo(page)
    if (zoom === '200') {
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%'
      })
    }
    const campo = aLaVista(page.getByRole('searchbox', { name: 'Buscar en el embudo' }))
    await expect(campo).toBeVisible()
    await exigirMarcadorQueCabe(campo)
    await sinScrollHorizontal(page)
    await capturar(page, info, `buscador-del-embudo-${zoom}`)
  })
}

// La duda de las capturas de 5a-14: con el texto al 200 % el panel de filtros al costado dejaba 176 px a la lista y la fila salía cortada
// («Nom», «E2E», «N.º 5.»). El panel va al costado sólo si el contenedor mide 40 rem o más; si no, «Filtros» abre la hoja.
test('el listado de leads: el panel va al costado sólo si cabe, y al 200 % la fila se lee entera', async ({
  page,
}) => {
  await entrar(page, t.personas.berta)
  await irALeads(page, '?q=E2E Panel')
  await exigirPanelAlCostadoSoloSiCabe(
    page,
    aLaVista(page.getByRole('button', { name: /^Abrir E2E Panel/ })),
  )
})
