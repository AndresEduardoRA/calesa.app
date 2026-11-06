// Lo puro de la guarda de las áreas de `cotizaciones` (`areas-de-cotizaciones.test.ts`; `docs/DECISIONES.md`, paso 4.15-4).
//
// El módulo se parte por ÁREA para que los carriles B y C (`docs/plan.yaml`) agreguen archivos propios y no editen los compartidos: un
// área vive en `features/<área>/`, `entities/<área>/`, `infra/<área>/`, `areas/<área>/` (sus tres entradas) y `pantallas/<área>.ts` (o
// `pantallas/<área>-<pantalla>.ts`). Lo demás es el NÚCLEO: lo que comparten las áreas (la hoja, guardar, encima, revisiones, el motor, el
// compilador…). Un área importa lo suyo y el núcleo, nunca otra área; el núcleo no importa ningún área; nadie de adentro importa las tres
// entradas de la raíz, que sólo reexportan (`export *`) cada área. La coherencia con `docs/plan.yaml`, en `areas-de-cotizaciones-plan.ts`.

export const MODULO = 'src/modules/cotizaciones/'

export const AREAS_DE_COTIZACIONES = [
  'listado',
  'tarjeta',
  'plantilla',
  'formula',
  'diseno',
  'tablas',
  'papelera',
  'final',
  'comprobantes',
  'comentarios',
] as const

// Las carpetas del núcleo que ya existían cuando se partió el módulo. Una nueva es una decisión del carril A: se suma aquí o a las áreas.
const CARPETAS_DEL_NUCLEO: Readonly<Record<string, readonly string[]>> = {
  features: ['encima', 'historial', 'hoja', 'niveles', 'revisiones'],
  entities: [],
  infra: ['queries'],
  areas: ['nucleo'],
}

export const ENTRADAS = ['index', 'client', 'composicion'] as const

export type Archivo = { ruta: string; texto: string }
export type Clase =
  | { tipo: 'area'; area: string }
  | { tipo: 'nucleo' }
  | { tipo: 'entrada'; nombre: string }
  | { tipo: 'sin-dueno'; carpeta: string }

const esArea = (x: string) => (AREAS_DE_COTIZACIONES as readonly string[]).includes(x)

// `features/x/…`, `entities/x/…`, `infra/x/…` o `areas/x/…` (también la carpeta sola, `entities/x`): de un área, del núcleo o sin dueño.
function claseDeCarpeta(rel: string): Clase | undefined {
  const m = /^(features|entities|infra|areas)\/([^/]+)(\/|$)/.exec(rel)
  const capa = m?.[1]
  const nombre = m?.[2]
  if (capa === undefined || nombre === undefined || (m?.[3] !== '/' && nombre.includes('.'))) {
    return undefined
  }
  if (esArea(nombre)) return { tipo: 'area', area: nombre }
  if ((CARPETAS_DEL_NUCLEO[capa] ?? []).includes(nombre)) return { tipo: 'nucleo' }
  return { tipo: 'sin-dueno', carpeta: `${capa}/${nombre}/` }
}

// `pantallas/x.ts` o `pantallas/x-<pantalla>.ts` de un área; las demás pantallas son del núcleo.
function areaDePantalla(rel: string): string | undefined {
  const nombre = /^pantallas\/([^/]+?)(\.ts)?$/.exec(rel)?.[1]
  if (nombre === undefined) return undefined
  return AREAS_DE_COTIZACIONES.find((a) => nombre === a || nombre.startsWith(`${a}-`))
}

/** La clase de una ruta relativa al módulo (`features/listado/x.tsx`, `entities/hoja.ts`, `index.ts`), con o sin extensión. */
export function claseDe(rel: string): Clase {
  const sinExtension = rel.replace(/\.(tsx?|json)$/, '')
  if ((ENTRADAS as readonly string[]).includes(sinExtension)) {
    return { tipo: 'entrada', nombre: sinExtension }
  }
  const deCarpeta = claseDeCarpeta(rel)
  if (deCarpeta !== undefined) return deCarpeta
  const area = areaDePantalla(rel)
  return area === undefined ? { tipo: 'nucleo' } : { tipo: 'area', area }
}

const sinComentarios = (texto: string) =>
  texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const capturas = (texto: string, patron: RegExp) =>
  [...texto.matchAll(patron)].map((m) => m[1]).filter((x): x is string => x !== undefined)

/** Todo lo que un archivo nombra de otro: `import`, `import type`, `export … from`, el import de efecto y el `import()` de un `diferido()`. */
export function especificadoresDe(texto: string): string[] {
  const codigo = sinComentarios(texto)
  return [
    ...capturas(codigo, /(?:^|\n)[ \t]*(?:import|export)\s+[^;'"]*?\s*from\s*['"]([^'"]+)['"]/g),
    ...capturas(codigo, /(?:^|\n)[ \t]*import\s*['"]([^'"]+)['"]/g),
    ...capturas(codigo, /\bimport\(\s*['"]([^'"]+)['"]\s*\)/g),
  ]
}

/** Un especificador a su ruta relativa al módulo, o `undefined` si cae fuera (otro módulo, `@/shared`, un paquete). */
export function destinoEnElModulo(desde: string, especificador: string): string | undefined {
  let partes: string[]
  if (especificador.startsWith('@/')) {
    partes = `src/${especificador.slice(2)}`.split('/')
  } else if (especificador.startsWith('.')) {
    partes = `${MODULO}${desde}`.split('/').slice(0, -1)
    for (const parte of especificador.split('/')) {
      if (parte === '..') partes.pop()
      else if (parte !== '.') partes.push(parte)
    }
  } else {
    return undefined
  }
  const ruta = partes.join('/')
  if (ruta === MODULO.replace(/\/$/, '')) return 'index'
  return ruta.startsWith(MODULO) ? ruta.slice(MODULO.length) : undefined
}

const nombreDe = (c: Clase) =>
  c.tipo === 'area'
    ? `el área ${c.area}`
    : c.tipo === 'entrada'
      ? `la entrada ${c.nombre}.ts`
      : 'el núcleo'

const esTestDeLaRaiz = (rel: string) => !rel.includes('/') && /\.test\.tsx?$/.test(rel)

type Relativo = { rel: string; texto: string }

// C6: ninguna carpeta sin dueño.
function carpetasSinDueno(rels: readonly Relativo[]): string[] {
  const carpetas = new Set<string>()
  for (const { rel } of rels) {
    const c = claseDe(rel)
    if (c.tipo === 'sin-dueno') carpetas.add(c.carpeta)
  }
  return [...carpetas]
    .sort()
    .map(
      (c) =>
        `${c}: carpeta que no es de ningún área: súmala a las áreas (y a docs/plan.yaml) o al núcleo`,
    )
}

// El archivo al que llega un destino, como lo resuelve TypeScript (`entities/diseno` es `entities/diseno.ts`, del núcleo, aunque exista la
// carpeta del área `entities/diseno/`); si no existe, el destino tal cual.
function resuelto(destino: string, existe: ReadonlySet<string>): string {
  const candidatos = [
    destino,
    `${destino}.ts`,
    `${destino}.tsx`,
    `${destino}/index.ts`,
    `${destino}/index.tsx`,
  ]
  return candidatos.find((c) => /\.(tsx?|json)$/.test(c) && existe.has(c)) ?? destino
}

// C2: lo que un import rompe, o `undefined`.
function problemaDelImport(
  rel: string,
  origen: Clase,
  especificador: string,
  existe: ReadonlySet<string>,
): string | undefined {
  const destino = destinoEnElModulo(rel, especificador)
  if (destino === undefined) return undefined
  const clase = claseDe(resuelto(destino, existe))
  if (clase.tipo === 'entrada') {
    return esTestDeLaRaiz(rel)
      ? undefined
      : `${rel}: importa «${especificador}», ${nombreDe(clase)} de la raíz: adentro se importa el área o el núcleo, nunca la raíz`
  }
  const deOtra = clase.tipo === 'area' && (origen.tipo !== 'area' || origen.area !== clase.area)
  return deOtra
    ? `${rel}: ${nombreDe(origen)} importa «${especificador}», de ${nombreDe(clase)}: un área no importa otra, y el núcleo no importa ningún área`
    : undefined
}

function importsQueCruzan(rels: readonly Relativo[]): string[] {
  const p: string[] = []
  const existe = new Set(rels.map((a) => a.rel))
  for (const { rel, texto } of rels) {
    const origen = claseDe(rel)
    if (!/\.tsx?$/.test(rel) || origen.tipo === 'entrada') continue
    for (const especificador of especificadoresDe(texto)) {
      const problema = problemaDelImport(rel, origen, especificador, existe)
      if (problema !== undefined) p.push(problema)
    }
  }
  return p
}

// Las líneas de código de un archivo, sin comentarios ni blancos.
const lineasDeCodigo = (texto: string) =>
  sinComentarios(texto)
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '')

// C4: las entradas de la raíz sólo reexportan el núcleo y cada área, en orden.
function entradasDeLaRaiz(rels: readonly Relativo[]): string[] {
  const p: string[] = []
  for (const entrada of ENTRADAS) {
    const archivo = rels.find((a) => a.rel === `${entrada}.ts`)
    const esperado = ['nucleo', ...AREAS_DE_COTIZACIONES].map(
      (a) => `export * from './areas/${a}/${entrada}'`,
    )
    if (archivo === undefined) {
      p.push(`${entrada}.ts: falta la entrada de la raíz`)
    } else if (lineasDeCodigo(archivo.texto).join('\n') !== esperado.join('\n')) {
      p.push(
        `${entrada}.ts: sólo lleva comentarios y una línea \`export * from './areas/<área>/${entrada}'\` por el núcleo y cada área, en orden; lo nuevo va en areas/<su área>/${entrada}.ts`,
      )
    }
  }
  return p
}

// C5: los cuatro lugares de cada área fuera de `areas/`.
function lugaresDeLasAreas(rels: readonly Relativo[]): string[] {
  const p: string[] = []
  for (const area of AREAS_DE_COTIZACIONES) {
    for (const lugar of [`features/${area}/`, `entities/${area}/`, `infra/${area}/`]) {
      if (!rels.some((a) => a.rel.startsWith(lugar))) {
        p.push(`${lugar}: falta el lugar del área ${area} (con un .gitkeep si está vacío)`)
      }
    }
    if (!rels.some((a) => a.rel === `pantallas/${area}.ts`)) {
      p.push(`pantallas/${area}.ts: falta la pantalla del área ${area}`)
    }
  }
  return p
}

// C3: las tres entradas del núcleo y de cada área; la composición, sólo de servidor.
function entradasDeCadaArea(rels: readonly Relativo[]): string[] {
  const p: string[] = []
  for (const area of ['nucleo', ...AREAS_DE_COTIZACIONES]) {
    for (const entrada of ENTRADAS) {
      const rel = `areas/${area}/${entrada}.ts`
      const archivo = rels.find((a) => a.rel === rel)
      if (archivo === undefined) {
        p.push(
          `${rel}: falta la entrada ${entrada} de ${area === 'nucleo' ? 'el núcleo' : `el área ${area}`}`,
        )
      } else if (
        entrada === 'composicion' &&
        lineasDeCodigo(archivo.texto)[0] !== "import 'server-only'"
      ) {
        p.push(`${rel}: una composición empieza con \`import 'server-only'\``)
      }
    }
  }
  return p
}

/** Lo que rompe la partición por áreas. `archivos` son todos los del módulo (los demás se ignoran), con su ruta desde la raíz del repo. */
export function problemasDeAreas(archivos: readonly Archivo[]): string[] {
  const rels = archivos
    .filter((a) => a.ruta.startsWith(MODULO))
    .map((a) => ({ rel: a.ruta.slice(MODULO.length), texto: a.texto }))
  return [
    ...carpetasSinDueno(rels),
    ...importsQueCruzan(rels),
    ...entradasDeLaRaiz(rels),
    ...lugaresDeLasAreas(rels),
    ...entradasDeCadaArea(rels),
  ]
}
