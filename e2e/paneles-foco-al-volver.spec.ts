import { expect, test, type Locator, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { limpiarGuardado, prepararGuardado } from './soporte/cotizar-guardar'
import {
  PREFIJO_DE_NIVEL_E2E,
  abrirNiveles,
  borrarNivelesDePrueba,
  elegirDelMenu,
  masAccionesDe,
  modalDeNivel,
  sembrarNivel,
} from './soporte/niveles'
import { sql } from './soporte/sql'

// La vuelta del foco (4-49, paso 4.14-2a2, `src/shared/ui/vuelta-del-foco.ts`): tras recargar con un panel por URL abierto, «atrás» lo cierra y el foco vuelve a
// quien lo abrió, en un modal de la hoja («Avanzado»), en uno de Configuración («Nuevo nivel») y en el drawer del vehículo. Recargar nunca mueve el foco: tras cada
// recarga, el primer Tab sigue yendo a «Saltar al contenido». Desde un ítem de menú, que ya no existe al volver, el foco va al «⋯» que abrió el menú (4.14-2a3).
test.describe.configure({ mode: 'serial' })

let duena = ''
let lead = ''
let subasta = ''

test.beforeAll(async ({}, info) => {
  ;({ duena, lead } = await prepararGuardado(info.project.name, 'vuelta'))
  subasta = sql("select id from public.origenes where clave = 'subasta_usa'")
})

test.afterAll(async () => {
  borrarNivelesDePrueba()
  await limpiarGuardado()
})

const panelEnLaUrl = (page: Page) => new URL(page.url()).searchParams.get('panel')
const saltar = (page: Page): Locator => page.getByRole('link', { name: 'Saltar al contenido' })

type Panel = { boton: Locator; dialogo: Locator }

const avanzado = (page: Page): Panel => ({
  boton: page.locator('[data-avanzado]').getByRole('button', { name: /^Avanzado/ }),
  dialogo: page.getByRole('dialog', { name: 'Avanzado' }),
})

async function abrirLaHoja(page: Page, extra = ''): Promise<void> {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${subasta}${extra}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
}

async function abrirConElBoton({ boton, dialogo }: Panel): Promise<void> {
  await boton.click()
  await expect(dialogo).toBeVisible()
}

async function recargar(page: Page, { dialogo }: Panel): Promise<void> {
  await page.reload()
  await expect(dialogo).toBeVisible()
}

async function volver(page: Page, { dialogo }: Panel): Promise<void> {
  await page.goBack()
  await expect(dialogo).toBeHidden()
  expect(panelEnLaUrl(page)).toBeNull()
}

// Abrir con el botón, recargar y «atrás»: el panel cerrado y el foco en el botón.
async function abrirRecargarYVolver(page: Page, panel: Panel): Promise<void> {
  await abrirConElBoton(panel)
  await recargar(page, panel)
  await volver(page, panel)
  await expect(panel.boton).toBeFocused()
}

// Tras una recarga sin panel, con el botón ya a la vista, el primer Tab va a «Saltar al contenido».
async function recargarSinRobarElFoco(page: Page, { boton }: Panel): Promise<void> {
  await page.reload()
  await expect(boton).toBeVisible()
  await page.keyboard.press('Tab')
  await expect(saltar(page)).toBeFocused()
}

test('«Avanzado», un modal de la hoja: abrir, recargar y «atrás» devuelve el foco al botón', async ({
  page,
}) => {
  await abrirLaHoja(page)
  await abrirRecargarYVolver(page, avanzado(page))
})

test('«Nuevo nivel», un modal de Configuración: abrir, recargar y «atrás» devuelve el foco al botón', async ({
  page,
}) => {
  await entrar(page, duena, { fresco: true })
  await abrirNiveles(page)
  await abrirRecargarYVolver(page, {
    boton: page.getByRole('button', { name: 'Nuevo nivel' }),
    dialogo: modalDeNivel(page, 'Nuevo nivel de acceso'),
  })
})

test('el panel del vehículo, un drawer: abrir, recargar y «atrás» devuelve el foco a la barra', async ({
  page,
}) => {
  await abrirLaHoja(page, `&lead=${lead}`)
  await abrirRecargarYVolver(page, {
    boton: page.getByRole('button', { name: /^Vehículo:/ }),
    dialogo: page.getByRole('dialog', { name: 'Vehículo' }),
  })
})

test('recargar no le roba el foco a «Saltar al contenido»: tras Esc, tras «atrás» y tras la vuelta', async ({
  page,
}) => {
  await abrirLaHoja(page)
  const panel = avanzado(page)
  // Abrir, Esc, «atrás» y recargar.
  await abrirConElBoton(panel)
  await page.keyboard.press('Escape')
  await expect(panel.dialogo).toBeHidden()
  await page.goBack()
  await recargarSinRobarElFoco(page, panel)
  // Abrir, «atrás» sin recargar y recargar.
  await abrirConElBoton(panel)
  await volver(page, panel)
  await recargarSinRobarElFoco(page, panel)
  // Abrir, recargar, «atrás» (vuelve al botón) y recargar.
  await abrirRecargarYVolver(page, panel)
  await recargarSinRobarElFoco(page, panel)
})

test('renombrar un nivel, desde el «⋯» de su fila: abrir, recargar y «atrás» devuelve el foco al «⋯»', async ({
  page,
}, info) => {
  const nombre = `${PREFIJO_DE_NIVEL_E2E} vuelta ${info.project.name}`
  sembrarNivel(nombre)
  await entrar(page, duena, { fresco: true })
  await abrirNiveles(page)
  const panel = {
    boton: masAccionesDe(page, nombre),
    dialogo: modalDeNivel(page, 'Renombrar nivel'),
  }
  await elegirDelMenu(page, nombre, 'Renombrar')
  await expect(panel.dialogo).toBeVisible()
  await recargar(page, panel)
  await volver(page, panel)
  await expect(panel.boton).toBeFocused()
})

test('la hoja de filtros: abrir con «Filtros», recargar y «atrás» devuelve el foco a «Filtros»', async ({
  page,
}) => {
  // La hoja se abre cuando el panel no cabe al costado (40 rem de contenedor): a 560 px, en los dos proyectos.
  await page.setViewportSize({ width: 560, height: 900 })
  await entrar(page, duena, { fresco: true })
  await page.goto('/leads')
  await abrirRecargarYVolver(page, {
    boton: page.getByRole('button', { name: /^Filtros/ }).filter({ visible: true }),
    dialogo: page.getByRole('dialog', { name: 'Filtros' }),
  })
})
