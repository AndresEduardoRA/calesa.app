import { expect, test, type Locator, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  PREFIJO_ROL_E2E,
  borrarRolesDePrueba,
  correoDePrueba,
  crearPersona,
  darRolDePrueba,
} from './soporte/base'
import {
  NOMBRE_DE_LA_TABLA,
  TIPO_LARGO,
  filasDePrueba,
  publicarConTabla,
  publicarLaVersionSiguienteConTabla,
} from './soporte/cotizar-ayuda-tabla'
import { crearOrigenDeCotizar } from './soporte/cotizar-formula'
import {
  escribirEnLaHoja,
  guardarConElAtajo,
  limpiarGuardado,
  prepararGuardado,
  tarjetaGuardada,
  vigilarGuardados,
} from './soporte/cotizar-guardar'
import { sinScrollHorizontal, sinTextoCortado, textoGrandeAlCargar } from './soporte/recorrido'

// La ayuda de una tabla de una celda de la hoja de cotizar (paso 4.13-4c2, `docs/UX.md` › «Cotizar»): el botón «Ayuda de X» de la celda abre un panel de sólo lectura con la tabla
// de referencia de la hoja ABIERTA (`cotizacion_tabla` con `p_abierta`) y su URL (`?ayuda=tabla&nodo=<id>`); al cerrarlo el foco vuelve a ese botón. La celda es `con_ayuda`
// (una constante en dólares) y su tabla `ch_tabla`, que sólo lee un nodo del nivel «costos»: quien no lo ve no recibe ni el botón.
test.describe.configure({ mode: 'serial' })

let proyecto = ''
let origen = { id: '', nombre: '' }
let duena = ''
let lead = ''
let todos = ''

test.beforeAll(async ({}, info) => {
  proyecto = info.project.name
  ;({ origen, duena, lead } = await prepararGuardado(proyecto, 'ayuda_tabla'))
  publicarConTabla(origen.id, { lista: filasDePrueba(9191.5) })
  todos = correoDePrueba(`todos-ayuda-tabla-${proyecto}`)
  await crearPersona({ email: todos, contrasena: CONTRASENA, nombre: 'Tito Todos', invitada: true })
  await darRolDePrueba({
    email: todos,
    rol: {
      nombre: `${PREFIJO_ROL_E2E}Ve todos tabla ${proyecto}`,
      clave: `e2e_ve_todos_tabla_${proyecto}`,
    },
    permisos: ['cotizaciones.ver', 'cotizaciones.crear'],
  })
})

test.afterAll(async () => {
  await limpiarGuardado()
  await borrarRolesDePrueba()
})

const url = (resto = '', id = origen.id) => `/cotizaciones/nuevo?origen=${id}&lead=${lead}${resto}`
const panel = (page: Page) => page.getByRole('dialog', { name: 'Ayuda de Con ayuda' })
const botonDeAyuda = (page: Page) => page.getByRole('button', { name: 'Ayuda de Con ayuda' })
// El panel recibe el foco al terminar de abrirse: antes de eso un Esc todavía no es suyo.
const abiertaDeVerdad = (ayuda: Locator) =>
  expect(ayuda.getByRole('button', { name: 'Cerrar' })).toBeFocused()
const enLaUrl = (page: Page, clave: string) => new URL(page.url()).searchParams.get(clave)

// Una ausencia sólo vale con la página ya hidratada y su código diferido pedido: se espera a que una celda abra (eso necesita la hidratación) y a que la red quede quieta.
async function paginaQuieta(page: Page): Promise<void> {
  await expect(page.locator('[data-hoja]')).toBeVisible()
  await escribirEnLaHoja(page, 'pub', '1')
  await page.waitForLoadState('networkidle')
}

async function abrir(page: Page, destino = url()): Promise<void> {
  await entrar(page, duena, { fresco: true })
  await page.goto(destino)
  await expect(page.locator('[data-hoja]')).toBeVisible()
}

test('el botón de la celda abre la tabla con su URL, sus columnas con etiqueta y sus números con moneda; Esc devuelve el foco al botón', async ({
  page,
}) => {
  await abrir(page)
  await botonDeAyuda(page).click()
  const ayuda = panel(page)
  await expect(ayuda).toContainText(NOMBRE_DE_LA_TABLA)
  expect(enLaUrl(page, 'ayuda')).toBe('tabla')
  expect(enLaUrl(page, 'nodo')).toBe('con_ayuda')
  await expect(ayuda.getByRole('columnheader')).toHaveText(['Año', 'Tipo de vehículo', 'Factor'])
  await expect(ayuda.getByRole('row')).toHaveCount(4)
  // El año sin separador de miles; el factor, dinero de la celda (dólares), con sus dos decimales.
  await expect(ayuda.getByRole('cell', { name: '2018', exact: true })).toBeVisible()
  await expect(ayuda.getByRole('cell', { name: TIPO_LARGO }).first()).toBeVisible()
  await expect(ayuda.getByRole('cell').filter({ hasText: '9.191,50' })).toBeVisible()
  await abiertaDeVerdad(ayuda)
  await page.keyboard.press('Escape')
  await expect(ayuda).toBeHidden()
  expect(enLaUrl(page, 'ayuda')).toBeNull()
  await expect(botonDeAyuda(page)).toBeFocused()
})

test('recargada con su URL la tabla se abre, y al cerrarla el foco vuelve al botón de su celda', async ({
  page,
}) => {
  await abrir(page, url('&ayuda=tabla&nodo=con_ayuda'))
  await expect(panel(page)).toContainText(NOMBRE_DE_LA_TABLA)
  await expect(panel(page).getByRole('row')).toHaveCount(4)
  await abiertaDeVerdad(panel(page))
  await page.keyboard.press('Escape')
  await expect(panel(page)).toBeHidden()
  await expect(botonDeAyuda(page)).toBeFocused()
})

test('si se publica otra versión con la hoja abierta, el panel muestra las filas de la hoja que se dibujó (4-28) y, recargada la hoja, las nuevas', async ({
  page,
}) => {
  const aparte = await crearOrigenDeCotizar(proyecto, 'tabla_v2', true)
  publicarConTabla(aparte.id, { lista: filasDePrueba(9191.5) })
  await abrir(page, url('', aparte.id))
  publicarLaVersionSiguienteConTabla(aparte.id, filasDePrueba(7000.5))
  await botonDeAyuda(page).click()
  await expect(panel(page).getByRole('cell').filter({ hasText: '9.191,50' })).toBeVisible()
  await expect(panel(page)).not.toContainText('7.000,50')
  // Recargada, la URL abre el panel otra vez, con la hoja nueva.
  await page.reload()
  await expect(page.locator('[data-hoja]')).toBeVisible()
  await expect(panel(page).getByRole('cell').filter({ hasText: '7.000,50' })).toBeVisible()
  await expect(panel(page)).not.toContainText('9.191,50')
})

test('quien ve «todos» sin «costos» no tiene el botón y la URL no abre la tabla', async ({
  page,
}) => {
  await entrar(page, todos, { fresco: true })
  await page.goto(url())
  await paginaQuieta(page)
  await expect(botonDeAyuda(page)).toHaveCount(0)
  await page.goto(url('&ayuda=tabla&nodo=con_ayuda'))
  await paginaQuieta(page)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText(NOMBRE_DE_LA_TABLA)
})

test('la URL no abre lo que la hoja no muestra: una celda sin ayuda de tabla, un id inventado, una ayuda de texto', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  for (const resto of [
    '&ayuda=tabla&nodo=pub',
    '&ayuda=tabla&nodo=no_existe',
    '&ayuda=texto&nodo=con_ayuda',
  ]) {
    await page.goto(url(resto))
    await paginaQuieta(page)
    await expect(page.getByRole('dialog')).toHaveCount(0)
  }
})

test('Ctrl+S con la tabla abierta guarda; guardada, la URL queda sin la ayuda y «Cotizar otra» vuelve sin ella', async ({
  page,
}) => {
  const guardados = await vigilarGuardados(page)
  await abrir(page)
  await botonDeAyuda(page).click()
  await expect(panel(page)).toBeVisible()
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  expect(guardados.pedidos).toHaveLength(1)
  await expect.poll(() => enLaUrl(page, 'ayuda')).toBeNull()
  expect(enLaUrl(page, 'nodo')).toBeNull()
  await page.getByRole('button', { name: 'Cotizar otra' }).click()
  await expect(page.locator('[data-hoja]')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

for (const zoom of [100, 200]) {
  test(`la tabla al ${String(zoom)} %: no desplaza la página de costado, no corta nada y la última columna se alcanza dentro del panel`, async ({
    page,
  }) => {
    if (zoom === 200) {
      await textoGrandeAlCargar(page)
    }
    await abrir(page, url('&ayuda=tabla&nodo=con_ayuda'))
    await expect(panel(page)).toContainText(NOMBRE_DE_LA_TABLA)
    await sinScrollHorizontal(page)
    await sinTextoCortado(panel(page))
    const ultima = panel(page).getByRole('columnheader').last()
    await ultima.scrollIntoViewIfNeeded()
    await expect(ultima).toBeInViewport()
    await sinScrollHorizontal(page)
  })
}

for (const zoom of [100, 200]) {
  test(`una tabla con más columnas de las que caben, al ${String(zoom)} %: se desplaza dentro del panel, nunca la página, y lo dice`, async ({
    page,
  }) => {
    const ancha = await crearOrigenDeCotizar(proyecto, `ancha${String(zoom)}`, true)
    publicarConTabla(ancha.id, { lista: filasDePrueba(9191.5, 6) }, 6)
    if (zoom === 200) {
      await textoGrandeAlCargar(page)
    }
    await abrir(page, url('&ayuda=tabla&nodo=con_ayuda', ancha.id))
    await expect(panel(page).getByRole('columnheader')).toHaveCount(9)
    await sinScrollHorizontal(page)
    const region = panel(page).getByRole('region')
    // Lo que no entra queda detrás: el contenedor se desplaza y la pista del borde derecho lo avisa.
    expect(await region.evaluate((e) => e.scrollWidth > e.clientWidth)).toBe(true)
    await expect(panel(page).locator('[data-desborde="derecha"]')).toHaveAttribute(
      'data-visible',
      'true',
    )
    // Y es la tabla la que se desplaza (su propio contenedor), no el cuerpo del panel: así el encabezado y la pista quedan con ella.
    expect(
      await region.evaluate((e) => {
        e.scrollLeft = e.scrollWidth
        return e.scrollLeft > 0
      }),
    ).toBe(true)
    await expect(panel(page).locator('[data-desborde="izquierda"]')).toHaveAttribute(
      'data-visible',
      'true',
    )
    const ultima = panel(page).getByRole('columnheader', { name: 'Cifra 6' })
    await ultima.scrollIntoViewIfNeeded()
    await expect(ultima).toBeInViewport()
    await sinScrollHorizontal(page)
  })
}
