import { expect, test, type Page } from './soporte/prueba'
import { CONTRASENA, entrar } from './soporte/alta'
import {
  borrarPersonasDePrueba,
  borrarRolesDePrueba,
  correoDePrueba,
  crearDuenaDePrueba,
} from './soporte/base'
import { vigilarRecalculos } from './soporte/cotizar'
import { ordenConAvanzado } from './soporte/cotizar-avanzado'
import { enKB, medirJsEnFrio } from './soporte/js-en-frio'
import {
  capturar,
  sinScrollHorizontal,
  sinTextoCortado,
  textoGrandeAlCargar,
} from './soporte/recorrido'
import { sql } from './soporte/sql'
import { formatearNumero } from '../src/shared/lib/formato'

// La hoja de cotizar a cada ancho y a cada tamaño del texto (paso 4.13-2, `docs/UX.md` › «Cotizar», 3): el viewport es el de cada proyecto (412 y 1.280 px), al 100 y al 200 %.
// Una columna donde el contenedor es angosto —el corte es en rem del contenedor, así el 200 % colapsa solo— sin desplazar la página ni cortar un texto, y el orden del DOM es el
// declarado. Con el tope de nodos del DOM de la hoja más grande del juego y, anotado, el JS de la ruta (su presupuesto formal es del 4.13-4).
test.describe.configure({ mode: 'serial' })

// El tope de nodos del DOM del subárbol `[data-hoja]` para la fórmula más grande del juego (la subasta: 47 nodos, 39 ítems), medida como quien ve «costos». Una celda pesa de 8 a 15
// nodos (`src/shared/ui/xcell/CLAUDE.md`); se propuso en 650 (32 celdas × 15 nodos + ≈ 170 de estructura) y se fijó en lo medido más un 5 %: 430 con la hoja usada (31 celdas al abrir, 411 nodos), 460.
// P7 (4.13-4b3, la persona): el tope sube con lo nuevo de la hoja, siempre lo medido con la hoja usada más un 5 %, con techo en 500; si eso pasa de 500, se para y se reporta.
// Con los modos de tipo de cambio de la subasta (4.13-4b3, commit 1): 442 al abrir y 461 usada, 485. Con «Ver total Bs» (commit 2): 449 y 468, 492.
const TOPE_DE_NODOS = 492

let duena = ''
let subasta = ''

test.beforeAll(async ({}, info) => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
  duena = correoDePrueba(`duena-hoja-ancho-${info.project.name}`)
  await crearDuenaDePrueba({ email: duena, contrasena: CONTRASENA, nombre: 'Dora Ancha' })
  subasta = sql("select id from public.origenes where clave = 'subasta_usa'")
})

test.afterAll(async () => {
  await borrarPersonasDePrueba()
  await borrarRolesDePrueba()
})

const hoja = (page: Page) => page.locator('[data-hoja]')
const celda = (page: Page, nodo: string) => page.locator(`[data-nodo="${nodo}"]`)
const lista = (page: Page, atributo: string) =>
  page.locator(`[${atributo}]`).evaluateAll((es, a) => es.map((e) => e.getAttribute(a)), atributo)
const nodosDelDom = (page: Page) => hoja(page).evaluate((e) => e.querySelectorAll('*').length + 1)
// Los nodos del modal «Avanzado» abierto (su diálogo), que se suman a los de la hoja: es la hoja entera.
async function medirElModal(page: Page): Promise<{ nodos: number; celdas: number }> {
  const dialogo = page.getByRole('dialog', { name: 'Avanzado' })
  await page.locator('[data-avanzado]').getByRole('button').click()
  await expect(dialogo).toBeVisible()
  const nodos = await dialogo.evaluate((e) => e.querySelectorAll('*').length + 1)
  const celdas = await dialogo.locator('[data-nodo] [data-xcell]').count()
  await page.keyboard.press('Escape')
  await expect(dialogo).toBeHidden()
  return { nodos, celdas }
}

async function abrir(page: Page): Promise<void> {
  await entrar(page, duena)
  await page.goto(`/cotizaciones/nuevo?origen=${subasta}`)
  await expect(hoja(page)).toBeVisible()
}

// Qué tan angosto es el contenedor de la hoja y el de cada sección, en rem, y si las celdas de cada sección están en una sola columna.
async function columnas(page: Page) {
  return page.evaluate(() => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
    const ancho = (e: Element) => e.getBoundingClientRect().width / rem
    const raiz = document.querySelector('[data-hoja]')
    const secciones = [...document.querySelectorAll('[data-seccion]')].map((s) => {
      const izquierdas = [...s.querySelectorAll('[data-nodo]')].map((n) =>
        Math.round(n.getBoundingClientRect().left),
      )
      return {
        id: s.getAttribute('data-seccion'),
        rem: ancho(s),
        izquierda: Math.round(s.getBoundingClientRect().left),
        unaColumnaDeCeldas: new Set(izquierdas).size === 1,
      }
    })
    return { hojaRem: raiz ? ancho(raiz) : 0, secciones }
  })
}

for (const zoom of [100, 200]) {
  test(`la hoja de la subasta al ${String(zoom)} % cabe, no corta nada y mantiene el orden declarado`, async ({
    page,
  }, info) => {
    if (zoom === 200) {
      await textoGrandeAlCargar(page)
    }
    await abrir(page)
    await sinScrollHorizontal(page)
    await sinTextoCortado(hoja(page))
    // La hoja dibuja las secciones principales; las avanzadas están detrás del botón «Avanzado» (`cotizar-hoja-avanzado.spec.ts` mira su modal).
    const orden = ordenConAvanzado('subasta_usa').hoja
    expect(await lista(page, 'data-seccion')).toEqual(orden.secciones)
    expect(await lista(page, 'data-nodo')).toEqual(orden.nodos)
    expect(await lista(page, 'data-atajos')).toEqual(orden.atajos)

    const medida = await columnas(page)
    // Una sola columna de secciones si el contenedor mide menos de 64 rem; una sola de celdas si la sección mide menos de 32 rem (`mitad`) o 48 (`tercio`): el corte es del contenedor.
    if (medida.hojaRem < 64) {
      expect(
        new Set(medida.secciones.map((s) => s.izquierda)).size,
        'las secciones en una columna',
      ).toBe(1)
    }
    for (const s of medida.secciones) {
      if (s.rem < 32) {
        expect(
          s.unaColumnaDeCeldas,
          `la sección ${String(s.id)} (${formatearNumero(s.rem, { decimales: 1 })} rem) en una columna`,
        ).toBe(true)
      }
    }
    info.annotations.push({
      type: `columnas al ${String(zoom)} %`,
      description: `hoja ${formatearNumero(medida.hojaRem, { decimales: 1 })} rem; secciones ${medida.secciones.map((s) => formatearNumero(s.rem, { decimales: 1 })).join(', ')} rem`,
    })
    await capturar(page, info, `cotizar-hoja-${String(zoom)}`)
    await page.getByLabel('Resumen').scrollIntoViewIfNeeded()
    await capturar(page, info, `cotizar-resumen-${String(zoom)}`)
  })
}

test('la hoja más grande del juego cabe en el tope de nodos del DOM, al abrir y con la hoja usada', async ({
  page,
}, info) => {
  const vigilante = await vigilarRecalculos(page)
  await abrir(page)
  const modalAlAbrir = await medirElModal(page)
  const alAbrir = (await nodosDelDom(page)) + modalAlAbrir.nodos
  const celdas = (await page.locator('[data-nodo] [data-xcell]').count()) + modalAlAbrir.celdas
  // La hoja usada: un monto tipeado, los dos interruptores encendidos (la garantía se dibuja) y un override con ↺.
  await celda(page, 'remate').locator('[data-parada="0"]').click()
  await celda(page, 'remate').locator('input').fill('9500')
  await celda(page, 'remate').locator('input').press('Enter')
  await celda(page, 'cuenta_especial_usa').getByRole('switch').click()
  await celda(page, 'mostrar_garantia').getByRole('switch').click()
  await expect(celda(page, 'garantia')).toBeVisible()
  await celda(page, 'fees').locator('[data-parada="0"]').click()
  await celda(page, 'fees').locator('input').fill('1300')
  await celda(page, 'fees').locator('input').press('Enter')
  await expect.poll(() => vigilante.respuestas.length).toBeGreaterThan(0)
  await expect(page.getByLabel('Resumen')).toHaveAttribute('aria-busy', 'false')
  const usada = (await nodosDelDom(page)) + (await medirElModal(page)).nodos
  info.annotations.push({
    type: 'nodos del DOM de la hoja',
    description: `${String(celdas)} celdas: ${String(alAbrir)} al abrir y ${String(usada)} usada (tope ${String(TOPE_DE_NODOS)})`,
  })
  console.warn(
    `[nodos] subasta_usa: ${String(celdas)} celdas, ${String(alAbrir)} al abrir y ${String(usada)} usada (tope ${String(TOPE_DE_NODOS)})`,
  )
  expect(alAbrir).toBeLessThanOrEqual(TOPE_DE_NODOS)
  expect(usada).toBeLessThanOrEqual(TOPE_DE_NODOS)
})

// @sin-celular: el JS que paga quien llega a la ruta no depende del ancho de la pantalla; se mide una vez, con el build, como el presupuesto de JS de las demás pantallas.
test('el JS en frío de la ruta de cotizar, anotado (el presupuesto formal es del 4.13-4)', async ({
  page,
}, info) => {
  await entrar(page, duena)
  const { bytes, chunks } = await medirJsEnFrio(
    page.context(),
    `/cotizaciones/nuevo?origen=${subasta}`,
  )
  info.annotations.push({
    type: 'JS en frío',
    description: `/cotizaciones/nuevo: ${String(enKB(bytes))} KB con gzip en ${String(chunks)} chunks`,
  })
  console.warn(
    `[js] /cotizaciones/nuevo: ${String(enKB(bytes))} KB con gzip en ${String(chunks)} chunks`,
  )
  expect(bytes).toBeGreaterThan(0)
})
