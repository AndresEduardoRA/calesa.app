import type { Locator, Page } from '@playwright/test'
import { expect, test } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { admin } from './soporte/base'
import { aLaVista, esMovil } from './soporte/inventario'
import { idDe } from './soporte/leads'
import {
  filas,
  irALeads,
  limpiarListado,
  prepararListado,
  type TerrenoDelListado,
} from './soporte/leads-listado'
import { sinScrollHorizontal } from './soporte/recorrido'

// Con el texto al 200 % las tarjetas del listado del celular no ensanchan la página (cierre 3, reflujo de WCAG 1.4.10): la columna
// de la lista mide lo que la pantalla y el nombre se corta con «…» en vez de empujar el «⋯» fuera de la vista. Va con 100 filas, un
// nombre de 80 caracteres, claro y oscuro, y con el teclado; el inventario de vehículos, que comparte la forma de la lista, va en `vehiculos-tarjetas-200.spec.ts`.
test.describe.configure({ mode: 'serial' })

let t: TerrenoDelListado
const MARCA = 'Tarjeta200'
const NOMBRE_LARGO = `E2E ${MARCA} con un nombre de ochenta caracteres que no cabe en ninguna pantalla`

test.beforeAll(async ({}, info) => {
  test.setTimeout(120_000)
  t = await prepararListado(info.project.name)
  const dueno = await idDe(t.personas.berta)
  const sufijo = info.project.name === 'movil' ? '81' : '80'
  const { error } = await admin()
    .from('leads')
    .insert([
      { nombre: NOMBRE_LARGO, telefono_principal: `5917${sufijo}99999`, creado_por: dueno },
      ...Array.from({ length: 99 }, (_, i) => ({
        nombre: `E2E ${MARCA} ${String(i + 1).padStart(3, '0')} ${info.project.name}`,
        telefono_principal: `5917${sufijo}${String(i).padStart(5, '0')}`,
        creado_por: dueno,
      })),
    ])
  expect(error).toBeNull()
})

test.afterAll(async () => {
  await limpiarListado(t)
})

const alDoscientos = (page: Page) =>
  page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })

// La caja del elemento no pasa del borde derecho de la pantalla (sólo en horizontal: la lista se baja a su altura).
async function dentroPorLaDerecha(page: Page, lugar: Locator) {
  await lugar.scrollIntoViewIfNeeded()
  const caja = await lugar.boundingBox()
  const ancho = page.viewportSize()?.width ?? 0
  expect(caja, 'el elemento no tiene caja').not.toBeNull()
  if (!caja) return
  expect(caja.x, 'empieza antes del borde izquierdo').toBeGreaterThanOrEqual(-1)
  expect(caja.x + caja.width, 'termina después del borde derecho').toBeLessThanOrEqual(ancho + 1)
}

for (const esquema of ['light', 'dark'] as const) {
  test(`las 100 tarjetas de leads caben al 200 % con el nombre largo, en ${esquema === 'light' ? 'claro' : 'oscuro'}`, async ({
    page,
  }) => {
    test.skip(!esMovil(page), 'Las tarjetas son del celular: el escritorio dibuja la tabla.')
    await page.emulateMedia({ colorScheme: esquema })
    await entrar(page, t.personas.berta)
    await irALeads(page, `?q=${MARCA}&por=100`)
    await expect(filas(page)).toHaveCount(100)
    await alDoscientos(page)
    await sinScrollHorizontal(page)
    const largo = aLaVista(
      page.getByRole('button', { name: `Más acciones de ${NOMBRE_LARGO}`, exact: true }),
    )
    await dentroPorLaDerecha(page, largo)
    await sinScrollHorizontal(page)
    // La última también: el ancho no depende de la fila que se mira.
    const ultima = aLaVista(
      page.getByRole('button', { name: /^Más acciones de E2E Tarjeta200 \d{3}/ }),
    ).last()
    await dentroPorLaDerecha(page, ultima)
  })
}

test('con el teclado el «⋯» de una tarjeta llega al foco y queda a la vista al 200 %', async ({
  page,
}) => {
  test.skip(!esMovil(page), 'Las tarjetas son del celular: el escritorio dibuja la tabla.')
  await entrar(page, t.personas.berta)
  await irALeads(page, `?q=${MARCA}`)
  await expect(filas(page).first()).toBeVisible()
  await alDoscientos(page)
  const menu = aLaVista(
    page.getByRole('button', { name: /^Más acciones de E2E Tarjeta200/ }),
  ).first()
  await menu.focus()
  await expect(menu).toBeFocused()
  await dentroPorLaDerecha(page, menu)
  await sinScrollHorizontal(page)
})
