import { test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { aLaVista } from './soporte/inventario'
import {
  irALeads,
  limpiarListado,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { abrirRecargarYVolver } from './soporte/vuelta-del-foco'

// La vuelta del foco en los paneles del listado de leads (4-49, paso 4.14-2a4): tras recargar con el panel abierto, «atrás» lo cierra y el foco vuelve a
// quien lo abrió. La sonda del paso midió que, sin la vuelta, el foco quedaba en `body` en cada uno. Anotar y agendar desde el «⋯» de una fila y
// «Editar» del lead rápido ya volvían (su modal busca a quien lo abrió): los cubre Vitest.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
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
