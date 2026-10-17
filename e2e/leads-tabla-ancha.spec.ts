import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { esMovil } from './soporte/inventario'
import { completoCon, nacional } from './soporte/leads-ficha-telefonos'
import { nuevoLead } from './soporte/leads-ficha'
import {
  irALeads,
  limpiarListado,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { recibeElClic, sinScrollHorizontal } from './soporte/recorrido'
import { menuDelLead } from './soporte/leads-marcas'

// El nombre del listado de escritorio no se corta a ~15 caracteres con el panel de filtros abierto (cierre 2): la tabla tiene un ancho
// mínimo, la columna del nombre queda pegada a la izquierda y lo que sobra se desplaza dentro de la tarjeta, nunca en la página.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado

test.beforeAll(async ({}, info) => {
  t = await prepararListado(info.project.name)
})

test.afterAll(async () => {
  await limpiarListado(t)
})

// 31 caracteres: lo que cabe en la columna del nombre (16 rem) sin cortarse.
const NOMBRE_LARGO = 'E2E Cliente con nombre largo 99'

test('un nombre de 31 caracteres se ve entero con el panel de filtros abierto', async ({
  page,
}) => {
  test.skip(esMovil(page), 'La tabla es de escritorio: el celular dibuja tarjetas.')
  await nuevoLead({
    corto: NOMBRE_LARGO.replace('E2E ', ''),
    telefono: completoCon(t, nacional()),
    deQuien: t.personas.berta,
  })
  await entrar(page, t.personas.berta)
  await page.setViewportSize({ width: 1280, height: 800 })
  await irALeads(page)
  const texto = page.getByRole('button', { name: NOMBRE_LARGO, exact: true }).first()
  await expect(texto).toBeVisible()
  const cortado = await texto.evaluate((boton) => {
    const interno = boton.querySelector('.truncate') ?? boton
    return interno.scrollWidth > interno.clientWidth + 1
  })
  expect(cortado, 'el nombre se corta').toBe(false)
  await sinScrollHorizontal(page)
})

test('con poco ancho la tabla se desplaza por dentro y el nombre se queda pegado a la izquierda', async ({
  page,
}) => {
  test.skip(esMovil(page), 'La tabla es de escritorio: el celular dibuja tarjetas.')
  await entrar(page, t.personas.berta)
  await page.setViewportSize({ width: 1100, height: 800 })
  await irALeads(page)
  const nombre = page.getByRole('button', { name: NOMBRE_LARGO, exact: true }).first()
  await expect(nombre).toBeVisible()
  const contenedor = page.locator('[data-slot="table-container"]').first()
  const medidas = await contenedor.evaluate((el) => ({
    ancho: el.scrollWidth,
    visible: el.clientWidth,
  }))
  expect(medidas.ancho, 'la tabla debería ser más ancha que su lugar').toBeGreaterThan(
    medidas.visible,
  )
  // El «⋯» de cada fila se alcanza sin desplazar la tabla (queda pegado a la derecha) y desplazada tampoco se va.
  await recibeElClic(menuDelLead(page, NOMBRE_LARGO))
  const antes = (await nombre.boundingBox())?.x ?? 0
  await contenedor.evaluate((el) => {
    el.scrollLeft = el.scrollWidth
  })
  await expect.poll(() => contenedor.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0)
  const despues = (await nombre.boundingBox())?.x ?? 0
  expect(Math.abs(despues - antes), 'el nombre no se movió al desplazar').toBeLessThanOrEqual(1)
  await recibeElClic(menuDelLead(page, NOMBRE_LARGO))
  await sinScrollHorizontal(page)
})
