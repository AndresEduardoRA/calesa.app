import { expect, test } from './soporte/prueba'
import { aLaVista } from './soporte/inventario'
import { esperarHidratado } from './soporte/listas-por-pagina'
import { crearLead } from './soporte/leads'
import {
  buscar,
  delLead,
  irALeads,
  limpiarListado,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { entrar } from './soporte/alta'
import { aLaVistaSinDesplazar, quieto, textoGrandeAlCargar } from './soporte/recorrido'

// El menú de un «⋯» (`<MasAcciones>`, `<DropdownMenuContent>`) cabe en la pantalla con el texto al 200 %: medía 15 rem fijos (`w-60`, 480 px al
// 200 %) y en el celular de 412 px se salía por la derecha (5a-17). Ahora no pasa del ancho que deja la pantalla.
test.describe.configure({ mode: 'serial' })

const CORTO = 'Menu mas acciones'
let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
  await crearLead({
    nombre: CORTO,
    telefono: `59171${String(Math.floor(Math.random() * 900000) + 100000)}`,
    deQuien: t.personas.berta,
  })
})

test.afterAll(async () => {
  await limpiarListado(t)
})

test('al 200 %: el menú abierto del «⋯» de una fila de leads cabe en la pantalla', async ({
  page,
}) => {
  await textoGrandeAlCargar(page)
  await entrar(page, t.personas.berta)
  // Una palabra corta: el chip de una búsqueda larga ensancha el listado al 200 % (aparte de esta prueba, `docs/PLAN.md`).
  await irALeads(page, buscar('Menu'))
  // El listado llega pintado antes de hidratar y, un instante, más ancho que la pantalla: se mide ya hidratado.
  await esperarHidratado(page)
  const boton = aLaVista(
    delLead(page, CORTO)
      .first()
      .getByRole('button', { name: /^Más acciones de / }),
  )
  await boton.scrollIntoViewIfNeeded()
  await boton.click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  await quieto(menu)
  await aLaVistaSinDesplazar(menu, 'el menú del «⋯»')
  const { ancho, pantalla } = await menu.evaluate((m) => ({
    ancho: m.getBoundingClientRect().width,
    pantalla: document.documentElement.clientWidth,
  }))
  expect(ancho, 'el menú es más ancho que la pantalla').toBeLessThanOrEqual(pantalla)
})
