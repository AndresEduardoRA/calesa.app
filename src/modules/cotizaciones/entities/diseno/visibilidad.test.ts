import { describe, expect, it } from 'vitest'
import { celda, disenoDe, formulaDePrueba, seccion } from './diseno-de-prueba.soporte'
import { visibilidadDelDiseno } from './visibilidad'

const TODOS = { ver: 'todos', editar: 'todos' }

describe('visibilidadDelDiseno (espejo de _compilar_visibilidad)', () => {
  it('T1 · el nivel propio de la celda gana a la sección; sin ninguno, todos', () => {
    const v = visibilidadDelDiseno(
      formulaDePrueba,
      disenoDe([
        seccion(
          'costos',
          [celda('a'), celda('b', { nivel_ver: 'aduana', nivel_editar: 'aduana' })],
          {
            nivel_ver: 'costos',
            nivel_editar: 'costos',
          },
        ),
        seccion('abierta', [celda('c')]),
      ]),
    )
    expect(v.get('a')).toEqual({ ver: 'costos', editar: 'costos' })
    expect(v.get('b')).toEqual({ ver: 'aduana', editar: 'aduana' })
    expect(v.get('c')).toEqual(TODOS)
  })

  it('T2 · el pct hereda el par del ítem; total y aparte son para todos; atajos y lo no dibujado no entran', () => {
    const v = visibilidadDelDiseno(
      formulaDePrueba,
      disenoDe([
        seccion('hoja', [
          celda('comision', {
            secundario: 'porcentaje',
            nivel_ver: 'costos',
            nivel_editar: 'costos',
          }),
          celda('total', { nivel_ver: 'costos' }),
          { tipo: 'atajos', nodo: 'a', columna: 'anio', filas: 3 },
        ]),
      ]),
    )
    expect(v.get('comision')).toEqual({ ver: 'costos', editar: 'costos' })
    expect(v.get('tasa')).toEqual({ ver: 'costos', editar: 'costos' })
    // El total dibujado con un nivel: ver es todos, y editar es el del ítem (la base lo copia así).
    expect(v.get('total')).toEqual({ ver: 'todos', editar: 'todos' })
    expect(v.has('a')).toBe(false)
    expect(v.has('libre')).toBe(false)
  })

  it('T2b · un total sin dibujar entra como {todos, null}', () => {
    const v = visibilidadDelDiseno(formulaDePrueba, disenoDe([seccion('hoja', [celda('a')])]))
    expect(v.get('total')).toEqual({ ver: 'todos', editar: null })
  })
})
