import { expect, test, type Page } from './soporte/prueba'
import { entrar } from './soporte/alta'
import { vigilarRecalculos } from './soporte/cotizar'
import {
  cotizacionGuardada,
  guardarConElAtajo,
  limpiarGuardado,
  prepararGuardado,
  tarjetaGuardada,
  tipearEnLaHoja,
  totalDeLaHoja,
  vigilarGuardados,
} from './soporte/cotizar-guardar'
import { avisoNoTapaElPie, textoGrandeAlCargar } from './soporte/recorrido'
import { sql } from './soporte/sql'
import { formatearNumero } from '../src/shared/lib/formato'

// Lo que la cabecera y el resumen de la hoja le suman a la hoja de cotizar (paso 4.13-4b3): los modos de tipo de cambio con el primero marcado, «Ver total Bs» y el resumen fijo. La fórmula de prueba tiene dos modos (`m1`, `m2`); la planilla, ninguno.

// El corte del contenedor `[data-hoja]` desde el que el resumen va al costado (la clase `@4xl` de Tailwind de `hoja-de-cotizar.tsx`: 56 rem); debajo, al pie. Se decide por el ancho
// medido del contenedor y no por el proyecto: el 200 % del texto lo colapsa solo.
const CORTE_DEL_COSTADO_EN_REM = 56

test.describe.configure({ mode: 'serial' })

let duena = ''
let lead = ''
let origen = { id: '', nombre: '' }
let planilla = ''

test.beforeAll(async ({}, info) => {
  ;({ origen, duena, lead } = await prepararGuardado(info.project.name, 'resumen', true))
  planilla = sql("select id from public.origenes where clave = 'planilla_usa'")
})

test.afterAll(async () => {
  await limpiarGuardado()
})

const ir = async (page: Page, origen: string) => {
  await entrar(page, duena, { fresco: true })
  await page.goto(`/cotizaciones/nuevo?origen=${origen}&lead=${lead}`)
  await expect(page.locator('[data-hoja]')).toBeVisible()
}
const cabecera = (page: Page) => page.locator('[data-cabecera]')
const modo = (page: Page, nombre: string) => cabecera(page).getByRole('radio', { name: nombre })
const resumen = (page: Page) => page.getByLabel('Resumen')
const verTotalBs = (page: Page) => page.getByRole('switch', { name: 'Ver total en moneda local' })
const lineaEnBs = (page: Page) => page.locator('[data-total-bs]')
const elegirModo = (page: Page, nombre: string) =>
  cabecera(page).getByText(nombre, { exact: true }).click()

test('la hoja abre con «Modo uno» marcado, elegir «Modo dos» sale en el recálculo y vuelve tras recargar', async ({
  page,
}) => {
  const recalculos = await vigilarRecalculos(page)
  await ir(page, origen.id)
  await expect(modo(page, 'Modo uno')).toBeChecked()
  await expect(modo(page, 'Modo dos')).not.toBeChecked()
  await page.waitForLoadState('networkidle')
  expect(recalculos.pedidos).toHaveLength(0)
  await elegirModo(page, 'Modo dos')
  await expect(modo(page, 'Modo dos')).toBeChecked()
  await expect.poll(() => recalculos.pedidos.at(-1)?.p_modo_tc).toBe('m2')
  await page.reload()
  await expect(page.getByText('Recuperamos lo que habías escrito y no guardaste.')).toBeVisible()
  await expect(modo(page, 'Modo dos')).toBeChecked()
})

test('guardar manda el primer modo sin tocar nada y el elegido tras elegir, y la base lo guarda', async ({
  page,
}) => {
  const guardados = await vigilarGuardados(page)
  await ir(page, origen.id)
  await tipearEnLaHoja(page, 'pub', '1200')
  await expect(totalDeLaHoja(page)).toContainText('1.205,00')
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  expect(guardados.pedidos[0]?.modoTc).toBe('m1')
  expect(cotizacionGuardada(guardados.pedidos[0]?.intento ?? '').modoTc).toBe('m1')
  await page.getByRole('button', { name: 'Cotizar otra' }).click()
  await tipearEnLaHoja(page, 'pub', '1200')
  await elegirModo(page, 'Modo dos')
  await expect(totalDeLaHoja(page)).toContainText('1.205,00')
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  expect(guardados.pedidos[1]?.modoTc).toBe('m2')
  expect(cotizacionGuardada(guardados.pedidos[1]?.intento ?? '').modoTc).toBe('m2')
})

test('«Ver total en moneda local» nace apagado, encendido suma la línea en el resumen y vuelve con el borrador', async ({
  page,
}) => {
  await ir(page, origen.id)
  await expect(verTotalBs(page)).not.toBeChecked()
  await expect(lineaEnBs(page)).toHaveCount(0)
  await tipearEnLaHoja(page, 'pub', '1200')
  await expect(totalDeLaHoja(page)).toContainText('1.205,00')
  await verTotalBs(page).click()
  await expect(lineaEnBs(page)).toContainText('Total en moneda local')
  await expect(lineaEnBs(page)).toContainText(/\d/)
  await page.reload()
  await expect(page.getByText('Recuperamos lo que habías escrito y no guardaste.')).toBeVisible()
  await expect(verTotalBs(page)).toBeChecked()
  await expect(lineaEnBs(page)).toContainText(/\d/)
})

test('guardar con «Ver total Bs» encendido lo deja en la cotización, y apagado también', async ({
  page,
}) => {
  const guardados = await vigilarGuardados(page)
  await ir(page, origen.id)
  await tipearEnLaHoja(page, 'pub', '1200')
  await expect(totalDeLaHoja(page)).toContainText('1.205,00')
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  expect(guardados.pedidos[0]?.verTotalBs).toBe(false)
  expect(cotizacionGuardada(guardados.pedidos[0]?.intento ?? '').verTotalBs).toBe(false)
  await page.getByRole('button', { name: 'Cotizar otra' }).click()
  await tipearEnLaHoja(page, 'pub', '1200')
  await verTotalBs(page).click()
  await guardarConElAtajo(page)
  await expect(tarjetaGuardada(page)).toBeVisible()
  expect(guardados.pedidos[1]?.verTotalBs).toBe(true)
  expect(cotizacionGuardada(guardados.pedidos[1]?.intento ?? '').verTotalBs).toBe(true)
})

test('una fórmula sin modos (la planilla) no dibuja la cabecera', async ({ page }) => {
  await ir(page, planilla)
  await expect(page.locator('[data-nodo]').first()).toBeVisible()
  await expect(cabecera(page)).toHaveCount(0)
})

const scrollMarginDeLoEnfocable = (page: Page) =>
  page
    .locator('[data-secciones] [data-parada="0"]')
    .first()
    .evaluate((e) => getComputedStyle(e).scrollMarginBottom)

async function medidas(page: Page) {
  return page.evaluate(() => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
    const caja = (selector: string) => {
      const r = document.querySelector(selector)?.getBoundingClientRect()
      return r ? { x: r.x, y: r.y, w: r.width, h: r.height } : null
    }
    return {
      hojaRem: (caja('[data-hoja]')?.w ?? 0) / rem,
      resumen: caja('[data-resumen]'),
      secciones: caja('[data-secciones]'),
      alto: window.innerHeight,
    }
  })
}

for (const texto of ['al 100 %', 'al 200 %']) {
  test(`el resumen queda fijo: al pie debajo del corte y al costado desde él, con el texto ${texto}`, async ({
    page,
  }, info) => {
    if (texto === 'al 200 %') {
      await textoGrandeAlCargar(page)
    }
    await ir(page, origen.id)
    await tipearEnLaHoja(page, 'pub', '1200')
    await expect(totalDeLaHoja(page)).toContainText('1.205,00')
    // Con la hoja arriba de la ventana (o lo más arriba que deje la página). Desde el 4.14-2a la barra del vehículo va encima de la hoja; con la página arriba de todo, al
    // 200 % el resumen —que no sube más allá del borde de arriba de la hoja y mide hasta el 40 % del alto— queda 107 px debajo del borde de la ventana (antes cabía por 1 px; 4-50).
    const destino = await page.evaluate(() => {
      const hoja = document.querySelector('[data-hoja]')?.getBoundingClientRect().top ?? 0
      const hasta = Math.round(
        Math.min(window.scrollY + hoja, document.documentElement.scrollHeight - window.innerHeight),
      )
      window.scrollTo(0, hasta)
      return hasta
    })
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY))).toBe(destino)
    const m = await medidas(page)
    info.annotations.push({
      type: `resumen ${texto}`,
      description: `hoja ${formatearNumero(m.hojaRem, { decimales: 1 })} rem; ${m.hojaRem < CORTE_DEL_COSTADO_EN_REM ? 'al pie' : 'al costado'}`,
    })
    console.warn(
      `[resumen] ${texto}: hoja ${formatearNumero(m.hojaRem, { decimales: 1 })} rem, ${m.hojaRem < CORTE_DEL_COSTADO_EN_REM ? 'al pie' : 'al costado'}`,
    )
    expect(m.resumen).not.toBeNull()
    expect(m.secciones).not.toBeNull()
    if (!m.resumen || !m.secciones) {
      return
    }
    if (m.hojaRem < CORTE_DEL_COSTADO_EN_REM) {
      // Al pie: con la hoja arriba de la ventana, el resumen está dentro de ella con su borde de abajo en el de la ventana, y no pasa del 40 % de su alto.
      expect(Math.abs(m.resumen.y + m.resumen.h - m.alto)).toBeLessThanOrEqual(1)
      expect(m.resumen.h).toBeLessThanOrEqual(m.alto * 0.4 + 1)
      expect(await scrollMarginDeLoEnfocable(page)).not.toBe('0px')
      // Tab hasta la última celda: la que recibe el foco no queda bajo el resumen.
      const ultima = page.locator('[data-secciones] [data-parada="0"]').last()
      // La celda queda a la vista pero bajo el resumen (en el borde de abajo de la ventana): sin `scroll-margin` el navegador no la mueve al enfocarla.
      await ultima.evaluate((e) => {
        window.scrollBy(0, e.getBoundingClientRect().top - (window.innerHeight - 20))
      })
      await ultima.focus()
      const celda = await ultima.boundingBox()
      const resumenAhora = await resumen(page).boundingBox()
      expect(celda && resumenAhora && celda.y + celda.height <= resumenAhora.y + 1).toBe(true)
    } else {
      // Al costado: lo enfocable ya no deja el margen del pie.
      expect(await scrollMarginDeLoEnfocable(page)).toBe('0px')
      // Al costado: a la derecha de las secciones y a la vista aunque se baje hasta el final.
      expect(m.resumen.x).toBeGreaterThanOrEqual(m.secciones.x + m.secciones.w - 1)
      await page.evaluate(() => {
        window.scrollTo(0, document.documentElement.scrollHeight)
      })
      const abajo = await medidas(page)
      expect(abajo.resumen && abajo.resumen.y >= -1 && abajo.resumen.y < abajo.alto).toBe(true)
    }
  })
}

test('con el resumen fijo, el aviso «Recuperamos…» no lo tapa', async ({ page }) => {
  await ir(page, origen.id)
  await tipearEnLaHoja(page, 'pub', '1200')
  await expect(totalDeLaHoja(page)).toContainText('1.205,00')
  await page.reload()
  const aviso = page.locator('[data-sonner-toast]', {
    hasText: 'Recuperamos lo que habías escrito',
  })
  await expect(aviso).toBeVisible()
  await avisoNoTapaElPie(aviso, resumen(page))
})

test('el resumen dice el modo, y el botón Live oculta los montos de la hoja', async ({ page }) => {
  await ir(page, origen.id)
  await expect(resumen(page).locator('[data-modo]')).toHaveText('Modo de tipo de cambio: Modo uno')
  await elegirModo(page, 'Modo dos')
  await expect(resumen(page).locator('[data-modo]')).toHaveText('Modo de tipo de cambio: Modo dos')
  const live = resumen(page).getByRole('button', { name: 'Modo Live: ocultar los montos' })
  await expect(live).toHaveAttribute('aria-pressed', 'false')
  await live.click()
  await expect(live).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('html')).toHaveClass(/live/)
  await expect(page.locator('[data-total] [data-monto-valor]')).toBeHidden()
  await live.click()
  await expect(page.locator('html')).not.toHaveClass(/live/)
})
