// Cuenta, en el navegador, lo que le pasa al drawer «Nuevo lead»: cuántas hojas suyas entran al documento (montajes), cuántas se ven moverse
// al entrar (la caja o la opacidad cambian mientras está abierta), cuántas transiciones de entrada corren y si pasó por el esqueleto o el
// error. Cuenta hechos, no mira el DOM final: un drawer que se vuelve a montar cuenta otra vez aunque se vea igual (5b-6).
import type { Page } from '@playwright/test'

export type Cuenta = {
  montajes: number
  animados: number
  movidos: number
  conEstadoInicial: number
  vioEsqueleto: boolean
  vioError: boolean
}

// Antes de que cargue la página: se instala con `addInitScript` y vive en `window.__alta`.
export async function contarElDrawer(page: Page): Promise<void> {
  await instalarElObservador(page)
  await instalarLasTransiciones(page)
}

async function instalarElObservador(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const cuenta = {
      montajes: 0,
      animados: 0,
      movidos: 0,
      conEstadoInicial: 0,
      vioEsqueleto: false,
      vioError: false,
    }
    ;(window as unknown as { __alta: typeof cuenta }).__alta = cuenta
    const montadas = new WeakSet<Element>()
    const conInicial = new WeakSet<Element>()
    const esDelAlta = (e: Element) =>
      e.matches('[data-slot="sheet-content"]') && e.textContent.includes('Nuevo lead')
    // ¿Se ve entrar? Se muestrea su caja y su opacidad cuadro a cuadro: si cambian mientras está abierta, se animó.
    const vigilarLaEntrada = (hoja: Element) => {
      const antes = hoja.getBoundingClientRect()
      const opacidadAntes = Number(getComputedStyle(hoja).opacity)
      const desde = performance.now()
      let movida = false
      const muestrear = () => {
        if (!hoja.isConnected || hoja.hasAttribute('data-ending-style')) return
        if (performance.now() - desde > 700) return
        const ahora = hoja.getBoundingClientRect()
        const opacidad = Number(getComputedStyle(hoja).opacity)
        if (
          !movida &&
          (Math.abs(ahora.left - antes.left) > 1 || Math.abs(opacidad - opacidadAntes) > 0.01)
        ) {
          movida = true
          cuenta.movidos += 1
        }
        requestAnimationFrame(muestrear)
      }
      requestAnimationFrame(muestrear)
    }
    const mirar = (nodo: Node) => {
      if (!(nodo instanceof Element)) return
      for (const hoja of [nodo, ...nodo.querySelectorAll('[data-slot="sheet-content"]')]) {
        if (esDelAlta(hoja) && !montadas.has(hoja)) {
          montadas.add(hoja)
          cuenta.montajes += 1
          vigilarLaEntrada(hoja)
        }
      }
    }
    new MutationObserver((registros) => {
      for (const r of registros) {
        r.addedNodes.forEach(mirar)
        if (r.target instanceof Element && esDelAlta(r.target) && !conInicial.has(r.target)) {
          conInicial.add(r.target)
          cuenta.conEstadoInicial += 1
        }
      }
      if (document.querySelector('[aria-label="Cargando el formulario"]'))
        cuenta.vioEsqueleto = true
      if (document.body.textContent.includes('No se pudo cargar el formulario.'))
        cuenta.vioError = true
    }).observe(document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-starting-style'],
    })
  })
}

// Las transiciones de entrada (no las de salida) de una hoja del alta, una vez por hoja.
async function instalarLasTransiciones(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const animadas = new WeakSet<Element>()
    document.addEventListener(
      'transitionrun',
      (e) => {
        const blanco = e.target
        if (
          blanco instanceof Element &&
          blanco.matches('[data-slot="sheet-content"]') &&
          blanco.textContent.includes('Nuevo lead') &&
          !blanco.hasAttribute('data-ending-style') &&
          ['translate', 'transform', 'opacity'].includes(e.propertyName) &&
          !animadas.has(blanco)
        ) {
          animadas.add(blanco)
          ;(window as unknown as { __alta: { animados: number } }).__alta.animados += 1
        }
      },
      true,
    )
  })
}

export const leerCuenta = (page: Page): Promise<Cuenta> =>
  page.evaluate(() => (window as unknown as { __alta: Cuenta }).__alta)
