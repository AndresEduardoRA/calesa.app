// Lo que lee `paginas.test.ts` de las migraciones y del código: puro, sin disco (cada función recibe el texto).

// Los parámetros que son un tamaño de página: lo que una RPC recibe y no puede dejarle al cliente.
export const PARAMETROS_DE_TAMANO =
  /\bp_(?:tamano|tope|tope_total|limite|cantidad|limit|max|por_pagina|primeros)\b/

export type CotaDeLaBase = { defecto: number; maximo: number }

// El texto de la **última** definición de `public.<rpc>(` entre las migraciones, que se dan en el orden en que corren.
export function ultimaDefinicion(
  migraciones: readonly { archivo: string; texto: string }[],
  rpc: string,
): { archivo: string; cuerpo: string } | null {
  const inicio = new RegExp(`create (?:or replace )?function public\\.${rpc}\\(`, 'gi')
  let hallada: { archivo: string; cuerpo: string } | null = null
  for (const { archivo, texto } of migraciones) {
    for (const m of texto.matchAll(inicio)) {
      const desde = m.index
      const fin = texto.indexOf('\n$$;', desde)
      hallada = { archivo, cuerpo: texto.slice(desde, fin === -1 ? undefined : fin) }
    }
  }
  return hallada
}

// `_acotar_pagina(<parametro>, por_defecto, máximo)` dentro de un cuerpo, o `null` si no acota ese parámetro así.
export function cotaDeLaBase(cuerpo: string, parametro: string): CotaDeLaBase | null {
  const m = new RegExp(
    `_acotar_pagina\\(\\s*${parametro}\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*\\)`,
  ).exec(cuerpo)
  return m ? { defecto: Number(m[1]), maximo: Number(m[2]) } : null
}

// ¿Acota a mano con `least(greatest(coalesce(p_x…` en vez de pasar por el ayudante?
export function acotaAMano(cuerpo: string): boolean {
  return new RegExp(
    `least\\s*\\(\\s*greatest\\s*\\(\\s*coalesce\\s*\\(\\s*${PARAMETROS_DE_TAMANO.source}`,
  ).test(cuerpo)
}

export type LlamadaConTamano = { rpc: string; parametro: string; literal: boolean; texto: string }

// El objeto que sigue a `desde` (una `{`), hasta su `}` de cierre: cuenta las llaves anidadas (`...(x ? { … } : {})`).
function objetoDesde(fuente: string, desde: number): string {
  let profundidad = 0
  for (let i = desde; i < fuente.length; i++) {
    if (fuente[i] === '{') {
      profundidad++
    } else if (fuente[i] === '}') {
      profundidad--
      if (profundidad === 0) {
        return fuente.slice(desde + 1, i)
      }
    }
  }
  return fuente.slice(desde + 1)
}

// Las llamadas `.rpc('nombre', { …, p_tamano: … })` del código que pasan un parámetro de tamaño, con el valor que le
// dan: `literal` si es un número escrito a mano en vez de una constante.
export function llamadasConTamano(fuente: string): LlamadaConTamano[] {
  const salida: LlamadaConTamano[] = []
  for (const m of fuente.matchAll(/\.rpc\(\s*'([a-z_]+)'\s*,\s*(\{)/g)) {
    const rpc = m[1] ?? ''
    const argumentos = objetoDesde(fuente, m.index + m[0].length - 1)
    for (const campo of argumentos.matchAll(/\b(p_[a-z_]+)\s*:\s*([^,\n]+)/g)) {
      const parametro = campo[1] ?? ''
      if (new RegExp(`^${PARAMETROS_DE_TAMANO.source}$`).test(parametro)) {
        const valor = (campo[2] ?? '').trim()
        salida.push({ rpc, parametro, literal: /^-?\d/.test(valor), texto: valor })
      }
    }
  }
  return salida
}

// Los tamaños que admite el `check` de `preferencias_usuario` para `listas.por_pagina`, en orden.
export function tamanosDelCheck(esquema: string): number[] | null {
  const m =
    /preferencias_por_pagina_valida check \(\s*clave <> 'listas\.por_pagina' or valor in \(([^)]*)\)\)/.exec(
      esquema,
    )
  if (!m) {
    return null
  }
  return [...(m[1] ?? '').matchAll(/'(\d+)'::jsonb/g)].map((x) => Number(x[1]))
}

// El `max_rows` de PostgREST en `config.toml`: lo máximo que devuelve cualquier lectura por la API.
export function maxRows(toml: string): number | null {
  const m = /^max_rows\s*=\s*(\d+)/m.exec(toml)
  return m ? Number(m[1]) : null
}
