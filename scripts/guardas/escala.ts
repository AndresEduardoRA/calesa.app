// El detector de las guardas de escala (`.claude/rules/escala.md`): lee el texto de un archivo de `src/` y
// dice qué reglas rompe. Puro (sin leer el disco) para poder probarlo con muestras. `escala.test.ts` lo
// corre sobre todo `src/` y compara con `excepciones-de-escala.ts`.

export type Infraccion = {
  // La regla rota: `count`, `head`, `range`, `select-todo` o `sin-tope:<tabla>`.
  regla: string
  linea: number
  texto: string
}

// Las tablas que no crecen con el uso (configuración, catálogos, lo propio de una persona con un tope en
// la base): se leen enteras. Cada una dice por qué y hasta cuánto. El resto de las tablas son listas que
// crecen y toda lectura tiene un tope (`.limit(`), pide una fila (`.single()`, `.maybeSingle()`) o un
// conjunto de ids que ya se leyó (`.eq('id', …)`, `.in('id', …)`).
export type TablaAcotada = { motivo: string; tope: string }

const CON_TOPE = /\.limit\(|\.single\(|\.maybeSingle\(|\.eq\(\s*['"]id['"]|\.in\(\s*['"]id['"]/

function lineaDe(texto: string, indice: number): number {
  return texto.slice(0, indice).split('\n').length
}

// Desde `indice` hasta el cierre de la llave que lo contiene: la función que arma la consulta. La consulta
// puede armarse en varias sentencias (`const base = supabase.from(…)` y más abajo `.limit(…)`).
export function funcionQueContiene(texto: string, indice: number): string {
  let profundidad = 0
  for (let i = indice; i < texto.length; i += 1) {
    const c = texto[i]
    if (c === '{') {
      profundidad += 1
    } else if (c === '}') {
      if (profundidad === 0) {
        return texto.slice(Math.max(0, indice - 600), i)
      }
      profundidad -= 1
    }
  }
  return texto.slice(Math.max(0, indice - 600))
}

function conLinea(texto: string, indice: number, largo: number, regla: string): Infraccion {
  return {
    regla,
    linea: lineaDe(texto, indice),
    texto: texto.slice(indice, indice + largo).split('\n')[0] ?? '',
  }
}

// La región nombra al menos una tabla y todas las que nombra son acotadas.
function soloTablasAcotadas(
  region: string,
  tablasAcotadas: Readonly<Record<string, TablaAcotada>>,
): boolean {
  const tablas = [...region.matchAll(/\.from\(\s*['"]([a-z_]+)['"]\s*\)/g)].map((m) => m[1] ?? '')
  return tablas.length > 0 && tablas.every((t) => tablasAcotadas[t] !== undefined)
}

export function buscarInfracciones(
  texto: string,
  tablasAcotadas: Readonly<Record<string, TablaAcotada>>,
): Infraccion[] {
  const salida: Infraccion[] = []
  const reglas: readonly [string, RegExp][] = [
    ['count', /\bcount:\s*['"`]/g],
    ['count', /\([a-z_]*\s*count\s*\)/g],
    ['head', /\bhead:\s*true\b/g],
    ['range', /\.range\(/g],
    ['select-todo', /\.select\(\s*(['"`])\*\1\s*\)/g],
  ]
  for (const [regla, patron] of reglas) {
    for (const m of texto.matchAll(patron)) {
      // Todas las columnas de una tabla que no crece (el layout de campos, los ajustes) no pesan.
      if (
        regla === 'select-todo' &&
        soloTablasAcotadas(funcionQueContiene(texto, m.index), tablasAcotadas)
      ) {
        continue
      }
      salida.push(conLinea(texto, m.index, m[0].length, regla))
    }
  }
  for (const m of texto.matchAll(/\.from\(\s*['"]([a-z_]+)['"]\s*\)/g)) {
    const tabla = m[1] ?? ''
    if (tablasAcotadas[tabla]) {
      continue
    }
    if (!CON_TOPE.test(funcionQueContiene(texto, m.index))) {
      salida.push(conLinea(texto, m.index, m[0].length, `sin-tope:${tabla}`))
    }
  }
  return salida
}
