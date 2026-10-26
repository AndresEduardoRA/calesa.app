// El vigilante de los recálculos del navegador y el detector de lo que quien mira no tiene que recibir (paso 4.13-2).
import type { Page } from '@playwright/test'

// ---------------------------------------------------------------------------------------------------------------------------------
// Los recálculos del navegador
// ---------------------------------------------------------------------------------------------------------------------------------
export type PedidoDeRecalculoVisto = {
  p_entradas: {
    inputs: Record<string, number>
    banderas: Record<string, boolean>
    overrides: Record<string, number>
    variante?: string
  }
  p_origen: string
  p_vehiculo?: string
  p_modo_tc?: string
}

export type Vigilante = {
  pedidos: PedidoDeRecalculoVisto[]
  respuestas: unknown[]
  // El máximo de pedidos en vuelo a la vez desde que se vigila.
  enVueloMaximo: () => number
  // Mientras esté retenido, cada pedido espera a `soltar()` antes de llegar a la base.
  retener: () => void
  soltar: () => void
  // Mientras esté cortado, cada pedido falla como si no hubiera red.
  cortar: () => void
  restablecer: () => void
}

const RUTA_DE_EVALUAR = '**/rest/v1/rpc/cotizacion_evaluar'

export async function vigilarRecalculos(page: Page): Promise<Vigilante> {
  const pedidos: PedidoDeRecalculoVisto[] = []
  const respuestas: unknown[] = []
  let enVuelo = 0
  let maximo = 0
  let retenido = false
  let cortado = false
  let liberadores: (() => void)[] = []
  await page.route(RUTA_DE_EVALUAR, async (ruta) => {
    const pedido = ruta.request()
    if (pedido.method() !== 'POST') {
      await ruta.continue()
      return
    }
    pedidos.push(pedido.postDataJSON() as PedidoDeRecalculoVisto)
    enVuelo += 1
    maximo = Math.max(maximo, enVuelo)
    try {
      if (cortado) {
        await ruta.abort('failed')
        return
      }
      if (retenido) {
        await new Promise<void>((resolver) => liberadores.push(resolver))
      }
      const respuesta = await ruta.fetch()
      respuestas.push(await respuesta.json())
      await ruta.fulfill({ response: respuesta })
    } finally {
      enVuelo -= 1
    }
  })
  return {
    pedidos,
    respuestas,
    enVueloMaximo: () => maximo,
    retener: () => {
      retenido = true
    },
    soltar: () => {
      retenido = false
      const pendientes = liberadores
      liberadores = []
      for (const liberar of pendientes) liberar()
    },
    cortar: () => {
      cortado = true
    },
    restablecer: () => {
      cortado = false
    },
  }
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Lo que no tiene que llegar: claves y hojas de un JSON, fichas del payload RSC y lo que dibuja el DOM
// ---------------------------------------------------------------------------------------------------------------------------------
export type Ficha = string | number

// Toda clave y toda hoja (texto o número) de un JSON: un nodo oculto delata por su id como clave y por su etiqueta o su valor como hoja.
export function fichasDeUnJson(valor: unknown, dentro: Ficha[] = []): Ficha[] {
  if (Array.isArray(valor)) {
    for (const v of valor) fichasDeUnJson(v, dentro)
  } else if (valor !== null && typeof valor === 'object') {
    for (const [clave, v] of Object.entries(valor)) {
      dentro.push(clave)
      fichasDeUnJson(v, dentro)
    }
  } else if (typeof valor === 'string' || typeof valor === 'number') {
    dentro.push(valor)
  }
  return dentro
}

// El payload RSC en línea de un documento (`self.__next_f.push([1,"…"])`): el texto entero y las fichas, cada literal de texto y cada número suelto. (Next lo vacía al hidratar: se lee del
// cuerpo del documento o de la respuesta de una navegación, nunca de `window`.)
export function fichasDelRsc(texto: string): { texto: string; fichas: Ficha[] } {
  const trozos = [...texto.matchAll(/self\.__next_f\.push\((\[[\s\S]*?\])\)<\/script>/g)].flatMap(
    (m) => {
      try {
        const [, carga] = JSON.parse(m[1] ?? '[]') as [number, string]
        return typeof carga === 'string' ? [carga] : []
      } catch {
        return []
      }
    },
  )
  const unido = trozos.join('')
  const fichas: Ficha[] = []
  for (const literal of unido.matchAll(/"((?:[^"\\]|\\.)*)"/g)) {
    try {
      fichas.push(JSON.parse(`"${literal[1] ?? ''}"`) as string)
    } catch {
      // un literal que no es JSON no es una ficha
    }
  }
  for (const numero of unido.matchAll(/(?<![\w."])-?\d+(?:\.\d+)?(?![\w"])/g)) {
    fichas.push(Number(numero[0]))
  }
  return { texto: unido, fichas }
}

// Todo lo que el DOM guarda: cada texto, cada valor de atributo y cada nombre de atributo `data-*`.
export async function fichasDelDom(page: Page): Promise<Ficha[]> {
  return page.evaluate(() => {
    const fichas: string[] = []
    const recorrer = (nodo: Node) => {
      if (nodo.nodeType === Node.TEXT_NODE) {
        const t = (nodo.textContent ?? '').trim()
        if (t !== '') fichas.push(t)
      } else if (nodo instanceof Element) {
        for (const a of nodo.attributes) {
          fichas.push(a.value)
          if (a.name.startsWith('data-')) fichas.push(a.name)
        }
      }
      for (const hijo of nodo.childNodes) recorrer(hijo)
    }
    recorrer(document.body)
    return fichas
  })
}

export type Oculto = {
  ids: readonly string[]
  etiquetas: readonly string[]
  numeros: readonly number[]
}

// Qué de lo oculto aparece entre las fichas: sus ids y etiquetas por igualdad exacta y sus valores como número (o, en un texto, tal cual o con el formato de la empresa).
export function filtrados(fichas: readonly Ficha[], oculto: Oculto): string[] {
  const texto = new Set(oculto.ids.concat(oculto.etiquetas))
  const numeros = new Set(oculto.numeros)
  const formas = new Set(oculto.numeros.flatMap((n) => [String(n), n.toLocaleString('es-BO')]))
  return fichas.flatMap((f) => {
    if (typeof f === 'number') return numeros.has(f) ? [`número ${String(f)}`] : []
    if (texto.has(f)) return [`texto «${f}»`]
    return formas.has(f) ? [`valor «${f}»`] : []
  })
}

// La marca de la fórmula de prueba como subcadena: ninguna etiqueta ni título escondido puede aparecer, ni cortado dentro de otro texto.
export const trae = (texto: string, marca: string): boolean => texto.includes(marca)
