// El `test` de los e2e: el de Playwright, más una espera después de cada carga completa de página.
//
// Un documento recién pedido trae, un momento, el contenido de cada <Suspense> dos veces: la copia que
// ya se ve y la que React deja en un `<div hidden id="S:n">` hasta revelarla (con un respiro de unos
// 300 ms para no parpadear). Los locators de Playwright cuentan los elementos ocultos y un `getByText`
// estricto que cae en esa ventana falla al instante, sin reintentar. Para una persona no hay nada que
// ver (la copia es `hidden`), así que no es de la app: es de la prueba que mira demasiado pronto.
// Esperar a que no queden contenedores `S:` es esperar a que la página asiente. (Los marcadores
// `<template id="B:n">` no sirven de señal: una frontera que se dibuja en el cliente, como la de
// `useSearchParams`, deja el suyo para siempre.)
//
// `goto` y `reload` esperan; las páginas de otras personas (`browser.newContext`) también.
import { test as base, type Browser, type BrowserContext, type Page } from '@playwright/test'

export * from '@playwright/test'

const ASENTADA = () => document.querySelector('[id^="S:"]') === null

// Sin lanzar: si algo raro la deja sin asentar, avisa y deciden los asserts de cada prueba.
export async function esperarQueAsiente(page: Page): Promise<void> {
  await page.waitForFunction(ASENTADA, null, { timeout: 5_000 }).catch(() => {
    console.warn(`[prueba] ${page.url()} no asentó en 5 s: quedan contenedores S: sin revelar.`)
  })
}

const conEsperaPuesta = new WeakSet<Page>()

function esperarTrasCargar(page: Page): void {
  if (conEsperaPuesta.has(page)) return
  conEsperaPuesta.add(page)
  const goto = page.goto.bind(page)
  const reload = page.reload.bind(page)
  page.goto = async (...args) => {
    const respuesta = await goto(...args)
    await esperarQueAsiente(page)
    return respuesta
  }
  page.reload = async (...args) => {
    const respuesta = await reload(...args)
    await esperarQueAsiente(page)
    return respuesta
  }
}

function conEspera(contexto: BrowserContext): BrowserContext {
  contexto.on('page', esperarTrasCargar)
  for (const pagina of contexto.pages()) esperarTrasCargar(pagina)
  return contexto
}

function conContextosConEspera(browser: Browser): Browser {
  const nuevoContexto = browser.newContext.bind(browser)
  browser.newContext = async (...args) => conEspera(await nuevoContexto(...args))
  return browser
}

export const test = base.extend<object, { browser: Browser }>({
  browser: [
    async ({ browser }, entregar) => {
      await entregar(conContextosConEspera(browser))
    },
    { scope: 'worker' },
  ],
  context: async ({ context }, entregar) => {
    await entregar(conEspera(context))
  },
})
