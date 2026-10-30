import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { aLaVista } from './soporte/inventario'
import {
  PROPIO_DALIA,
  irALeads,
  limpiarListado,
  nombre,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { dialogoDeEtiquetas, menuDelLead, selectorDeEtiquetas } from './soporte/leads-marcas'
import { embudoPorDefecto, irAlEmbudo } from './soporte/leads-oportunidades'
import { abrirRecargarYVolver } from './soporte/vuelta-del-foco'

// La vuelta del foco en los paneles del listado de leads (4-49, paso 4.14-2a4): tras recargar con el panel abierto, «atrás» lo cierra y el foco vuelve a
// quien lo abrió. La sonda del paso midió que, sin la vuelta, el foco quedaba en `body` en cada uno. Anotar y agendar desde el «⋯» de una fila y
// «Editar» del lead rápido ya volvían (su modal busca a quien lo abrió): los cubre Vitest.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
const DALIA = nombre(PROPIO_DALIA)

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  await embudoPorDefecto(t.personas.duena)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

async function alListado(page: Page): Promise<void> {
  await entrar(page, t.personas.duena, { fresco: true })
  await irALeads(page)
}

test('«Nuevo lead»: abrir, recargar y «atrás» devuelve el foco al botón', async ({ page }) => {
  await alListado(page)
  await abrirRecargarYVolver(page, {
    boton: aLaVista(page.getByRole('button', { name: 'Nuevo lead' })).first(),
    dialogo: page.getByRole('dialog', { name: 'Nuevo lead' }),
  })
})

test('«Gestionar etiquetas», desde los filtros: abrir, recargar y «atrás» devuelve el foco al botón', async ({
  page,
}) => {
  // Los filtros al costado, no en la hoja (`?panel=filtros` es otro caso).
  await page.setViewportSize({ width: 1280, height: 900 })
  await alListado(page)
  await abrirRecargarYVolver(page, {
    boton: page
      .getByRole('complementary', { name: 'Filtros' })
      .getByRole('button', { name: 'Gestionar etiquetas' }),
    dialogo: dialogoDeEtiquetas(page),
  })
})

test('«Gestionar etiquetas», desde el selector del «⋯» de una fila: abrir, recargar y «atrás» devuelve el foco al «⋯»', async ({
  page,
}) => {
  await alListado(page)
  const masAcciones = menuDelLead(page, DALIA).first()
  await abrirRecargarYVolver(page, {
    boton: masAcciones,
    dialogo: dialogoDeEtiquetas(page),
    abrir: async () => {
      await expect(async () => {
        await masAcciones.click()
        await expect(page.getByRole('menu')).toBeVisible({ timeout: 1000 })
      }).toPass()
      await page.getByRole('menuitem', { name: 'Etiquetas…' }).click()
      await selectorDeEtiquetas(page).getByRole('option', { name: 'Gestionar etiquetas' }).click()
    },
  })
})

test('exportar, desde el menú «CSV»: abrir, recargar y «atrás» devuelve el foco a «CSV»', async ({
  page,
}) => {
  await alListado(page)
  const csv = aLaVista(page.getByRole('button', { name: 'CSV', exact: true })).first()
  const dialogo = page.getByRole('dialog', { name: 'Exportar leads' })
  await abrirRecargarYVolver(page, {
    boton: csv,
    dialogo,
    abrir: async () => {
      await expect(async () => {
        await csv.click()
        await expect(page.getByRole('menu')).toBeVisible({ timeout: 1000 })
      }).toPass()
      await page.getByRole('menuitem', { name: 'Exportar…' }).click()
    },
  })
})

test('el lead rápido, desde el nombre de la fila: abrir, recargar y «atrás» devuelve el foco al nombre', async ({
  page,
}) => {
  await alListado(page)
  const abrir = aLaVista(page.getByRole('button', { name: `Abrir ${DALIA}`, exact: true })).first()
  await abrirRecargarYVolver(page, {
    boton: abrir,
    dialogo: page.getByRole('dialog', { name: DALIA }),
    clave: 'lead',
    abrir: async () => {
      await abrir.focus()
      await page.keyboard.press('Enter')
    },
  })
})

test('«Etapas», en el embudo: abrir, recargar y «atrás» devuelve el foco al botón', async ({
  page,
}) => {
  await entrar(page, t.personas.duena, { fresco: true })
  await irAlEmbudo(page)
  await abrirRecargarYVolver(page, {
    boton: aLaVista(page.getByRole('button', { name: 'Etapas', exact: true })).first(),
    dialogo: page.getByRole('dialog', { name: /^Etapas de/ }),
  })
})

test('«Nuevo embudo»: abrir, recargar y «atrás» devuelve el foco al botón', async ({ page }) => {
  await entrar(page, t.personas.duena, { fresco: true })
  await irAlEmbudo(page)
  await abrirRecargarYVolver(page, {
    boton: aLaVista(page.getByRole('button', { name: 'Nuevo embudo', exact: true })).first(),
    dialogo: page.getByRole('dialog', { name: 'Nuevo embudo' }),
  })
})
