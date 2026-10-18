import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { MODALES } from './modales-con-salida'

// Todo `<Modal>` está registrado en `modales-con-salida.ts`: o pregunta por su cuenta antes de descartar, o dice por qué no guarda
// nada tipeado. Es la guarda de `drawers-con-salida.test.ts` para los modales. Un modal nuevo con un campo que no usa
// `ModalDeFormulario` y no se registra, o que se registra y no pregunta, rompe esta prueba.

const RAIZ = process.cwd()

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

// El código sin los comentarios de línea ni los de bloque.
const sinComentarios = (texto: string) =>
  texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const leer = (archivo: string) => sinComentarios(readFileSync(join(RAIZ, archivo), 'utf8'))

// El componente, el contrato que ya lo cumple y `<Confirmar>` (su palabra clave no es un formulario con algo que perder).
const COMPONENTES = new Set([
  'src/shared/ui/modal.tsx',
  'src/shared/ui/modal-de-formulario.tsx',
  'src/shared/ui/confirmar.tsx',
])

const conModal = [...archivos(join(RAIZ, 'src'))]
  .map((ruta) => relative(RAIZ, ruta).replaceAll('\\', '/'))
  .filter((archivo) => !COMPONENTES.has(archivo))
  .filter((archivo) => /<Modal[\s>]/.test(leer(archivo)))
  .sort()

describe('los modales (Modal) con algo escrito preguntan antes de descartar', () => {
  it('todo <Modal> está registrado, y todo registrado sigue siendo un <Modal>', () => {
    expect(conModal).toEqual(Object.keys(MODALES).sort())
  })

  it('un modal que pregunta por su cuenta lo hace entero: useCierreConCambios, ConfirmarDescarte y bloqueado', () => {
    for (const [archivo, registro] of Object.entries(MODALES)) {
      if (!('propio' in registro)) {
        continue
      }
      const texto = leer(archivo)
      expect(texto, `${archivo}: falta useCierreConCambios()`).toContain('useCierreConCambios(')
      expect(texto, `${archivo}: falta <ConfirmarDescarte> en el pie`).toMatch(
        /<ConfirmarDescarte[\s>]/,
      )
      expect(texto, `${archivo}: falta bloquear el cierre mientras actúa`).toMatch(/bloqueado/)
    }
  })

  it('un modal sin formulario tiene su motivo y no dibuja un <form> (ni en lo local que usa)', () => {
    for (const [archivo, registro] of Object.entries(MODALES)) {
      if (!('sinFormulario' in registro)) {
        continue
      }
      expect(registro.sinFormulario.length, `${archivo}: falta el motivo`).toBeGreaterThan(20)
      for (const dibujado of [archivo, ...(registro.tambien ?? [])]) {
        expect(leer(dibujado), `${dibujado} tiene un <form>`).not.toMatch(/<form[\s>]/)
      }
    }
  })
})
