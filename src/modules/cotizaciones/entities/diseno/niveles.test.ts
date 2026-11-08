import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { esquemaDiseno } from '../diseno'
import { validarDiseno } from '../validar-diseno'
import { validarFormula } from '../validar'
import { celda, disenoDe, seccion } from './diseno-de-prueba.soporte'
import { ponerNiveles } from './niveles'

// La ruta va por una variable: Vite reescribe un `new URL('…', import.meta.url)` literal.
const leer = (ruta: string) => readFileSync(new URL(ruta, import.meta.url), 'utf8')

const base = disenoDe([
  seccion('s', [celda('a'), celda('b', { nivel_editar: 'todos' })]),
  seccion('t', [celda('c')]),
])

describe('ponerNiveles (ver y editar juntos)', () => {
  it('T5 · una sección a «costos» sin editar lleva también el editar; el explícito se respeta; «todos» se omite', () => {
    const r = ponerNiveles(base, { seccion: 's' }, { ver: 'costos' })
    expect(r.secciones[0]).toMatchObject({ nivel_ver: 'costos', nivel_editar: 'costos' })
    expect(base.secciones[0]).not.toHaveProperty('nivel_ver') // no muta el original

    const aparte = ponerNiveles(base, { seccion: 's' }, { ver: 'costos', editar: 'aduana' })
    expect(aparte.secciones[0]).toMatchObject({ nivel_ver: 'costos', nivel_editar: 'aduana' })

    const abierta = ponerNiveles(r, { seccion: 's' }, { ver: 'todos', editar: 'todos' })
    expect(abierta.secciones[0]).not.toHaveProperty('nivel_ver')
    expect(abierta.secciones[0]).not.toHaveProperty('nivel_editar')

    expect(ponerNiveles(base, { seccion: 'no_existe' }, { ver: 'costos' })).toEqual(base)
  })

  it('T6 · la celda que hereda el ver y declara editar «todos» queda alineada, y el diseño valida', () => {
    const r = ponerNiveles(base, { seccion: 's' }, { ver: 'costos' })
    const heredera = r.secciones[0]?.items[1]
    expect(heredera).toMatchObject({ nodo: 'b', nivel_editar: 'costos' })

    const celdaSola = ponerNiveles(base, { seccion: 't', nodo: 'c' }, { ver: 'costos' })
    expect(celdaSola.secciones[1]?.items[0]).toMatchObject({
      nivel_ver: 'costos',
      nivel_editar: 'costos',
    })

    // Sobre un diseño real del juego compartido con la base: ninguno de los cambios da `editar_sin_ver`.
    const juego = JSON.parse(leer('../casos-de-diseno.json')) as {
      contexto: { niveles: string[]; retirados: string[]; tonos: string[] }
      formulas: Record<string, { definicion: unknown; params: unknown }>
      casos: { nombre: string; diseno: unknown }[]
    }
    const f = juego.formulas['capturas']
    const caso = juego.casos.find((c) => c.nombre.startsWith('capturas:'))
    if (f === undefined || caso === undefined) throw new Error('falta el caso «capturas»')
    const formula = validarFormula(f.definicion, f.params)
    if (!formula.ok) throw new Error('la fórmula de «capturas» no valida')
    const diseno = esquemaDiseno.parse(caso.diseno)
    const cambiado = ponerNiveles(
      ponerNiveles(diseno, { seccion: 'aduana' }, { ver: 'costos' }),
      { seccion: 'logistica', nodo: 'grua' },
      { ver: 'costos' },
    )
    const r2 = validarDiseno(formula.formula.definicion, cambiado, juego.contexto)
    expect(r2.ok ? 'válida' : r2.error).not.toMatchObject({ regla: 'editar_sin_ver' })
    expect(r2.ok ? 'válida' : r2.error).toBe('válida')
  })
})
