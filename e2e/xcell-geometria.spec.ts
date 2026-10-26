import { expect, test, type Page, type TestInfo } from './soporte/prueba'
import { abrirBanco, BANCO_DE_XCELL, RUTA_DEL_BANCO_DE_XCELL } from './soporte/banco'
import { capturar, sinScrollHorizontal, sinTextoCortado } from './soporte/recorrido'
import { contraste } from '../src/shared/lib/color'

// La XCell sola (4.12-1), vestida con los estilos reales de la app, en claro y en oscuro, con el texto al 100 y al 200 %, a 412 y a 1.280 px
// (los dos proyectos). Se afirma lo medible: la etiqueta se parte y no se corta, ninguna caja se encima ni se sale, el orden visual es el
// del DOM, los objetivos táctiles miden 44 px, la entrada ocupa la caja del valor, el «modificado» no se confunde con el foco, y los tonos
// llegan en los dos temas con contraste AA. Las capturas son para lo que se juzga mirando. El banco no es una ruta: `e2e/soporte/banco.ts`.

type Tema = 'claro' | 'oscuro'
type Zoom = '100' | '200'
const COMBINACIONES: { tema: Tema; zoom: Zoom }[] = [
  { tema: 'claro', zoom: '100' },
  { tema: 'claro', zoom: '200' },
  { tema: 'oscuro', zoom: '100' },
  { tema: 'oscuro', zoom: '200' },
]

const abrir = (page: Page, opciones: Parameters<typeof abrirBanco>[3]) =>
  abrirBanco(page, BANCO_DE_XCELL, RUTA_DEL_BANCO_DE_XCELL, opciones)

const enElCelular = (page: Page) => (page.viewportSize()?.width ?? 1280) < 768

const haceHex = (rgb: string): string => {
  const [rojo = 0, verde = 0, azul = 0] = (rgb.match(/[\d.]+/g) ?? []).map(Number)
  return `#${[rojo, verde, azul].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
}

// Las cajas de cada celda: ninguna se encima con otra, ninguna se sale de la celda, dos controles quedan a 4 px o más (el contorno del foco
// ocupa 4) y el orden visual (de arriba abajo y, en una fila, de izquierda a derecha) es el del DOM.
const problemasDeCaja = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const problemas: string[] = []
    const nombre = (e: Element) => e.getAttribute('aria-label') ?? e.textContent.trim().slice(0, 24)
    const esControl = (e: Element) => ['BUTTON', 'INPUT'].includes(e.tagName)
    // Lo que dice el par (a, b), en el orden del DOM; vacío si está bien.
    const juzgar = (a: Element, b: Element): string => {
      const ca = a.getBoundingClientRect()
      const cb = b.getBoundingClientRect()
      const ancho = Math.min(ca.right, cb.right) - Math.max(ca.left, cb.left)
      const alto = Math.min(ca.bottom, cb.bottom) - Math.max(ca.top, cb.top)
      if (ancho > 1 && alto > 1) return 'se encima con'
      const aparte = Math.max(
        cb.left - ca.right,
        ca.left - cb.right,
        cb.top - ca.bottom,
        ca.top - cb.bottom,
      )
      if (esControl(a) && esControl(b) && aparte < 4)
        return `queda a ${String(Math.round(aparte))} px (el contorno del foco lo tocaría) de`
      const mismaFila = cb.top < ca.bottom - 1 && cb.bottom > ca.top + 1
      const antes = cb.top < ca.top - 1 && !mismaFila
      return antes || (mismaFila && cb.left < ca.left - 1)
        ? 'se lee antes en el DOM y después en la pantalla que'
        : ''
    }
    for (const celda of document.querySelectorAll('[data-xcell]')) {
      const marco = celda.getBoundingClientRect()
      const hitos = [
        ...celda.querySelectorAll(
          '[id$="e"], [data-parada="12"], :scope > button, :scope > input, :scope > p',
        ),
      ]
      hitos.forEach((a, i) => {
        const ca = a.getBoundingClientRect()
        const donde = `${nombre(celda)} › «${nombre(a)}»`
        if (ca.left < marco.left - 0.5 || ca.right > marco.right + 0.5)
          problemas.push(`${donde} se sale de su celda`)
        for (const b of hitos.slice(i + 1)) {
          const dicho = juzgar(a, b)
          if (dicho !== '') problemas.push(`${donde} ${dicho} «${nombre(b)}»`)
        }
      })
    }
    return problemas
  })

// En el celular, todo lo que se toca mide 44 px en px (con el texto al 200 % también: no crece con rem pero tampoco achica).
async function objetivosTactiles(page: Page): Promise<void> {
  if (!enElCelular(page)) return
  const chicos = await page.evaluate(() =>
    [...document.querySelectorAll('[data-xcell] [data-parada]')]
      .map((e) => ({
        n: e.getAttribute('aria-label') ?? e.textContent.trim(),
        c: e.getBoundingClientRect(),
      }))
      .filter(({ c }) => Math.round(c.height) < 44 || Math.round(c.width) < 44)
      .map(({ n, c }) => `«${n}» ${String(Math.round(c.width))}×${String(Math.round(c.height))}`),
  )
  expect(chicos, 'objetivos táctiles de menos de 44 px').toEqual([])
}

const COLORES_DE_TONO: Record<
  Tema,
  Record<string, { fondo: string; borde: string; tinta: string }>
> = {
  claro: {
    amarillo: { fondo: '#fff7d6', borde: '#e9d27a', tinta: '#1b2130' },
    verde: { fondo: '#e6f6ee', borde: '#8fd3b0', tinta: '#1b2130' },
    naranja: { fondo: '#ffe9d6', borde: '#f0b27a', tinta: '#1b2130' },
    neutro: { fondo: '#ffffff', borde: '#cfd4de', tinta: '#1b2130' },
  },
  oscuro: {
    amarillo: { fondo: '#3e3f3c', borde: '#797251', tinta: '#f2f4f8' },
    verde: { fondo: '#2d3c42', borde: '#50726a', tinta: '#f2f4f8' },
    naranja: { fondo: '#3f3a3c', borde: '#876b55', tinta: '#f2f4f8' },
    neutro: { fondo: '#1d2330', borde: '#3b4457', tinta: '#f2f4f8' },
  },
}
const CASO_DE_TONO = {
  amarillo: 'tono-amarillo',
  verde: 'tono-verde',
  naranja: 'tono-naranja',
  neutro: 'tono-desconocido',
} as const

// El tono llega a la celda en este tema (claro u oscuro) y, desconocido, cae a un neutro; la tinta se lee sobre el fondo (AA) en todas.
async function tonosYContraste(page: Page, tema: Tema): Promise<void> {
  for (const [tono, caso] of Object.entries(CASO_DE_TONO)) {
    const celda = page.locator(`[data-caso="${caso}"] [data-xcell]`)
    const leido = await celda.evaluate((e) => {
      const s = getComputedStyle(e)
      return { fondo: s.backgroundColor, borde: s.borderTopColor, tinta: s.color }
    })
    const esperado = COLORES_DE_TONO[tema][tono]
    expect(
      { fondo: haceHex(leido.fondo), borde: haceHex(leido.borde), tinta: haceHex(leido.tinta) },
      `tono ${tono} en ${tema}`,
    ).toEqual(esperado)
    expect(
      contraste(haceHex(leido.tinta), haceHex(leido.fondo)),
      `contraste del tono ${tono}`,
    ).toBeGreaterThanOrEqual(4.5)
  }
}

// La entrada que reemplaza al valor ocupa su misma caja (sin salto), es transparente, sin borde propio y con la tinta del tono, y en el
// celular mide 44 px. Queda abierta.
async function entradaIgualAlBoton(page: Page, caso: string, parada: number): Promise<void> {
  const boton = page.locator(`[data-caso="${caso}"] [data-parada="${String(parada)}"]`)
  await boton.focus()
  const antes = await boton.boundingBox()
  await page.keyboard.press('Enter')
  const entrada = page.locator(`[data-caso="${caso}"] input`)
  await expect(entrada).toBeVisible()
  const despues = await entrada.boundingBox()
  for (const k of ['x', 'y', 'width', 'height'] as const) {
    expect(
      Math.abs((despues?.[k] ?? -1) - (antes?.[k] ?? -9)),
      `${caso}: ${k} de la entrada`,
    ).toBeLessThanOrEqual(0.5)
  }
  const estilo = await entrada.evaluate((e) => {
    const s = getComputedStyle(e)
    const celda = e.closest('[data-xcell]')
    return {
      fondo: s.backgroundColor,
      borde: s.borderTopWidth,
      tinta: s.color,
      tintaDeLaCelda: celda ? getComputedStyle(celda).color : '',
    }
  })
  expect(estilo.fondo, `${caso}: fondo de la entrada`).toBe('rgba(0, 0, 0, 0)')
  expect(estilo.borde, `${caso}: borde de la entrada`).toBe('0px')
  expect(estilo.tinta, `${caso}: tinta de la entrada`).toBe(estilo.tintaDeLaCelda)
  if (enElCelular(page)) expect(Math.round(despues?.height ?? 0)).toBeGreaterThanOrEqual(44)
}

// El «modificado» es un anillo INTERIOR; el foco, un contorno EXTERIOR de otro color: se ven los dos a la vez y no se confunden.
async function anilloDistintoDelFoco(page: Page): Promise<void> {
  const leer = (caso: string) =>
    page.locator(`[data-caso="${caso}"] [data-parada="0"]`).evaluate((e) => {
      const s = getComputedStyle(e)
      return {
        sombra: s.boxShadow,
        estilo: s.outlineStyle,
        ancho: s.outlineWidth,
        separacion: s.outlineOffset,
        color: s.outlineColor,
      }
    })
  expect((await leer('normal')).sombra).not.toContain('inset')
  expect((await leer('sugerido')).sombra).not.toContain('inset')
  const reposo = await leer('modificado')
  expect(reposo.sombra, 'el modificado lleva su anillo interior').toContain('inset')
  expect(reposo.estilo).toBe('none')
  // Con el foco por teclado (:focus-visible): el contorno de afuera aparece y el anillo de adentro sigue.
  await page.locator('[data-caso="sugerido"] [data-parada="0"]').focus()
  await page.keyboard.press('Tab')
  const conFoco = await leer('modificado')
  expect(conFoco).toMatchObject({ estilo: 'solid', ancho: '2px', separacion: '2px' })
  expect(conFoco.sombra, 'el anillo interior sigue con el foco').toContain('inset')
  const primario = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-primario-ink').trim(),
  )
  expect(haceHex(conFoco.color), 'el contorno del foco es el -ink del color primario').toBe(
    primario.toLowerCase(),
  )
  // Un indicador de foco se ve contra lo que tiene alrededor (WCAG 1.4.11, 3:1) en los dos temas.
  const fondo = await page
    .locator('[data-caso="modificado"] [data-xcell]')
    .evaluate((e) => getComputedStyle(e).backgroundColor)
  expect(
    contraste(haceHex(conFoco.color), haceHex(fondo)),
    'contraste del contorno de foco',
  ).toBeGreaterThanOrEqual(3)
  expect(conFoco.sombra, 'el anillo no es del color del foco').not.toContain(haceHex(conFoco.color))
}

// Las capturas, a la vista de quien las mira: la hoja entera por tramos del alto de la pantalla.
async function capturarTramos(page: Page, info: TestInfo, nombre: string): Promise<void> {
  const alto = await page.evaluate(() => document.documentElement.scrollHeight)
  const vista = page.viewportSize()?.height ?? 720
  for (let y = 0, n = 1; y < alto; y += vista - 40, n++) {
    await page.evaluate((arriba) => {
      window.scrollTo(0, arriba)
    }, y)
    await capturar(page, info, `${nombre}-${String(n)}`)
  }
  await page.evaluate(() => {
    window.scrollTo(0, 0)
  })
}

for (const { tema, zoom } of COMBINACIONES) {
  test(`la celda en ${tema}, con el texto al ${zoom} %`, async ({ page }, info) => {
    await abrir(page, { tema, zoom })
    await expect(page.locator('[data-xcell]')).toHaveCount(16)
    await sinScrollHorizontal(page)
    await sinTextoCortado(page.locator('#banco'))
    expect(await problemasDeCaja(page)).toEqual([])
    await objetivosTactiles(page)
    await tonosYContraste(page, tema)
    await anilloDistintoDelFoco(page)
    await capturarTramos(page, info, `${tema}-${zoom}`)
    await entradaIgualAlBoton(page, 'normal', 0)
    await page.keyboard.press('Escape')
    await entradaIgualAlBoton(page, 'par-modificado', 1)
    await page.keyboard.type('abc')
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-caso="par-modificado"] [role="alert"]')).toBeVisible()
    expect(await problemasDeCaja(page)).toEqual([])
    await page.locator('[data-caso="par-modificado"]').scrollIntoViewIfNeeded()
    await capturar(page, info, `${tema}-${zoom}-editando-con-error`)
    await entradaIgualAlBoton(page, 'error', 0)
    await sinScrollHorizontal(page)
  })
}

// Lo que el navegador le entrega a un lector de pantalla: el árbol de accesibilidad de verdad (CDP), no `ariaSnapshot()`, que se arma
// desde el DOM y lee `input.value` aunque el campo sea de contraseña. Devuelve el valor de cada cuadro de texto con ese nombre.
async function valoresEnElArbol(page: Page, nombre: string): Promise<string[]> {
  const cdp = await page.context().newCDPSession(page)
  const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as {
    nodes: { role?: { value?: string }; name?: { value?: string }; value?: { value?: unknown } }[]
  }
  await cdp.detach()
  return nodes
    .filter((n) => n.role?.value === 'textbox' && n.name?.value === nombre)
    .map((n) => String(n.value?.value ?? ''))
}

test('Modo Live: la cifra tipeada no queda a la vista ni en el árbol de accesibilidad', async ({
  page,
}) => {
  await abrir(page, { live: true })
  const boton = page.locator('[data-caso="normal"] [data-parada="0"]')
  expect(await boton.getAttribute('aria-labelledby'), 'el valor sin editar').not.toBeNull()
  await expect(boton).toContainText('•••')
  await boton.focus()
  await page.keyboard.press('Enter')
  const entrada = page.locator('[data-caso="normal"] input')
  await expect(entrada).toBeVisible()
  await expect(entrada).toHaveAttribute('type', 'password')
  const valores = await valoresEnElArbol(page, 'Fees')
  expect(valores, 'hay un cuadro de texto «Fees» en el árbol').toHaveLength(1)
  expect(valores.join(), 'la cifra de la entrada abierta').not.toMatch(/1\.?234/)
})

test('sin el Modo Live la entrada es un cuadro de texto con su valor a la vista del lector', async ({
  page,
}) => {
  await abrir(page, {})
  await page.locator('[data-caso="normal"] [data-parada="0"]').focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-caso="normal"] input')).toHaveAttribute('type', 'text')
  expect(await valoresEnElArbol(page, 'Fees')).toEqual(['1234,567'])
})
