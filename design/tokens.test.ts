import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { contraste, esHex, mezclar } from '@/shared/lib/color'

// El contraste de los pares de tokens que la interfaz pone uno sobre otro (auditoría AA, 9.12): texto ≥ 4,5:1,
// borde de control y foco ≥ 3:1 (WCAG 1.4.3 y 1.4.11), en claro y en oscuro. Lo que tiene alfa se compone sobre el
// fondo del par antes de medir. No mide `line` (divisor decorativo), los bordes de las celdas del cotizador (la celda
// se reconoce por la grilla y su relleno) ni las etiquetas (las vigila `etiqueta.test.ts`).

const TEXTO = 4.5
const NO_TEXTO = 3

const css = readFileSync(path.join(process.cwd(), 'design', 'tokens.css'), 'utf8')

function bloque(selector: string): string {
  const inicio = css.indexOf(`\n${selector} {\n`)
  expect(inicio, `falta el bloque ${selector}`).toBeGreaterThan(-1)
  return css.slice(inicio, css.indexOf('\n}', inicio))
}

function variables(texto: string): Map<string, string> {
  const salida = new Map<string, string>()
  for (const [, nombre, valor] of texto.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    if (nombre && valor) salida.set(nombre, valor.trim())
  }
  return salida
}

// El oscuro hereda del claro lo que no pisa (el primer `:root` y el primer `.dark`).
const claro = variables(bloque(':root'))
const TEMAS = {
  claro,
  oscuro: new Map([...claro, ...variables(bloque('.dark'))]),
} as const
type Tema = keyof typeof TEMAS

type Color = { hex: string; alfa: number }

function color(tema: Tema, nombre: string): Color {
  const crudo = TEMAS[tema].get(nombre) ?? TEMAS[tema].get(`color-${nombre}`)
  expect(crudo, `falta --color-${nombre} en ${tema}`).toBeDefined()
  const valor = crudo ?? ''
  const referencia = /^var\(--([a-z0-9-]+)\)$/.exec(valor)
  if (referencia?.[1]) return color(tema, referencia[1])
  if (esHex(valor)) return { hex: valor.toLowerCase(), alfa: 1 }
  const rgba = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(valor)
  expect(rgba, `--${nombre} no es hex, rgba ni var(): ${valor}`).not.toBeNull()
  const [r, g, b] = [rgba?.[1], rgba?.[2], rgba?.[3]].map((c) =>
    Number(c).toString(16).padStart(2, '0'),
  )
  return { hex: `#${r}${g}${b}`, alfa: Number(rgba?.[4]) }
}

// Un color con alfa se ve como su mezcla con lo que tiene debajo.
function sobre(arriba: Color, debajo: string): string {
  return arriba.alfa === 1 ? arriba.hex : mezclar(debajo, arriba.hex, arriba.alfa)
}

// El color del anillo de `--shadow-focus` (`0 0 0 <n>px <color>`).
function colorDelFoco(tema: Tema): Color {
  const sombra = TEMAS[tema].get('shadow-focus') ?? ''
  const referencia = /var\(--([a-z0-9-]+)\)\s*$/.exec(sombra)?.[1]
  expect(referencia, `--shadow-focus sin color por variable: ${sombra}`).toBeDefined()
  return color(tema, referencia ?? '')
}

type Par = { arriba: string; fondo: string; medir: (tema: Tema) => number; minimo: number }

const SUPERFICIES = ['paper', 'paper-soft', 'paper-dim', 'surface', 'surface-2', 'surface-3']
const TINTAS = ['ink', 'ink-soft', 'ink-faint', 'primario-ink']
const SEMANTICOS = ['peligro', 'positivo', 'aviso', 'info']

const opacos = (tema: Tema, fondo: string) => color(tema, fondo).hex

const pares: Par[] = [
  ...[...TINTAS, ...SEMANTICOS.map((s) => `${s}-ink`)].flatMap((tinta) =>
    SUPERFICIES.map((fondo) => ({
      arriba: tinta,
      fondo,
      minimo: TEXTO,
      medir: (tema: Tema) => contraste(color(tema, tinta).hex, opacos(tema, fondo)),
    })),
  ),
  // El texto semántico sobre su propio fondo suave (el aviso, la insignia), apoyado en la tarjeta o en la app.
  ...SEMANTICOS.flatMap((s) =>
    ['surface', 'paper'].map((base) => ({
      arriba: `${s}-ink`,
      fondo: `${s}-soft sobre ${base}`,
      minimo: TEXTO,
      medir: (tema: Tema) =>
        contraste(color(tema, `${s}-ink`).hex, sobre(color(tema, `${s}-soft`), opacos(tema, base))),
    })),
  ),
  ...['primario', 'primario-oscuro'].map((fondo) => ({
    arriba: 'sobre-primario',
    fondo,
    minimo: TEXTO,
    medir: (tema: Tema) => contraste(color(tema, 'sobre-primario').hex, opacos(tema, fondo)),
  })),
  // La tinta sobre las celdas del cotizador, que en oscuro son un velo sobre la tarjeta.
  ...['celda-input', 'celda-fijo', 'celda-atencion'].map((fondo) => ({
    arriba: 'ink',
    fondo: `${fondo} sobre surface`,
    minimo: TEXTO,
    medir: (tema: Tema) =>
      contraste(color(tema, 'ink').hex, sobre(color(tema, fondo), opacos(tema, 'surface'))),
  })),
  // El borde de un control (`--input` = `line-strong`) y el anillo de foco.
  ...['surface', 'surface-2', 'paper'].flatMap((fondo) => [
    {
      arriba: 'line-strong',
      fondo,
      minimo: NO_TEXTO,
      medir: (tema: Tema) => contraste(color(tema, 'line-strong').hex, opacos(tema, fondo)),
    },
    {
      arriba: 'shadow-focus',
      fondo,
      minimo: NO_TEXTO,
      medir: (tema: Tema) =>
        contraste(sobre(colorDelFoco(tema), opacos(tema, fondo)), opacos(tema, fondo)),
    },
  ]),
]

describe('el contraste de los tokens', () => {
  it('mide pares de verdad', () => {
    expect(pares.length).toBeGreaterThan(60)
    expect(contraste(color('claro', 'ink').hex, color('claro', 'surface').hex)).toBeGreaterThan(10)
  })

  for (const tema of Object.keys(TEMAS) as Tema[]) {
    for (const { arriba, fondo, medir, minimo } of pares) {
      it(`«${arriba}» sobre «${fondo}» en ${tema} llega a ${minimo}:1`, () => {
        expect(medir(tema)).toBeGreaterThanOrEqual(minimo)
      })
    }
  }
})
