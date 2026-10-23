import { describe, expect, it, vi } from 'vitest'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import type { Candidatos, FiltrosDeCandidatos } from '../../entities/candidatos'
import type { CondicionDeLead } from '../../entities/filtros'
import { contarPorCandidatos, type ContadorDeCandidatos } from './conteo-de-leads'

const ID = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
const privado: CondicionDeLead = {
  tipo: 'atributos_contienen',
  alternativas: [{ direccion: 'x' }],
  columna: 'atributos',
}
const ocultos: CondicionDeLead = { tipo: 'tachado', valor: true }
const condiciones = [privado, { tipo: 'en_cartera', desdeLaCartera: false } as const, ocultos]

const ventana = (ids: number[], completa: boolean): Candidatos => ({
  ids: ids.map(ID),
  completa,
  hasta: completa
    ? null
    : { creado_en: `2026-10-0${String(ids.length)}T00:00:00+00:00`, id: ID(ids.length) },
})

// Un lector de ventanas que devuelve las que se le dan, en orden, y anota lo que se le pidió.
function ventanas(...lista: Candidatos[]) {
  const pedidos: FiltrosDeCandidatos[] = []
  let i = 0
  const leerVentana = (filtros: FiltrosDeCandidatos): Promise<Resultado<Candidatos>> => {
    pedidos.push(filtros)
    const siguiente = lista[i] ?? ventana([], true)
    i += 1
    return Promise.resolve(ok(siguiente))
  }
  return { leerVentana, pedidos }
}

// Cuenta todos los ids de la ventana, o los que se le digan.
const contarTodos: ContadorDeCandidatos = (ids, _condiciones, limite) =>
  Promise.resolve(ok(Math.min(ids.length, limite)))

describe('contarPorCandidatos', () => {
  it('una ventana completa: cuenta lo que cumple la página y dice que no hay más', async () => {
    const { leerVentana, pedidos } = ventanas(ventana([1, 2, 3], true))
    const contar = vi.fn(contarTodos)
    const r = await contarPorCandidatos({
      condiciones,
      tope: 50,
      leerVentana,
      contarCandidatos: contar,
    })
    expect(r).toEqual(ok({ n: 3, hayMas: false }))
    // Pide la marca de quien cuenta y el privado a la base, y a la página le deja «míos» y la marca (los candidatos ya cumplen el campo).
    expect(pedidos[0]).toMatchObject({
      tachados: true,
      mios: true,
      privados: [[{ direccion: 'x' }]],
    })
    expect(contar.mock.calls[0]?.[1]).toEqual([
      { tipo: 'en_cartera', desdeLaCartera: false },
      ocultos,
    ])
  })

  it('sin candidatos no pregunta por la página', async () => {
    const { leerVentana } = ventanas(ventana([], true))
    const contar = vi.fn(contarTodos)
    expect(
      await contarPorCandidatos({ condiciones, tope: 50, leerVentana, contarCandidatos: contar }),
    ).toEqual(ok({ n: 0, hayMas: false }))
    expect(contar).not.toHaveBeenCalled()
  })

  it('sigue con la ventana que sigue desde `hasta` hasta pasar el tope, y dice «más de»', async () => {
    const { leerVentana, pedidos } = ventanas(
      ventana([1, 2, 3], false),
      ventana([4, 5, 6], false),
      ventana([7, 8, 9], true),
    )
    const r = await contarPorCandidatos({
      condiciones,
      tope: 5,
      leerVentana,
      contarCandidatos: contarTodos,
    })
    expect(r).toEqual(ok({ n: 5, hayMas: true }))
    expect(pedidos).toHaveLength(2)
    expect(pedidos[1]?.cursor).toEqual({ creado_en: '2026-10-03T00:00:00+00:00', id: ID(3) })
    expect(pedidos[1]?.sentido).toBe('siguiente')
  })

  it('pide a la página sólo los que faltan para tope + 1', async () => {
    const { leerVentana } = ventanas(ventana([1, 2, 3], false), ventana([4, 5, 6], false))
    const limites: number[] = []
    const contar: ContadorDeCandidatos = (ids, _c, limite) => {
      limites.push(limite)
      return Promise.resolve(ok(ids.length))
    }
    await contarPorCandidatos({ condiciones, tope: 4, leerVentana, contarCandidatos: contar })
    expect(limites).toEqual([5, 2])
  })
})

describe('contarPorCandidatos, los bordes', () => {
  it('lo que la página descarta no se cuenta: los candidatos pueden ser más que los que cumplen', async () => {
    const { leerVentana } = ventanas(ventana([1, 2, 3, 4], true))
    const soloLaMitad: ContadorDeCandidatos = (ids) => Promise.resolve(ok(ids.length / 2))
    expect(
      await contarPorCandidatos({
        condiciones,
        tope: 50,
        leerVentana,
        contarCandidatos: soloLaMitad,
      }),
    ).toEqual(ok({ n: 2, hayMas: false }))
  })

  it('un error de la base se devuelve tal cual: no es «cero»', async () => {
    const malo = (): Promise<Resultado<Candidatos>> => Promise.resolve(fallo('inesperado', 'x'))
    const r = await contarPorCandidatos({
      condiciones,
      tope: 50,
      leerVentana: malo,
      contarCandidatos: contarTodos,
    })
    expect(r?.ok).toBe(false)
    const { leerVentana } = ventanas(ventana([1], true))
    const falla: ContadorDeCandidatos = () => Promise.resolve(fallo('inesperado', 'x'))
    expect(
      (await contarPorCandidatos({ condiciones, tope: 50, leerVentana, contarCandidatos: falla }))
        ?.ok,
    ).toBe(false)
  })

  it('vuelve a la vista (nulo) si la base no dice dónde seguir o si las ventanas no alcanzan', async () => {
    const sinHasta: Candidatos = { ids: [ID(1)], completa: false, hasta: null }
    expect(
      await contarPorCandidatos({
        condiciones,
        tope: 50,
        leerVentana: ventanas(sinHasta).leerVentana,
        contarCandidatos: contarTodos,
      }),
    ).toBeNull()
    // Con tope 50 alcanzan 3 ventanas; ninguna junta lo bastante ni es la última.
    const largas = [1, 2, 3, 4].map((n) => ventana([n], false))
    expect(
      await contarPorCandidatos({
        condiciones,
        tope: 50,
        leerVentana: ventanas(...largas).leerVentana,
        contarCandidatos: contarTodos,
      }),
    ).toBeNull()
  })
})
