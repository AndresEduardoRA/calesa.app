import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarRolesDePrueba,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import { ordenConAvanzado, publicarFormulaConAvanzado } from './soporte/cotizar-avanzado'
import {
  celdaDeLaHoja,
  escribirEnLaHoja,
  guardarConElAtajo,
  limpiarGuardado,
  prepararGuardado,
  tarjetaGuardada,
  tipearEnLaHoja,
  totalDeLaHoja,
  vigilarGuardados,
} from './soporte/cotizar-guardar'
import { vigilarRecalculos } from './soporte/cotizar'
import {
  capturar,
  sinScrollHorizontal,
  sinTextoCortado,
  textoGrandeAlCargar,
} from './soporte/recorrido'
import { sql } from './soporte/sql'

// «Avanzado» de la hoja de cotizar (paso 4.13-4a, `docs/COTIZADOR.md` › «El diseño de la hoja (D7)»): las secciones `avanzado` van juntas en un modal con su URL (`?panel=avanzado`), detrás de
// un botón que ocupa el lugar de la primera. Dos orígenes: la subasta sembrada (el orden y el aviso de lo que falta) y la fórmula de prueba con su sección de «costos» como `avanzado`
// (lo que se tipea y se guarda desde el modal; ahí hay un lead y una dueña).
test.describe.configure({ mode: 'serial' })

let origen = { id: '', nombre: '' }
let duena = ''
let lead = ''
let todos = ''
let subasta = ''

const BOTON = /^Avanzado/

test.beforeAll(async ({}, info) => {
  const proyecto = info.project.name
  ;({ origen, duena, lead } = await prepararGuardado(proyecto, 'avanzado'))
  publicarFormulaConAvanzado(origen.id)
  todos = correoDePrueba(`todos-avanzado-${proyecto}`)
  await crearPersona({ email: todos, contrasena: CONTRASENA, nombre: 'Tito Todos', invitada: true })
  await darRolDePrueba({
    email: todos,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Ve todos ${proyecto}`,
      clave: `e2e_ve_todos_avanzado_${proyecto}`,
    },
    permisos: ['cotizaciones.ver', 'cotizaciones.crear'],
  })
  subasta = sql("select id from public.origenes where clave = 'subasta_usa'")
})

test.afterAll(async () => {
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

const dialogo = (page: Page) => page.getByRole('dialog', { name: 'Avanzado' })
const boton = (page: Page) => page.locator('[data-avanzado]').getByRole('button', { name: BOTON })
const lista = (donde: ReturnType<Page['locator']>, atributo: string) =>
  donde.locator(`[${atributo}]`).evaluateAll((es, a) => es.map((e) => e.getAttribute(a)), atributo)
const panelEnLaUrl = (page: Page) => new URL(page.url()).searchParams.get('panel')

// Abre la hoja como la dueña (ve todos los niveles) y espera a que dibuje.
async function abrir(page: Page, destino: string): Promise<void> {
  await entrar(page, duena, { fresco: true })
  await page.goto(destino)
  await expect(page.locator('[data-hoja]')).toBeVisible()
}

test('la subasta: «Avanzado» ocupa el lugar de «Componentes CIF», lista sus secciones y lo abre con su URL', async ({
  page,
}) => {
  const orden = ordenConAvanzado('subasta_usa')
  expect(orden.avanzado.secciones).toEqual(['cif', 'impuestos', 'poliza'])
  await abrir(page, `/cotizaciones/nuevo?origen=${subasta}`)
  // La hoja no dibuja las avanzadas: sus secciones y nodos son los principales, en el orden declarado.
  expect(await lista(page.locator('[data-hoja]'), 'data-seccion')).toEqual(orden.hoja.secciones)
  expect(await lista(page.locator('[data-hoja]'), 'data-nodo')).toEqual(orden.hoja.nodos)
  await expect(boton(page)).toContainText('Componentes CIF · Impuestos · Póliza')
  // El botón va justo después de la última principal que lo antecede (aduana); la garantía, que viene después, no se dibuja con su interruptor apagado: es el último lugar.
  const dom = await page
    .locator('[data-hoja] [data-seccion], [data-hoja] [data-avanzado]')
    .evaluateAll((es) => es.map((e) => e.getAttribute('data-seccion') ?? 'avanzado'))
  const lugar = dom.indexOf('avanzado')
  expect(dom[lugar - 1]).toBe(orden.botonDespuesDe)
  expect(dom[lugar + 1]).toBeUndefined()

  await boton(page).click()
  await expect(dialogo(page)).toBeVisible()
  expect(panelEnLaUrl(page)).toBe('avanzado')
  expect(await lista(dialogo(page), 'data-seccion')).toEqual(orden.avanzado.secciones)
  expect(await lista(dialogo(page), 'data-nodo')).toEqual(orden.avanzado.nodos)
  expect(await lista(dialogo(page), 'data-atajos')).toEqual(orden.avanzado.atajos)
})

test('«atrás» cierra el modal que abrió el botón y el foco vuelve al botón', async ({ page }) => {
  await abrir(page, `/cotizaciones/nuevo?origen=${subasta}`)
  await boton(page).click()
  await expect(dialogo(page)).toBeVisible()
  await page.goBack()
  await expect(dialogo(page)).toBeHidden()
  expect(panelEnLaUrl(page)).toBeNull()
  await expect(boton(page)).toBeFocused()
})

test('recargar con ?panel=avanzado lo abre', async ({ page }) => {
  await abrir(page, `/cotizaciones/nuevo?origen=${subasta}`)
  await boton(page).click()
  await expect(dialogo(page)).toBeVisible()
  await page.reload()
  await expect(dialogo(page)).toBeVisible()
  expect(panelEnLaUrl(page)).toBe('avanzado')
})

test('Esc, la ✕ y el clic afuera lo cierran, también abierto por la URL, y el foco vuelve al botón', async ({
  page,
}) => {
  await abrir(page, `/cotizaciones/nuevo?origen=${subasta}&panel=avanzado`)
  await expect(dialogo(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialogo(page)).toBeHidden()
  await expect(boton(page)).toBeFocused()
  await boton(page).click()
  await dialogo(page).getByRole('button', { name: 'Cerrar' }).click()
  await expect(dialogo(page)).toBeHidden()
  await expect(boton(page)).toBeFocused()
})

test('«Avanzado» dice «Hay datos por revisar.» con texto mientras falta un dato de lo que esconde, y deja de decirlo al llenarlo', async ({
  page,
}) => {
  // En la subasta `valor_tabla` nace vacío: ése es el estado al abrir la hoja.
  await abrir(page, `/cotizaciones/nuevo?origen=${subasta}`)
  await expect(boton(page)).toContainText('Hay datos por revisar.')
  await expect(boton(page)).toHaveAccessibleDescription(/Hay datos por revisar\./)
  // En la fórmula de prueba falta `x_celda` y también el valor que busca `x_tabla` (sin año, que viene del vehículo): el aviso sigue hasta que se llenan las dos.
  await page.goto(`/cotizaciones/nuevo?origen=${origen.id}&lead=${lead}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
  await expect(boton(page)).toContainText('Hay datos por revisar.')
  await boton(page).click()
  await tipearEnLaHoja(page, 'x_celda', '20')
  await page.keyboard.press('Escape')
  await expect(dialogo(page)).toBeHidden()
  await expect(boton(page)).toContainText('Hay datos por revisar.')
  await boton(page).click()
  await tipearEnLaHoja(page, 'x_tabla', '5')
  await page.keyboard.press('Escape')
  await expect(dialogo(page)).toBeHidden()
  await expect(boton(page)).not.toContainText('Hay datos por revisar.')
})

test('al abrir, el foco está en el primer valor; tipear recalcula la hoja y Esc con la celda abierta no cierra el modal', async ({
  page,
}) => {
  const recalculos = await vigilarRecalculos(page)
  await abrir(page, `/cotizaciones/nuevo?origen=${origen.id}&lead=${lead}`)
  const antes = await totalDeLaHoja(page).textContent()
  await boton(page).click()
  await expect(dialogo(page)).toBeVisible()
  await expect(
    dialogo(page).locator('[data-parada="0"]:not([disabled]):not([aria-disabled="true"])').first(),
  ).toBeFocused()
  await tipearEnLaHoja(page, 'x_celda', '321')
  await expect.poll(() => recalculos.pedidos.length).toBeGreaterThan(0)
  await expect(totalDeLaHoja(page)).not.toHaveText(antes ?? '')
  const entrada = await escribirEnLaHoja(page, 'x_celda', '999')
  await page.keyboard.press('Escape')
  await expect(entrada).toBeHidden()
  await expect(dialogo(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialogo(page)).toBeHidden()
})

test('Ctrl+S con una celda abierta en el modal guarda ese número; guardada, la URL no lleva el panel y «Cotizar otra» vuelve sin modal', async ({
  page,
}) => {
  const guardados = await vigilarGuardados(page)
  await abrir(page, `/cotizaciones/nuevo?origen=${origen.id}&lead=${lead}`)
  await boton(page).click()
  await expect(dialogo(page)).toBeVisible()
  await escribirEnLaHoja(page, 'x_celda', '450')
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  expect(guardados.pedidos).toHaveLength(1)
  expect(guardados.pedidos[0]?.entradas.inputs).toMatchObject({ x_celda: 450 })
  await expect.poll(() => panelEnLaUrl(page)).toBeNull()
  await page.getByRole('button', { name: 'Cotizar otra' }).click()
  await expect(page.locator('[data-hoja]')).toBeVisible()
  await expect(dialogo(page)).toBeHidden()
  await expect(celdaDeLaHoja(page, 'x_celda')).toHaveCount(0)
})

test('quien no ve ninguna sección avanzada abre ?panel=avanzado y no hay botón ni diálogo', async ({
  page,
}) => {
  await entrar(page, todos, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${origen.id}&panel=avanzado`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
  await expect(page.locator('[data-avanzado]')).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

for (const zoom of [100, 200]) {
  test(`«Avanzado» al ${String(zoom)} %: el modal no desplaza de costado, no corta nada y mantiene el orden declarado`, async ({
    page,
  }, info) => {
    if (zoom === 200) {
      await textoGrandeAlCargar(page)
    }
    const orden = ordenConAvanzado('subasta_usa')
    await abrir(page, `/cotizaciones/nuevo?origen=${subasta}&panel=avanzado`)
    await expect(dialogo(page)).toBeVisible()
    await sinScrollHorizontal(page)
    await sinTextoCortado(dialogo(page))
    expect(await lista(dialogo(page), 'data-seccion')).toEqual(orden.avanzado.secciones)
    expect(await lista(dialogo(page), 'data-nodo')).toEqual(orden.avanzado.nodos)
    await capturar(page, info, `cotizar-avanzado-${String(zoom)}`)
  })
}
