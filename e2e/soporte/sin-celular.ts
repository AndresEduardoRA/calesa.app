// Un spec, o una prueba, que no corre en el celular (cierre 5a-fix-3).
//
// Por defecto todo corre en los dos proyectos, `escritorio` y `movil`: un spec nuevo no tiene que hacer nada. Salir
// del celular exige **marcarlo en el propio spec, con el motivo escrito**, y haber demostrado que el celular no le
// agrega nada (`node scripts/comparar-anchos.mjs`: los mismos pasos sobre los mismos elementos y todo el JS que el
// celular agrega, ejecutado por otra prueba que se queda; `.claude/rules/e2e.md`).
//
// La marca es un comentario, para no tocar el código de la prueba ni su formato:
//
//   // @sin-celular-archivo: <motivo>      una línea suelta del nivel superior: todo el archivo
//   // @sin-celular: <motivo>              justo encima de un `test('título', …)` del nivel superior: esa prueba
//
// La leen `playwright.config.ts` (el proyecto `movil` deja fuera los archivos con `testIgnore` y las pruebas por su
// título con `grepInvert`) y `scripts/guardas/sin-celular.test.ts`, que lista lo marcado y falla si falta el motivo, si
// es corto, si la marca no está sobre un `test(` con un título fijo, o si el spec pregunta por el ancho o mide la
// disposición (el celular le agrega algo y la marca miente).
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const LARGO_MINIMO_DEL_MOTIVO = 40

// Lo que un spec que se queda fuera del celular no puede hacer: preguntar por el ancho o por el proyecto, ni medir la
// disposición. Si lo hace, el celular le agrega algo y la marca miente.
const PREGUNTAS_POR_EL_ANCHO: [RegExp, string][] = [
  [/\besMovil\b/, 'esMovil'],
  [/\bisMobile\b/, 'isMobile'],
  [/project\.name\s*[!=]==?/, 'una comparación con project.name'],
  [/setViewportSize/, 'setViewportSize'],
  [/fontSize\s*=\s*['"`]200\s*%/, 'el texto al 200 %'],
  [
    /\b(?:tactil|panelDeFiltros|cerrarPanelDeFiltros|grupoDelFiltro|verEtapa)\(/,
    'un ayudante con rama del celular',
  ],
  [
    /\b(?:sinScrollHorizontal|dentroDeLaPantalla|cabeEnLaPantalla|nadaSeSaleDelPanel|boundingBox)\(/,
    'una medición de la disposición',
  ],
]

const sinComentarios = (texto: string) =>
  texto.replaceAll(/\/\*[\s\S]*?\*\//g, '').replaceAll(/^\s*\/\/.*$/gm, '')

// Los ayudantes de `e2e/soporte` que miden la disposición o preguntan por el ancho: los que tocan una de estas primitivas y,
// transitivamente, los que llaman a uno de ellos (`avisoNoTapaElPie` mide cajas aunque el spec que lo llama no diga nada).
// El comparador de huellas no ve esas mediciones —no son pasos de un `Locator`—, así que un spec que las usa no puede salir.
const PRIMITIVAS_DE_ANCHO =
  /boundingBox|viewportSize|innerWidth|innerHeight|scrollWidth|clientWidth|offsetWidth|getBoundingClientRect|getComputedStyle|fontSize|esMovil|isMobile|matchMedia|measureText/
const DECLARACION = /^(?:export\s+)?(?:async\s+)?(?:function\s+(\w+)|const\s+(\w+)\s*=)/gm
// Copian el viewport a otro contexto; no lo miden.
const NO_MIDEN = new Set(['otraPersona'])
// Archivos de soporte que nombran las primitivas sin medir nada (este, y el que graba las huellas).
const NO_SE_LEEN = new Set(['sin-celular.ts', 'huella.ts'])

// Los cuerpos de las funciones y constantes de nivel superior de un texto, por nombre.
function cuerposDeLasDeclaraciones(
  texto: string,
  a: Map<string, string> = new Map(),
): Map<string, string> {
  const declaraciones = [...texto.matchAll(DECLARACION)]
  declaraciones.forEach((d, i) => {
    const nombre = d[1] ?? d[2] ?? ''
    const fin = declaraciones[i + 1]?.index ?? texto.length
    a.set(nombre, (a.get(nombre) ?? '') + texto.slice(d.index, fin))
  })
  return a
}

// Los que miden: los que tocan una primitiva y, transitivamente, los que llaman a uno de ellos.
function cerrarLosQueMiden(
  cuerpos: Map<string, string>,
  yaMiden: Iterable<string> = [],
): Set<string> {
  const miden = new Set(yaMiden)
  for (const [nombre, cuerpo] of cuerpos) {
    if (PRIMITIVAS_DE_ANCHO.test(cuerpo)) miden.add(nombre)
  }
  for (const nombre of NO_MIDEN) miden.delete(nombre)
  let cambio = true
  while (cambio) {
    cambio = false
    for (const [nombre, cuerpo] of cuerpos) {
      if (miden.has(nombre) || NO_MIDEN.has(nombre)) continue
      if ([...miden].some((otro) => new RegExp(String.raw`\b${otro}\(`).test(cuerpo))) {
        miden.add(nombre)
        cambio = true
      }
    }
  }
  return miden
}

export function ayudantesQueMiden(carpetaDeSoporte: string): string[] {
  const cuerpos = new Map<string, string>()
  for (const archivo of readdirSync(carpetaDeSoporte)) {
    if (!archivo.endsWith('.ts') || NO_SE_LEEN.has(archivo)) continue
    cuerposDeLasDeclaraciones(
      sinComentarios(readFileSync(join(carpetaDeSoporte, archivo), 'utf8')),
      cuerpos,
    )
  }
  return [...cerrarLosQueMiden(cuerpos)].sort()
}

export type PruebaMarcada = { titulo: string; motivo: string }

export type MarcasDeUnSpec = {
  // El motivo de `// @sin-celular-archivo:`, o null si el archivo no está marcado.
  motivoDelArchivo: string | null
  // Cada `// @sin-celular:` con el título de la prueba que marca.
  pruebas: PruebaMarcada[]
  problemas: string[]
}

const MARCA_DEL_ARCHIVO = /^\/\/ @sin-celular-archivo:(.*)$/gm
const MARCA_DE_UNA_PRUEBA = /^\/\/ @sin-celular:(.*)\n(.*)$/gm
// Un `test('título', …)` del nivel superior con el título entre comillas simples o dobles, sin escapes ni plantillas.
const PRUEBA_CON_TITULO = /^test\(\s*(['"])((?:(?!\1)[^\\\n])*)\1\s*,/
const GANCHOS =
  /^test\.(?:beforeAll|beforeEach|afterAll|afterEach|use)\([\s\S]*?^\}\)\s*$|^test\.use\(.*$/gm
const CUERPO_DE_UNA_PRUEBA = /^test\([\s\S]*?^\}\)\s*$/gm

function problemasDeMotivo(que: string, motivo: string): string[] {
  if (motivo.trim().length >= LARGO_MINIMO_DEL_MOTIVO) return []
  return [
    `${que}: el motivo tiene ${String(motivo.trim().length)} caracteres y pide al menos ${String(LARGO_MINIMO_DEL_MOTIVO)}: di por qué el ancho no importa`,
  ]
}

function contradicciones(texto: string, de: string, ayudantes: string[]): string[] {
  const deAyudantes: [RegExp, string][] =
    ayudantes.length === 0
      ? []
      : [
          [
            new RegExp(String.raw`\b(?:${ayudantes.join('|')})\(`),
            'un ayudante que mide el ancho o la disposición',
          ],
        ]
  return [...PREGUNTAS_POR_EL_ANCHO, ...deAyudantes]
    .filter(([patron]) => patron.test(texto))
    .map(([, nombre]) => `${de} usa ${nombre}: el celular sí le agrega algo`)
}

function marcaDelArchivo(texto: string): { motivo: string | null; problemas: string[] } {
  const marcas = [...texto.matchAll(MARCA_DEL_ARCHIVO)]
  const problemas: string[] = []
  if (marcas.length > 1) problemas.push('// @sin-celular-archivo: aparece más de una vez')
  const motivo = marcas[0]?.[1]?.trim() ?? null
  if (motivo !== null) problemas.push(...problemasDeMotivo('@sin-celular-archivo', motivo))
  if ((texto.match(/@sin-celular-archivo/g) ?? []).length > marcas.length) {
    problemas.push('// @sin-celular-archivo: va al principio de una línea, sola, con su motivo')
  }
  return { motivo, problemas }
}

// El cuerpo de la prueba cuyo `test(` abre en la línea `linea`: hasta el cierre `})` del nivel superior.
function cuerpoDe(lineas: string[], linea: number): string {
  const resto = lineas.slice(linea).join('\n')
  const cierre = /^\}\)\s*$/m.exec(resto)
  return sinComentarios(cierre ? resto.slice(0, cierre.index + 2) : resto)
}

function marcasDeLasPruebas(
  textoCompleto: string,
  textoSinComentarios: string,
  ayudantesDeSoporte: string[],
): { pruebas: PruebaMarcada[]; problemas: string[] } {
  const problemas: string[] = []
  const pruebas: PruebaMarcada[] = []
  // Las funciones del propio spec que miden o llaman a las que miden también cuentan como ayudantes.
  const locales = cuerposDeLasDeclaraciones(textoSinComentarios.replace(CUERPO_DE_UNA_PRUEBA, ''))
  const ayudantes = [...cerrarLosQueMiden(locales, ayudantesDeSoporte)]
  // Lo que el archivo hace para todas sus pruebas (un 200 % puesto en un `beforeEach` vale para cada una).
  const ganchos = (textoSinComentarios.match(GANCHOS) ?? []).join('\n')

  const lineas = textoCompleto.split('\n')
  const marcadas = [...textoCompleto.matchAll(MARCA_DE_UNA_PRUEBA)]
  for (const marca of marcadas) {
    const motivo = (marca[1] ?? '').trim()
    const siguiente = marca[2] ?? ''
    problemas.push(...problemasDeMotivo('@sin-celular', motivo))
    const titulo = PRUEBA_CON_TITULO.exec(siguiente)?.[2]
    if (titulo === undefined) {
      problemas.push(
        `// @sin-celular: tiene que ir justo encima de un test('título', …) del nivel superior, con el título entre comillas en esa línea, sin plantillas ni escapes (la línea de abajo dice «${siguiente.slice(0, 60)}»)`,
      )
      continue
    }
    pruebas.push({ titulo, motivo })
    const linea = textoCompleto.slice(0, marca.index).split('\n').length + 1
    problemas.push(
      ...contradicciones(
        `${cuerpoDe(lineas, linea - 1)}\n${ganchos}`,
        `la prueba «${titulo}», marcada con @sin-celular,`,
        ayudantes,
      ),
    )
  }
  if ((textoCompleto.match(/@sin-celular(?!-archivo)/g) ?? []).length > marcadas.length) {
    problemas.push(
      '// @sin-celular: va al principio de una línea, sola, justo encima de un test(…)',
    )
  }
  const repetidos = pruebas.map((p) => p.titulo).filter((t, i, todos) => todos.indexOf(t) !== i)
  for (const titulo of new Set(repetidos)) {
    problemas.push(`@sin-celular: «${titulo}» está marcada dos veces`)
  }
  return { pruebas, problemas }
}

// Lo que el texto de un spec dice de sí mismo. Es puro: lo usan la config, la guarda y los tests. `ayudantes` son los de
// `e2e/soporte` que miden el ancho (`ayudantesQueMiden`); sin ellos sólo se miran las preguntas directas.
export function marcasDe(textoDelSpec: string, ayudantes: string[] = []): MarcasDeUnSpec {
  const sin = sinComentarios(textoDelSpec)
  const delArchivo = marcaDelArchivo(textoDelSpec)
  const deLasPruebas = marcasDeLasPruebas(textoDelSpec, sin, ayudantes)
  return {
    motivoDelArchivo: delArchivo.motivo,
    pruebas: deLasPruebas.pruebas,
    problemas: [
      ...delArchivo.problemas,
      ...(delArchivo.motivo === null
        ? []
        : contradicciones(sin, 'el spec está marcado sin celular y', ayudantes)),
      ...deLasPruebas.problemas,
    ],
  }
}

export type SpecMarcado = { archivo: string } & MarcasDeUnSpec

// Los specs de una carpeta con lo que dice cada uno (los ayudantes que miden salen de `<carpeta>/soporte`).
export function marcasDeLosSpecs(carpeta: string): SpecMarcado[] {
  const ayudantes = ayudantesQueMiden(join(carpeta, 'soporte'))
  return readdirSync(carpeta)
    .filter((nombre) => nombre.endsWith('.spec.ts'))
    .sort()
    .map((archivo) => ({
      archivo,
      ...marcasDe(readFileSync(join(carpeta, archivo), 'utf8'), ayudantes),
    }))
}

// Los archivos que el proyecto `movil` deja fuera (`testIgnore`).
export function archivosSinCelular(carpeta: string): string[] {
  return marcasDeLosSpecs(carpeta)
    .filter((spec) => spec.motivoDelArchivo !== null)
    .map((spec) => `**/${spec.archivo}`)
}

const escapar = (texto: string) => texto.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)

// Las pruebas marcadas una por una (`grepInvert` del proyecto `movil`): Playwright compara contra un texto que lleva el
// proyecto, el archivo y el título, así que cada patrón es su archivo y su título, anclado al final.
export function patronesDePruebasSinCelular(carpeta: string): RegExp[] {
  return marcasDeLosSpecs(carpeta).flatMap((spec) =>
    spec.motivoDelArchivo !== null
      ? []
      : spec.pruebas.map(
          (prueba) =>
            new RegExp(String.raw`\b${escapar(spec.archivo)} (?:.* )?${escapar(prueba.titulo)}$`),
        ),
  )
}
