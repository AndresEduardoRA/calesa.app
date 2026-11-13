// Las reglas del barrido de accesibilidad (auditoría AA, 9.12): lo que una máquina comprueba en una página ya cargada. Hacen caer la
// prueba R1 (un control sin nombre accesible), R2 (un `aria-describedby` o `aria-labelledby` que apunta a un id que no existe), R3 (una
// página sin un `h1` o con más de uno), R6 (un control que no cambia de aspecto al recibir el foco por teclado) y R7 (blancos táctiles
// de 44 px) sólo en el celular y en las pantallas de las fases 5 a 9. R4, el título único, es la prueba A9 del spec; R5, el orden de
// foco, sólo informa. R1 lee el árbol que calcula Chrome por CDP (`Accessibility.getFullAXTree`), no `ariaSnapshot`, que lee el DOM.
//
// El descriptor de un hallazgo tiene que ser estable entre corridas para compararlo con los conocidos: rol, etiqueta HTML y sus
// atributos de forma (`data-slot`, `name`, `type`, `href` sin query), nunca un id de `useId` ni un texto que salga de los datos.
import type { Page } from '@playwright/test'

export type Regla = 'nombre' | 'referencia' | 'h1' | 'titulo' | 'orden' | 'foco' | 'blanco'
export const REGLAS_DURAS: readonly Regla[] = ['nombre', 'referencia', 'h1', 'foco']

export type Hallazgo = { regla: Regla; descriptor: string; n: number }

const CONTROLES = new Set([
  'button',
  'link',
  'textbox',
  'searchbox',
  'combobox',
  'listbox',
  'option',
  'checkbox',
  'radio',
  'switch',
  'slider',
  'spinbutton',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'tab',
  'treeitem',
])

type NodoAX = {
  ignored?: boolean
  role?: { value?: string }
  name?: { value?: string }
  backendDOMNodeId?: number
}
type NodoDOM = { localName?: string; attributes?: string[] }

// Lo que cambia entre corridas sale del descriptor: los ids de `useId`, los uuid de las filas sembradas y los teléfonos.
export function estable(descriptor: string): string {
  return descriptor
    .replace(/_R_[0-9a-z]+_|«r[0-9a-z]+»|:r[0-9a-z]+:/gi, '«id»')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '«id»')
    .replace(/tel:\+?\d+/g, 'tel:«n»')
}

// Junta los hallazgos iguales en uno con su cuenta.
function contar(regla: Regla, descriptores: string[]): Hallazgo[] {
  const cuenta = new Map<string, number>()
  for (const d of descriptores.map(estable)) cuenta.set(d, (cuenta.get(d) ?? 0) + 1)
  return [...cuenta].map(([descriptor, n]) => ({ regla, descriptor, n }))
}

function describirNodo(rol: string, nodo: NodoDOM | undefined): string {
  const attrs = new Map<string, string>()
  const lista = nodo?.attributes ?? []
  for (let i = 0; i + 1 < lista.length; i += 2) attrs.set(lista[i] ?? '', lista[i + 1] ?? '')
  const partes = [nodo?.localName ?? '?']
  for (const clave of ['data-slot', 'name', 'type']) {
    const valor = attrs.get(clave)
    if (valor) partes.push(`[${clave}=${valor}]`)
  }
  const href = attrs.get('href')
  if (href !== undefined) partes.push(` href=${href.split('?')[0] ?? ''}`)
  return `${rol} · ${partes.join('')}`
}

// R1 · todo control expuesto (no ignorado) con nombre vacío.
async function sinNombre(page: Page): Promise<Hallazgo[]> {
  const cdp = await page.context().newCDPSession(page)
  try {
    const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as { nodes: NodoAX[] }
    const descriptores: string[] = []
    for (const nodo of nodes) {
      const rol = nodo.role?.value ?? ''
      if (nodo.ignored || !CONTROLES.has(rol) || (nodo.name?.value ?? '').trim() !== '') continue
      const dom =
        nodo.backendDOMNodeId === undefined
          ? undefined
          : ((await cdp.send('DOM.describeNode', { backendNodeId: nodo.backendDOMNodeId })) as {
              node: NodoDOM
            })
      descriptores.push(describirNodo(rol, dom?.node))
    }
    return contar('nombre', descriptores)
  } finally {
    await cdp.detach()
  }
}

type Crudos = {
  referencias: string[]
  h1: number
  titulo: string
  orden: string[]
  blancos: string[] | null
}

// R2, R3, R4, R5 y R7 se miden en la página, de una vez.
function medirEnLaPagina(): Crudos {
  const describir = (el: Element): string => {
    const partes = [el.localName]
    for (const clave of ['data-slot', 'name', 'type', 'role']) {
      const valor = el.getAttribute(clave)
      if (valor) partes.push(`[${clave}=${valor}]`)
    }
    const href = el.getAttribute('href')
    if (href !== null) partes.push(` href=${href.split('?')[0] ?? ''}`)
    return partes.join('')
  }
  const visible = (el: Element) => el.checkVisibility({ visibilityProperty: true } as never)

  const referenciasRotas = (): string[] => {
    const salida: string[] = []
    for (const attr of ['aria-describedby', 'aria-labelledby']) {
      for (const el of document.querySelectorAll(`[${attr}]`)) {
        const faltan = (el.getAttribute(attr) ?? '')
          .split(/\s+/)
          .filter((id) => id !== '' && document.getElementById(id) === null)
        if (faltan.length > 0) salida.push(`${attr} · ${describir(el)}`)
      }
    }
    return salida
  }

  const ordenDeFoco = (): string[] => {
    const ENFOCABLE =
      'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    const salida: string[] = []
    for (const el of document.querySelectorAll('[tabindex]')) {
      if (Number(el.getAttribute('tabindex')) > 0) salida.push(`tabindex>0 · ${describir(el)}`)
    }
    for (const el of document.querySelectorAll(`[aria-hidden="true"] :is(${ENFOCABLE})`)) {
      // Los guardianes de foco de Radix son enfocables y ocultos a propósito.
      if (el.hasAttribute('data-radix-focus-guard') || !visible(el)) continue
      salida.push(`enfocable en aria-hidden · ${describir(el)}`)
    }
    return salida
  }

  // Sólo con puntero grueso (el celular): no se pregunta por el proyecto ni por el ancho.
  const blancosTactiles = (): string[] | null => {
    if (!window.matchMedia('(pointer: coarse)').matches) return null
    const TOQUE =
      'a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=checkbox], [role=switch], [role=menuitem], [role=radio]'
    // Lo de 1 o 2 px es un `sr-only` (el salto al contenido antes de enfocarlo), no un blanco.
    const chico = (el: Element) => {
      const caja = el.getBoundingClientRect()
      return caja.width > 2 && caja.height > 2 && (caja.width < 44 || caja.height < 44)
    }
    // Se toca lo que se ve: no el input nativo que Radix esconde (transparente y `aria-hidden`) detrás de su control.
    const tocable = (el: Element) =>
      el.checkVisibility({ visibilityProperty: true, opacityProperty: true } as never) &&
      !el.closest('[aria-hidden="true"]')
    // Un enlace dentro de un párrafo es la excepción de WCAG 2.5.8 (en línea con el texto).
    return [...document.querySelectorAll(TOQUE)]
      .filter((el) => tocable(el) && !(el.localName === 'a' && el.closest('p')) && chico(el))
      .map(describir)
  }

  return {
    referencias: referenciasRotas(),
    h1: [...document.querySelectorAll('h1')].filter(visible).length,
    titulo: document.title.trim(),
    orden: ordenDeFoco(),
    blancos: blancosTactiles(),
  }
}

export type Barrido = { hallazgos: Hallazgo[]; titulo: string }

export async function barrer(page: Page): Promise<Barrido> {
  const crudos = await page.evaluate(medirEnLaPagina)
  const hallazgos = [
    ...(await sinNombre(page)),
    ...contar('referencia', crudos.referencias),
    ...(crudos.h1 === 1
      ? []
      : [{ regla: 'h1' as const, descriptor: `${crudos.h1} h1 visibles`, n: 1 }]),
    ...(crudos.titulo === '' ? [{ regla: 'titulo' as const, descriptor: 'sin título', n: 1 }] : []),
    ...contar('orden', crudos.orden),
    ...(crudos.blancos === null ? [] : contar('blanco', crudos.blancos)),
  ]
  return { hallazgos, titulo: crudos.titulo }
}

// R6 · hasta 10 Tab desde el inicio: el elemento enfocado (o su padre, que puede dibujar el anillo) tiene que verse distinto que sin
// foco. Sin transiciones mientras se mide: una a medio camino se lee igual que sin foco.
export async function focoVisible(page: Page): Promise<Hallazgo[]> {
  const estilo = await page.addStyleTag({
    content: '*, *::before, *::after { transition: none !important; animation: none !important; }',
  })
  await page.evaluate(() => {
    ;(document.activeElement as HTMLElement | null)?.blur()
    window.scrollTo(0, 0)
  })
  await page
    .locator('body')
    .focus()
    .catch(() => undefined)
  const descriptores: string[] = []
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab')
    const invisible = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      if (!el || el === document.body) return null
      const PROPIEDADES = [
        'outline-style',
        'outline-width',
        'outline-color',
        'box-shadow',
        'border-color',
        'background-color',
        'text-decoration-line',
      ]
      const foto = (nodo: Element | null) => {
        if (!nodo) return ''
        const calculado = getComputedStyle(nodo)
        return PROPIEDADES.map((p) => calculado.getPropertyValue(p)).join('|')
      }
      const con = foto(el) + foto(el.parentElement)
      // Un `input type=date` guarda el foco en el campo de su mes: un solo `blur()` no lo suelta.
      for (let intento = 0; intento < 3 && document.activeElement === el; intento++) el.blur()
      if (document.activeElement === el) return null
      const sin = foto(el) + foto(el.parentElement)
      el.focus()
      if (con !== sin) return null
      const partes = [el.localName]
      for (const clave of ['data-slot', 'name', 'type', 'role']) {
        const valor = el.getAttribute(clave)
        if (valor) partes.push(`[${clave}=${valor}]`)
      }
      const href = el.getAttribute('href')
      if (href !== null) partes.push(` href=${href.split('?')[0] ?? ''}`)
      return partes.join('')
    })
    if (invisible) descriptores.push(invisible)
  }
  await estilo.evaluate((nodo) => (nodo as Element).remove())
  return contar('foco', descriptores)
}
