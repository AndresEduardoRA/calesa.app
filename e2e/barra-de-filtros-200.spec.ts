import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import {
  exigirBarraOrdenada,
  exigirMarcadorQueCabe,
  type PiezaDeLaBarra,
} from './soporte/barra-de-filtros'
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
