// Lo puro de la guarda de los barriles (`barriles.test.ts`): qué módulos `'use client'` alcanza un archivo siguiendo sus imports.
//
// Una pantalla paga en JS todo lo que reexporta el archivo que importa, aunque no lo use: Next arma el manifiesto de cliente de la página
// con todo módulo `'use client'` que encuentra en el grafo de servidor. El `index.ts` de un módulo lo importa casi toda pantalla (la sesión,
// una lectura, un tipo): si alcanza un componente de cliente, ese componente viaja en todas (`/perfil` pagaba 30 KB de la lista del equipo, la
// matriz de roles y los formularios de Empresa). Por eso el `index.ts` no exporta componentes y no alcanza ninguno.

export type Lector = (ruta: string) => string | undefined

// ¿El archivo empieza con la directiva `'use client'`? (después de los comentarios y las líneas en blanco)
export function esDeCliente(texto: string): boolean {
  return /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*['"]use client['"]/.test(texto)
}

// Lo que un archivo importa o reexporta **en tiempo de ejecución**: un `import type`, un `export type` o un import de sólo tipos
// (`import { type A }`) se borran al compilar y no suman nada al grafo. Un `import()` dinámico tampoco: carga aparte.
export function importacionesDe(texto: string): string[] {
  const especificadores: string[] = []
  for (const m of texto.matchAll(
    /(?:^|\n)[ \t]*(?:import|export)\s+([^;'"]*?)\s*from\s*['"]([^'"]+)['"]/g,
  )) {
    const clausula = m[1] ?? ''
    const especificador = m[2]
    if (especificador === undefined || /^type\s/.test(clausula)) {
      continue
    }
    const llaves = /^\{([^}]*)\}$/.exec(clausula.trim())
    if (llaves?.[1] !== undefined) {
      const nombres = llaves[1]
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean)
      if (nombres.length > 0 && nombres.every((n) => /^type\s/.test(n))) {
        continue
      }
    }
    especificadores.push(especificador)
  }
  for (const m of texto.matchAll(/(?:^|\n)[ \t]*import\s*['"]([^'"]+)['"]/g)) {
    if (m[1] !== undefined) {
      especificadores.push(m[1])
    }
  }
  return especificadores
}

const dirDe = (ruta: string) => ruta.slice(0, ruta.lastIndexOf('/'))

// Un especificador a la ruta de su archivo (`@/…` es `src/…`, `./` y `../` son relativos); lo que no es nuestro (paquetes, `server-only`) no tiene ruta.
export function resolver(desde: string, especificador: string, leer: Lector): string | undefined {
  let base: string
  if (especificador.startsWith('@/')) {
    base = `src/${especificador.slice(2)}`
  } else if (especificador.startsWith('.')) {
    const partes = dirDe(desde).split('/')
    for (const parte of especificador.split('/')) {
      if (parte === '..') {
        partes.pop()
      } else if (parte !== '.') {
        partes.push(parte)
      }
    }
    base = partes.join('/')
  } else {
    return undefined
  }
  return [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`].find(
    (candidato) => /\.(ts|tsx)$/.test(candidato) && leer(candidato) !== undefined,
  )
}

// Todo módulo `'use client'` que se alcanza desde `entrada`, cada uno con el camino de archivos que lleva hasta él.
export function clientesAlcanzados(
  entrada: string,
  leer: Lector,
): { archivo: string; camino: string[] }[] {
  const padre = new Map<string, string | undefined>([[entrada, undefined]])
  const pendientes = [entrada]
  const clientes: string[] = []
  while (pendientes.length > 0) {
    const actual = pendientes.shift()
    const texto = actual === undefined ? undefined : leer(actual)
    if (actual === undefined || texto === undefined) {
      continue
    }
    // Un módulo de cliente corta el recorrido: lo que importa viaja con él al navegador y es asunto del cliente.
    if (actual !== entrada && esDeCliente(texto)) {
      clientes.push(actual)
      continue
    }
    for (const especificador of importacionesDe(texto)) {
      const ruta = resolver(actual, especificador, leer)
      if (ruta !== undefined && !padre.has(ruta)) {
        padre.set(ruta, actual)
        pendientes.push(ruta)
      }
    }
  }
  return clientes.map((archivo) => {
    const camino: string[] = []
    for (let a: string | undefined = archivo; a !== undefined; a = padre.get(a)) {
      camino.unshift(a)
    }
    return { archivo, camino }
  })
}
