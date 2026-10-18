import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DRAWERS } from './drawers-con-salida'

// Todo `<Drawer>` está registrado en `drawers-con-salida.ts`: o con el archivo donde dice que tiene algo escrito, o con el motivo por el
// que no guarda nada tipeado. Es la guarda de `<Confirmar>` (`confirmar-con-url.test.ts`) para el panel que pregunta al salir desde un
// aviso. Un panel nuevo con formulario que no se registra, o que se registra y no llama a `useCambiosSinGuardar()`, rompe esta prueba.

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

// `shared/ui/drawer.tsx` es el componente y los envoltorios de la pregunta lo nombran sin dibujarlo.
const COMPONENTES = new Set([
  'src/shared/ui/drawer.tsx',
  'src/shared/ui/modal.tsx',
  'src/shared/ui/cambios-sin-guardar.tsx',
  'src/shared/ui/pie-con-salida.tsx',
  'src/shared/ui/pie-del-panel.tsx',
])

const conDrawer = [...archivos(join(RAIZ, 'src'))]
  .map((ruta) => relative(RAIZ, ruta).replaceAll('\\', '/'))
  .filter((archivo) => !COMPONENTES.has(archivo))
  .filter((archivo) => /<Drawer[\s>]/.test(leer(archivo)))
  .sort()

describe('los paneles (Drawer) preguntan al salir desde un aviso', () => {
  it('todo <Drawer> está registrado, y todo registrado sigue siendo un <Drawer>', () => {
    expect(conDrawer).toEqual(Object.keys(DRAWERS).sort())
  })

  it('un panel con formulario dice que tiene algo escrito, y lo hace con el mecanismo que registró', () => {
    for (const [archivo, registro] of Object.entries(DRAWERS)) {
      if ('sinFormulario' in registro) {
        continue
      }
      const texto = leer(registro.formulario)
      if (registro.mecanismo === 'contexto') {
        expect(texto, `${archivo}: falta useCambiosSinGuardar() o <CambiosSinGuardar>`).toMatch(
          /useCambiosSinGuardar\(|<CambiosSinGuardar[\s>]/,
        )
      } else {
        expect(texto, `${archivo}: falta useCierreConCambios()`).toContain('useCierreConCambios(')
        expect(texto, `${archivo}: falta pasar su salida al pie`).toMatch(/salida/)
      }
    }
  })

  it('un panel sin formulario no tiene un <form> ni escribe en él (si lo tiene, se registra con formulario)', () => {
    for (const [archivo, registro] of Object.entries(DRAWERS)) {
      if (!('sinFormulario' in registro)) {
        continue
      }
      expect(registro.sinFormulario.length, `${archivo}: falta el motivo`).toBeGreaterThan(20)
      expect(leer(archivo), `${archivo} tiene un <form>`).not.toMatch(/<form[\s>]/)
    }
  })

  it('el pie de un panel con botones propios lleva la pregunta: PieDelPanel, PieConSalida, la ranura del Drawer o, sin pie, `preguntaAlCerrar`', () => {
    // Un panel con `mecanismo: 'contexto'` con su pie dentro del cuerpo (sin la ranura `pie=`) y sin ninguno de los dos pies no
    // dibujaría la pregunta: el aviso se pulsaría y no pasaría nada.
    for (const [archivo, registro] of Object.entries(DRAWERS)) {
      if ('sinFormulario' in registro || registro.mecanismo !== 'contexto') {
        continue
      }
      const unidos = [archivo, registro.formulario].map(leer).join('\n')
      expect(unidos, `${archivo}: no dibuja la pregunta`).toMatch(
        /pie=\{|<PieDelPanel[\s>]|<PieConSalida[\s>]|<PieDelFormulario[\s>]|<PieDeCategoria[\s>]|preguntaAlCerrar/,
      )
    }
  })
})
