import { expect, test } from './soporte/prueba'
import { exigirBarraOrdenada, type PiezaDeLaBarra } from './soporte/barra-de-filtros'
import {
  aLaVista,
  entrar,
  esMovil,
  limpiarInventario,
  prepararInventario,
  type Terreno,
} from './soporte/inventario'
import { capturar, sinScrollHorizontal } from './soporte/recorrido'
import { cargarVehiculos } from './soporte/vehiculos'

// La barra del inventario de vehículos es la misma `<FilterShell>` que la de leads (`barra-de-filtros-200.spec.ts`): se lee en orden y desde
// la izquierda con el texto al 100 % y al 200 %. Va aparte: preparar el inventario borra las cuentas de prueba.
test.describe.configure({ mode: 'serial' })

let terreno: Terreno

test.beforeAll(async ({}, info) => {
  terreno = await prepararInventario(info.project.name, [])
  await cargarVehiculos(terreno.corea.id, [{ titulo: 'Barra200 V1' }, { titulo: 'Barra200 V2' }])
})

test.afterAll(async () => {
  await limpiarInventario()
})

for (const zoom of ['100', '200'] as const) {
  test(`la barra del inventario al ${zoom} %: orden de lectura, desde la izquierda y sin botones solos`, async ({
    page,
  }, info) => {
    await entrar(page, terreno.duena)
    await page.goto(`/vehiculos?origen=${terreno.corea.id}`)
    const barra = page.locator('[data-barra-de-filtros]')
    await expect(barra).toBeVisible()
    if (zoom === '200') {
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '200%'
      })
    }
    const piezas: PiezaDeLaBarra[] = [
      {
        nombre: 'Buscar',
        lugar: aLaVista(barra.getByPlaceholder('Buscar por título, VIN o lote')),
      },
      {
        nombre: 'Filtros',
        lugar: aLaVista(barra.getByRole('button', { name: 'Filtros', exact: true })),
      },
      {
        nombre: 'Vistas',
        lugar: aLaVista(barra.getByRole('button', { name: 'Vistas', exact: true })),
      },
      {
        nombre: 'Papelera',
        lugar: aLaVista(barra.getByRole('link', { name: 'Papelera', exact: true })),
      },
      { nombre: 'Nuevo', lugar: aLaVista(barra.getByRole('button', { name: /^Nuev[oa] / })) },
    ]
    if (!esMovil(page)) {
      piezas.push({
        nombre: 'Ítems por página',
        lugar: aLaVista(barra.locator('label').filter({ hasText: 'Ítems por página' })),
      })
    }
    await exigirBarraOrdenada(page, barra, piezas)
    await sinScrollHorizontal(page)
    await capturar(page, info, `barra-de-vehiculos-${zoom}`)
  })
}
