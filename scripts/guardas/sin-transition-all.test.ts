import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// `transition-all` anima también `font-size`, el alto y el ancho. Con el texto al 200 % (la raíz cambia) un botón crece a medio
// camino: una captura o una medición tomada enseguida lo ve a 13 px, no a 26, y un cambio de estado dibuja el texto nuevo con el
// aspecto del viejo (cierre 2, defecto 8; cierre 3, hallazgo 4). Lo que tiene texto anima sólo lo que quiere (`transition` es colores,
// sombra, opacidad y transformaciones). Lo único que lo conservaría es lo que no tiene texto ni medidas que sigan a la raíz: hoy nada (el
// `<Switch>` lo tenía y mide en rem desde 5a-20: al 200 % su pista y su pulgar crecen, y animar el tamaño los dibujaría a medio camino).
const CON_MOTIVO: Record<string, string> = {}

const RAIZ = process.cwd()

// El código, sin los comentarios de línea (los de `badge.tsx` y esta guarda citan la clase).
const sinComentarios = (texto: string) =>
  texto
    .split('\n')
    .filter((linea) => !/^\s*(\/\/|\*|\{?\/\*)/.test(linea))
    .join('\n')

function* archivos(dir: string): Generator<string> {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, e.name)
    if (e.isDirectory()) {
      yield* archivos(ruta)
    } else if (/\.tsx$/.test(e.name) && !/\.(test|spec)\./.test(e.name)) {
      yield ruta
    }
  }
}

describe('las transiciones', () => {
  it('ningún componente usa transition-all, salvo los que figuran con su motivo', () => {
    const con = [...archivos(join(RAIZ, 'src'))]
      .map((ruta) => relative(RAIZ, ruta).replaceAll('\\', '/'))
      .filter((archivo) =>
        /(^|[\s"'`])transition-all(\s|["'`]|$)/.test(
          sinComentarios(readFileSync(join(RAIZ, archivo), 'utf8')),
        ),
      )
      .filter((archivo) => !(archivo in CON_MOTIVO))
    expect(con).toEqual([])
  })

  it('un archivo con motivo todavía lo necesita', () => {
    for (const archivo of Object.keys(CON_MOTIVO)) {
      expect(readFileSync(join(RAIZ, archivo), 'utf8'), archivo).toMatch(/transition-all/)
    }
  })
})
