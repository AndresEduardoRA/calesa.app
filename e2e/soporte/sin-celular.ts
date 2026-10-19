// Un spec, o una prueba, que no corre en el celular (cierre 5a-fix-3).
//
// Por defecto todo corre en los dos proyectos, `escritorio` y `movil`: un spec nuevo no tiene que hacer nada. Salir
// del celular exige **marcarlo en el propio spec, con el motivo escrito**, y haber demostrado que el celular no le
// agrega nada (`node scripts/comparar-anchos.mjs`: los mismos pasos sobre los mismos elementos y todo el JS que el
// celular agrega, ejecutado por otra prueba que se queda; `.claude/rules/e2e.md`).
//
//   sinCelular('motivo');                                 // el archivo entero, al principio de una línea, una vez
//   test('título', sinCelularEn('motivo'), async () => {}) // una prueba
//
// Las dos llamadas no hacen nada al correr: las lee `playwright.config.ts` (el proyecto `movil` deja fuera los
// archivos marcados con `testIgnore` y las pruebas marcadas con `grepInvert`) y `scripts/guardas/sin-celular.test.ts`,
// que lista los marcados y falla si falta el motivo, si es corto, si no es un texto o si el spec pregunta por el ancho.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const ETIQUETA_SIN_CELULAR = '@sin-celular'
export const LARGO_MINIMO_DEL_MOTIVO = 40

// El archivo entero. No hace nada: lo lee `archivosSinCelular()`.
export function sinCelular(motivo: string): void {
  void motivo
}

// Una prueba: la opción de `test()`; el proyecto `movil` la deja fuera por su etiqueta.
export function sinCelularEn(motivo: string): {
  tag: string
  annotation: { type: string; description: string }
} {
  return {
    tag: ETIQUETA_SIN_CELULAR,
    annotation: { type: 'sin-celular', description: motivo },
  }
}

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

export type MarcasDeUnSpec = {
  // El motivo de `sinCelular(…)`, o null si el archivo no está marcado.
  motivoDelArchivo: string | null
  // Los motivos de cada `sinCelularEn(…)`.
  pruebas: string[]
  problemas: string[]
}

const LITERAL = String.raw`(['"\x60])((?:\\.|(?!\1)[^\\\n])*)\1`
const ARCHIVO_LITERAL = new RegExp(String.raw`^sinCelular\(\s*${LITERAL}\s*,?\s*\)`, 'gm')
const PRUEBA_LITERAL = new RegExp(String.raw`\bsinCelularEn\(\s*${LITERAL}\s*,?\s*\)`, 'g')

const sinComentarios = (texto: string) =>
  texto.replaceAll(/\/\*[\s\S]*?\*\//g, '').replaceAll(/^\s*\/\/.*$/gm, '')

function problemasDeMotivo(que: string, motivo: string): string[] {
  const problemas: string[] = []
  if (motivo.includes('${')) {
    problemas.push(`${que}: el motivo tiene que ser un texto fijo, no una plantilla con \${…}`)
  }
  if (motivo.trim().length < LARGO_MINIMO_DEL_MOTIVO) {
    problemas.push(
      `${que}: el motivo tiene ${String(motivo.trim().length)} caracteres y pide al menos ${String(LARGO_MINIMO_DEL_MOTIVO)}: di por qué el ancho no importa`,
    )
  }
  return problemas
}

function marcaDelArchivo(texto: string): { archivo: string | null; problemas: string[] } {
  const problemas: string[] = []
  const literales = [...texto.matchAll(ARCHIVO_LITERAL)]
  const llamadas = (texto.match(/\bsinCelular\(/g) ?? []).length
  if (llamadas > literales.length) {
    problemas.push(
      'sinCelular(…) va al principio de una línea (nivel superior) y con un texto entre comillas como motivo',
    )
  }
  if (literales.length > 1) {
    problemas.push('sinCelular(…) aparece más de una vez')
  }
  const archivo = literales[0]?.[2] ?? null
  if (archivo !== null) {
    problemas.push(...problemasDeMotivo('sinCelular', archivo))
  }
  return { archivo, problemas }
}

function contradicciones(texto: string, de: string): string[] {
  return PREGUNTAS_POR_EL_ANCHO.filter(([patron]) => patron.test(texto)).map(
    ([, nombre]) => `${de} usa ${nombre}: el celular sí le agrega algo`,
  )
}

function marcasDeLasPruebas(texto: string): { pruebas: string[]; problemas: string[] } {
  const problemas: string[] = []
  const literales = [...texto.matchAll(PRUEBA_LITERAL)]
  if ((texto.match(/\bsinCelularEn\(/g) ?? []).length > literales.length) {
    problemas.push('sinCelularEn(…) lleva un texto entre comillas como motivo')
  }
  for (const literal of literales) {
    problemas.push(...problemasDeMotivo('sinCelularEn', literal[2] ?? ''))
    // Su cuerpo: hasta el siguiente `test` al principio de una línea.
    const resto = texto.slice(literal.index)
    const fin = resto.slice(1).search(/^test(?:\.|\()/m)
    const cuerpo = fin === -1 ? resto : resto.slice(0, fin + 1)
    problemas.push(
      ...contradicciones(
        cuerpo,
        `una prueba marcada con sinCelularEn(«${(literal[2] ?? '').slice(0, 30)}…»)`,
      ),
    )
  }
  return { pruebas: literales.map((m) => m[2] ?? ''), problemas }
}

// Lo que el texto de un spec dice de sí mismo. Es puro: lo usan la config, la guarda y los tests.
export function marcasDe(textoDelSpec: string): MarcasDeUnSpec {
  const texto = sinComentarios(textoDelSpec)
  const delArchivo = marcaDelArchivo(texto)
  const delasPruebas = marcasDeLasPruebas(texto)
  return {
    motivoDelArchivo: delArchivo.archivo,
    pruebas: delasPruebas.pruebas,
    problemas: [
      ...delArchivo.problemas,
      ...(delArchivo.archivo === null
        ? []
        : contradicciones(texto, 'el spec está marcado sin celular y')),
      ...delasPruebas.problemas,
    ],
  }
}

export type SpecMarcado = { archivo: string } & MarcasDeUnSpec

// Los specs de una carpeta con lo que dice cada uno.
export function marcasDeLosSpecs(carpeta: string): SpecMarcado[] {
  return readdirSync(carpeta)
    .filter((nombre) => nombre.endsWith('.spec.ts'))
    .sort()
    .map((archivo) => ({ archivo, ...marcasDe(readFileSync(join(carpeta, archivo), 'utf8')) }))
}

// Los archivos que el proyecto `movil` deja fuera (`testIgnore`).
export function archivosSinCelular(carpeta: string): string[] {
  return marcasDeLosSpecs(carpeta)
    .filter((spec) => spec.motivoDelArchivo !== null)
    .map((spec) => `**/${spec.archivo}`)
}
