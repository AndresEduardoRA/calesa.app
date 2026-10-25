// Lo que el e2e de Configuración › Cotización › Niveles al 200 % mide de las dos listas (la de niveles y la de retirados): que cada texto —el nombre, el
// estado y el uso, en la tabla de escritorio o en la tarjeta del celular— se vea entero, y que un aviso no tape ninguno ni el «⋯» de una fila (4-15).
// Con la tabla al 200 % la columna del «⋯», pegada a la derecha, tapaba «Estado» («Estac») y «Uso»: ninguna celda desbordaba, así que `scrollWidth >
// clientWidth` no lo veía; hay que preguntar quién recibe un clic sobre el texto.
import type { Page } from '@playwright/test'

const SECCIONES =
  'section[aria-labelledby="titulo-de-niveles"], section[aria-labelledby="titulo-de-retirados"]'

type Texto = {
  quien: string
  esCelda: boolean
  desborda: boolean
  recortadoPor: string
  tapadoPor: string
}

// Cada elemento con texto propio de las dos listas, con lo que se mide de él: si desborda su celda, qué contenedor que se desplaza lo recorta y qué
// recibe un clic en su centro y en su borde derecho si no es él ni lo que lo contiene. Se trae cada uno al centro de la pantalla antes de medirlo.
function medirTextos(selector: string): Texto[] {
  const describir = (e: Element) =>
    `${e.tagName.toLowerCase()} «${e.textContent.trim().slice(0, 30)}»`
  const tieneTexto = (e: Element) =>
    [...e.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim() !== '')
  const recortador = (e: Element): string => {
    const caja = e.getBoundingClientRect()
    for (let a = e.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const c = a.getBoundingClientRect()
      if (
        getComputedStyle(a).overflowX !== 'visible' &&
        (caja.right > c.right + 0.5 || caja.left < c.left - 0.5)
      ) {
        return describir(a)
      }
    }
    return ''
  }
  const tapador = (e: Element): string => {
    const caja = e.getBoundingClientRect()
    const y = caja.top + caja.height / 2
    for (const x of [caja.left + caja.width / 2, caja.right - 2]) {
      const arriba = document.elementFromPoint(x, y)
      if (!arriba || !(e.contains(arriba) || arriba.contains(e))) {
        return `${arriba ? describir(arriba) : 'nada'} en x ${String(Math.round(x))}`
      }
    }
    return ''
  }
  return [...document.querySelectorAll(selector)]
    .flatMap((seccion) => [...seccion.querySelectorAll('*')])
    .filter((e) => tieneTexto(e) && e.getBoundingClientRect().width > 1)
    .map((e) => {
      e.scrollIntoView({ block: 'center' })
      return {
        quien: describir(e),
        esCelda: e.tagName === 'TH' || e.tagName === 'TD',
        desborda: e.scrollWidth > e.clientWidth + 1,
        recortadoPor: recortador(e),
        tapadoPor: tapador(e),
      }
    })
}

// Lo que no se ve entero, dicho: vacío si cada texto cabe en su celda, nadie lo recorta ni lo tapa.
export async function textosQueNoSeVenEnteros(page: Page): Promise<string[]> {
  const textos = await page.evaluate(medirTextos, SECCIONES)
  return textos.flatMap((t) => [
    ...(t.esCelda && t.desborda ? [`${t.quien}: desborda su celda`] : []),
    ...(t.recortadoPor ? [`${t.quien}: lo recorta ${t.recortadoPor}`] : []),
    ...(t.tapadoPor ? [`${t.quien}: lo tapa ${t.tapadoPor}`] : []),
  ])
}

// Lo de las listas que está a la vista (texto y botones, sin desplazar la página) y que la caja del aviso cruza.
function cruzadosPorElAviso(selector: string): string[] {
  const aviso = document.querySelector('[data-sonner-toast]')?.getBoundingClientRect()
  if (!aviso) {
    return ['no hay aviso']
  }
  const aLaVista = (c: DOMRect) => c.width > 1 && c.bottom > 0 && c.top < window.innerHeight
  const cruza = (c: DOMRect) =>
    c.left < aviso.right && c.right > aviso.left && c.top < aviso.bottom && c.bottom > aviso.top
  const propios = (e: Element) =>
    e.tagName === 'BUTTON' ||
    [...e.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim() !== '')
  return [...document.querySelectorAll(selector)]
    .flatMap((seccion) => [...seccion.querySelectorAll('*')])
    .filter(
      (e) => propios(e) && aLaVista(e.getBoundingClientRect()) && cruza(e.getBoundingClientRect()),
    )
    .map((e) => `${e.tagName.toLowerCase()} «${e.textContent.trim().slice(0, 30)}»`)
}

export const quePisaElAviso = (page: Page): Promise<string[]> =>
  page.evaluate(cruzadosPorElAviso, SECCIONES)

// Trae una de las dos listas al primer cuadro de la pantalla (las capturas la muestran con sus filas: al 200 % la tabla queda bajo el pliegue).
export async function traerALaVista(page: Page, lista: 'niveles' | 'retirados'): Promise<void> {
  await page.evaluate(
    (titulo) => {
      const seccion = document.querySelector(`section[aria-labelledby="${titulo}"]`)
      seccion?.scrollIntoView({ block: 'start' })
      window.scrollBy(0, -140)
    },
    lista === 'niveles' ? 'titulo-de-niveles' : 'titulo-de-retirados',
  )
}
