// Lo que `sinScrollHorizontal()` no ve: un panel (un `<Drawer>`) recorta lo que se sale por su derecha, así que la página no se
// desplaza y el contenido igual queda cortado («Transmisió…», una pestaña a medias). Reflujo con el texto al 200 % (WCAG 1.4.10).
import { expect, type Locator } from '@playwright/test'

// Ningún contenedor del panel que desplaza (el cuerpo del panel, con `overflow-y: auto`, también desplaza de costado sin decirlo) tiene
// contenido más ancho que él, salvo la lista de pestañas, que se desplaza a propósito y lo dice con su degradado.
export async function nadaSeSaleDelPanel(panel: Locator): Promise<void> {
  const cortados = await panel.evaluate((raiz) =>
    [raiz, ...raiz.querySelectorAll('*')]
      .filter((e) => {
        const { overflowX } = getComputedStyle(e)
        return overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'hidden'
      })
      // Un texto `sr-only` mide 1 px a propósito: no es una caja que se corte.
      .filter((e) => !e.matches('[role="tablist"], .sr-only') && e.clientWidth > 2)
      .filter((e) => e.scrollWidth > e.clientWidth + 1)
      .map((e) => {
        const ancho = e.getBoundingClientRect().right
        // Lo que se pasa del borde del contenedor: dice qué lo ensancha.
        const culpables = [...e.querySelectorAll('*')]
          .filter(
            (h) => h.getBoundingClientRect().right > ancho + 1 && !h.closest('[role="tablist"]'),
          )
          .slice(0, 3)
          .map((h) => `«${h.textContent.trim().slice(0, 25)}»`)
        return `${e.tagName.toLowerCase()} (${String(e.scrollWidth)} > ${String(e.clientWidth)}) ${culpables.join(' ')}`
      }),
  )
  expect(
    cortados,
    `algo se corta por la derecha dentro del panel: ${cortados.join(' | ')}`,
  ).toEqual([])
}
