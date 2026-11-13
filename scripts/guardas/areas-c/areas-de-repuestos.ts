// Lo puro de la guarda de las áreas de `repuestos` (`areas-de-repuestos.test.ts`; paso 8.08-2, copia adaptada de `../areas-de-logistica.ts`).
// La carpeta `areas-c/` es sólo dónde vive: la guarda es una más.
//
// El módulo se parte por ÁREA, como regla de arquitectura, para que cada área agregue archivos propios y no edite los compartidos: un área
// vive en `features/<área>/`, `entities/<área>/`, `infra/<área>/`, `areas/<área>/` (sus tres entradas) y `pantallas/<área>.ts`. Lo demás es el
// NÚCLEO (la unidad, el panel y sus huecos: la carpeta `nucleo` de cada capa). Un área importa lo suyo y el núcleo, nunca otra; el núcleo no importa
// ningún área; nadie de adentro importa las tres entradas de la raíz, que sólo reexportan (`export *`) el núcleo y cada área.
import { especificadoresDe } from '../areas-de-cotizaciones'

export const MODULO = 'src/modules/repuestos/'
export const AREAS_DE_REPUESTOS = [
  'proyectos',
  'items',
  'stock',
  'compras',
  'cotizador',
  'catalogos',
  'flujo',
] as const
export const ENTRADAS = ['index', 'client', 'composicion'] as const
export type Archivo = { ruta: string; texto: string }

// Las carpetas del núcleo. Una nueva es una decisión del módulo: se suma aquí o a las áreas.
const DEL_NUCLEO: Readonly<Record<string, readonly string[]>> = {
  features: ['nucleo'],
  entities: ['nucleo'],
  infra: ['nucleo'],
  areas: ['nucleo'],
}
type Dueno = { area: string } | { nucleo: true } | { raiz: string } | { sinDueno: string }

function duenoDe(rel: string): Dueno {
  const sinExt = rel.replace(/\.(tsx?|json)$/, '')
  if ((ENTRADAS as readonly string[]).includes(sinExt)) return { raiz: sinExt }
  const m = /^(features|entities|infra|areas)\/([^/]+)(\/|$)/.exec(rel)
  if (m?.[1] !== undefined && m[2] !== undefined && (m[3] === '/' || !m[2].includes('.'))) {
    if ((AREAS_DE_REPUESTOS as readonly string[]).includes(m[2])) return { area: m[2] }
    return (DEL_NUCLEO[m[1]] ?? []).includes(m[2])
      ? { nucleo: true }
      : { sinDueno: `${m[1]}/${m[2]}/` }
  }
  const pantalla = /^pantallas\/([^/]+?)(\.ts)?$/.exec(rel)?.[1]
  const deArea = AREAS_DE_REPUESTOS.find((a) => pantalla === a || pantalla?.startsWith(`${a}-`))
  return deArea === undefined ? { nucleo: true } : { area: deArea }
}

const nombre = (d: Dueno) =>
  'area' in d ? `el área ${d.area}` : 'raiz' in d ? `la entrada ${d.raiz}.ts` : 'el núcleo'

// Un especificador a su ruta relativa al módulo; `undefined` si cae afuera (otro módulo, `@/shared`, un paquete).
function destinoDe(desde: string, esp: string): string | undefined {
  let partes: string[]
  if (esp.startsWith('@/')) partes = `src/${esp.slice(2)}`.split('/')
  else if (esp.startsWith('.')) {
    partes = `${MODULO}${desde}`.split('/').slice(0, -1)
    for (const p of esp.split('/')) {
      if (p === '..') partes.pop()
      else if (p !== '.') partes.push(p)
    }
  } else return undefined
  const ruta = partes.join('/')
  if (ruta === MODULO.replace(/\/$/, '')) return 'index'
  return ruta.startsWith(MODULO) ? ruta.slice(MODULO.length) : undefined
}

const codigo = (t: string) =>
  t
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l !== '' && !l.startsWith('//'))

function importsQueCruzan(rels: readonly { rel: string; texto: string }[]): string[] {
  const p: string[] = []
  for (const { rel, texto } of rels) {
    const origen = duenoDe(rel)
    if (!/\.tsx?$/.test(rel) || 'raiz' in origen) continue
    for (const esp of especificadoresDe(texto)) {
      const destino = destinoDe(rel, esp)
      if (destino === undefined) continue
      const d = duenoDe(destino)
      const cruza = 'area' in d && (!('area' in origen) || origen.area !== d.area)
      if ('raiz' in d && !/\.test\.tsx?$/.test(rel)) {
        p.push(
          `${rel}: importa «${esp}», ${nombre(d)} de la raíz: adentro se importa el área o el núcleo`,
        )
      } else if (cruza) {
        p.push(
          `${rel}: ${nombre(origen)} importa «${esp}», de ${nombre(d)}: un área no importa otra, y el núcleo no importa ningún área`,
        )
      }
    }
  }
  return p
}

type Rel = { rel: string; texto: string }
const TODAS = ['nucleo', ...AREAS_DE_REPUESTOS]

function carpetasSinDueno(rels: readonly Rel[]): string[] {
  const carpetas = new Set<string>()
  for (const { rel } of rels) {
    const d = duenoDe(rel)
    if ('sinDueno' in d) carpetas.add(d.sinDueno)
  }
  return [...carpetas]
    .sort()
    .map((c) => `${c}: carpeta que no es de ningún área: súmala a las áreas o al núcleo`)
}

function entradasDeLaRaiz(rels: readonly Rel[]): string[] {
  const p: string[] = []
  for (const e of ENTRADAS) {
    const archivo = rels.find((a) => a.rel === `${e}.ts`)
    const esperado = TODAS.map((a) => `export * from './areas/${a}/${e}'`).join('\n')
    if (archivo === undefined) p.push(`${e}.ts: falta la entrada de la raíz`)
    else if (codigo(archivo.texto).join('\n') !== esperado) {
      p.push(
        `${e}.ts: sólo lleva comentarios y un \`export * from './areas/<área>/${e}'\` por el núcleo y cada área, en orden; lo nuevo va en areas/<su área>/${e}.ts`,
      )
    }
  }
  return p
}

function entradasDeCadaArea(rels: readonly Rel[]): string[] {
  const p: string[] = []
  for (const a of TODAS) {
    for (const e of ENTRADAS) {
      const rel = `areas/${a}/${e}.ts`
      const archivo = rels.find((x) => x.rel === rel)
      if (archivo === undefined) p.push(`${rel}: falta la entrada ${e} de ${a}`)
      else if (e === 'composicion' && codigo(archivo.texto)[0] !== "import 'server-only'") {
        p.push(`${rel}: una composición empieza con \`import 'server-only'\``)
      }
    }
  }
  return p
}

function lugaresDeLasAreas(rels: readonly Rel[]): string[] {
  const p: string[] = []
  for (const a of AREAS_DE_REPUESTOS) {
    for (const capa of ['features', 'entities', 'infra']) {
      if (!rels.some((x) => x.rel.startsWith(`${capa}/${a}/`))) {
        p.push(`${capa}/${a}/: falta el lugar del área ${a} (con un .gitkeep si está vacío)`)
      }
    }
    if (!rels.some((x) => x.rel === `pantallas/${a}.ts`)) {
      p.push(`pantallas/${a}.ts: falta la pantalla del área ${a}`)
    }
  }
  return p
}

/** Lo que rompe la partición por áreas. `archivos` son todos los del módulo (con su ruta desde la raíz del repo). */
export function problemasDeAreasDeRepuestos(archivos: readonly Archivo[]): string[] {
  const rels = archivos
    .filter((a) => a.ruta.startsWith(MODULO))
    .map((a) => ({ rel: a.ruta.slice(MODULO.length), texto: a.texto }))
  return [
    ...carpetasSinDueno(rels),
    ...importsQueCruzan(rels),
    ...entradasDeLaRaiz(rels),
    ...entradasDeCadaArea(rels),
    ...lugaresDeLasAreas(rels),
  ]
}
