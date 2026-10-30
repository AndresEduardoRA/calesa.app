'use client'

import { useEffect, useRef } from 'react'

// La vuelta del foco (4-49): tras **recargar** con un panel por URL abierto, «atrás» lo cierra y Base UI deja el foco en `body` (sin recargar, lo devuelve
// él). Quien abre deja una marca en la entrada de antes del historial (`vueltaDelFoco[clave]`: una ficha y las señas de quien tenía el foco) y la entrada
// del panel guarda la misma ficha (`vueltaDesde[clave]`); la página la recuerda en memoria. Sólo un `popstate` a la entrada marcada con la ficha recordada
// devuelve el foco: recargar no dispara `popstate` y cerrarse de otra manera (Esc, la ✕, otra escritura de la URL) olvida la ficha.
//
// `clave` es la de la URL que abre el panel (`panel`, `eliminar`): dos diálogos anidados no se pisan. Lo usan `usePanelPorUrl()` y los hooks que escriben
// su `?panel=` a mano (`scripts/guardas/paneles-con-vuelta.ts`).

export type Senas = { camino: number[]; etiqueta: string; nombre: number }
type Marca = { ficha: string; senas: Senas }
type Estado = Record<string, unknown>

export const TOPE_DE_LA_VUELTA_MS = 3_000
const MARCAS = 'vueltaDelFoco'
const DESDE = 'vueltaDesde'

// La ficha de cada panel abierto, por clave; y las claves cuya escritura de la URL aún no terminó.
const abiertos = new Map<string, string>()
const escribiendo = new Set<string>()

// --- Las señas: dónde estaba y cómo se llama, sin guardar su texto (puede nombrar un lead o un vehículo) ---

function hashDe(texto: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) {
    hash ^= texto.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash
}

const nombreDe = (el: Element): number =>
  hashDe((el.getAttribute('aria-label') ?? el.textContent).replace(/\s+/g, ' ').trim())

export function senasDe(el: Element): Senas {
  const camino: number[] = []
  let actual = el
  while (actual !== document.body && actual.parentElement) {
    camino.unshift(Array.prototype.indexOf.call(actual.parentElement.children, actual))
    actual = actual.parentElement
  }
  return { camino, etiqueta: el.tagName, nombre: nombreDe(el) }
}

// Por el camino, si ahí está la misma etiqueta con el mismo nombre; si no, el único de esa etiqueta con ese nombre.
export function buscarPorSenas(senas: Senas): HTMLElement | null {
  const coincide = (el: Element | undefined): el is HTMLElement =>
    el instanceof HTMLElement && el.tagName === senas.etiqueta && nombreDe(el) === senas.nombre
  let actual: Element | undefined = document.body
  for (const i of senas.camino) {
    actual = actual?.children[i]
  }
  if (coincide(actual)) {
    return actual
  }
  const candidatos = Array.from(document.getElementsByTagName(senas.etiqueta)).filter(coincide)
  return candidatos.length === 1 ? (candidatos[0] ?? null) : null
}

// --- Las marcas en el historial ---

function estado(): Estado {
  const actual: unknown = history.state
  return typeof actual === 'object' && actual !== null ? (actual as Estado) : {}
}

function leerDe(raiz: string, clave: string): unknown {
  const grupo = estado()[raiz]
  return typeof grupo === 'object' && grupo !== null ? (grupo as Estado)[clave] : undefined
}

// Suma a la entrada actual sin tocar lo demás (el `__NA` de Next: sin él, «atrás» recarga el documento).
function sumarA(raiz: string, clave: string, valor: unknown): void {
  const actual = estado()
  const grupo = actual[raiz]
  const previo = typeof grupo === 'object' && grupo !== null ? grupo : {}
  history.replaceState({ ...actual, [raiz]: { ...previo, [clave]: valor } }, '')
}

function fichaDeLaMarca(clave: string): string | null {
  const marca = leerDe(MARCAS, clave)
  if (typeof marca !== 'object' || marca === null) {
    return null
  }
  const ficha = (marca as Partial<Marca>).ficha
  return typeof ficha === 'string' ? ficha : null
}

const fichaNueva = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`

// Abre un panel (`escribir` suma la entrada al historial) dejando la marca para volver: sólo si el foco está en un elemento y el panel no estaba abierto.
export function abrirConVuelta(
  clave: string,
  escribir: () => Promise<unknown>,
  yaAbierto = false,
): void {
  const foco = document.activeElement
  if (yaAbierto || !(foco instanceof HTMLElement) || foco === document.body || !foco.isConnected) {
    void escribir()
    return
  }
  const ficha = fichaNueva()
  sumarA(MARCAS, clave, { ficha, senas: senasDe(foco) } satisfies Marca)
  abiertos.set(clave, ficha)
  escribiendo.add(clave)
  void escribir().then(() => {
    escribiendo.delete(clave)
    sumarA(DESDE, clave, ficha)
  })
}

// --- La vuelta: cuadro a cuadro, hasta que quien abrió esté y el foco esté libre ---

function volverA(senas: Senas): void {
  const inicio = Date.now()
  let cortada = false
  const cortar = () => {
    cortada = true
  }
  window.addEventListener('keydown', cortar, true)
  window.addEventListener('pointerdown', cortar, true)
  const terminar = () => {
    window.removeEventListener('keydown', cortar, true)
    window.removeEventListener('pointerdown', cortar, true)
  }
  const mirar = () => {
    if (cortada || Date.now() - inicio > TOPE_DE_LA_VUELTA_MS) {
      terminar()
      return
    }
    const quien = buscarPorSenas(senas)
    const activo = document.activeElement
    if (quien && activo === quien) {
      terminar()
      return
    }
    // Con el foco en otro elemento se espera: Base UI puede estar devolviéndolo.
    if (quien && (activo === null || activo === document.body)) {
      quien.focus({ preventScroll: true })
      terminar()
      return
    }
    requestAnimationFrame(mirar)
  }
  requestAnimationFrame(mirar)
}

function alCambiarDeEntrada(): void {
  for (const [clave, ficha] of abiertos) {
    const marca = leerDe(MARCAS, clave) as Partial<Marca> | undefined
    if (marca?.ficha === ficha && marca.senas) {
      abiertos.delete(clave)
      volverA(marca.senas)
    }
  }
}

let oyendo = false
function oirElHistorial(): void {
  if (!oyendo) {
    oyendo = true
    window.addEventListener('popstate', alCambiarDeEntrada)
  }
}

// Lo llama cada hook que abre un panel por la URL, con su clave y si está abierto. Abierto (también al montarse, tras recargar) recuerda la ficha de la
// entrada; al verse cerrado olvida la suya, salvo que la entrada actual sea la marcada (un «atrás»: de eso se ocupa el `popstate`).
export function useVueltaDelFoco(clave: string, abierto: boolean): void {
  const vista = useRef<string | null>(null)
  useEffect(oirElHistorial, [])
  useEffect(() => {
    if (abierto) {
      const desde = leerDe(DESDE, clave)
      if (!escribiendo.has(clave) && typeof desde === 'string') {
        abiertos.set(clave, desde)
      }
      vista.current = abiertos.get(clave) ?? null
      return
    }
    const ficha = vista.current
    vista.current = null
    if (ficha !== null && abiertos.get(clave) === ficha && fichaDeLaMarca(clave) !== ficha) {
      abiertos.delete(clave)
    }
  }, [clave, abierto])
}
