import { describe, expect, it } from 'vitest'
import { enTandas } from './tandas'

describe('enTandas', () => {
  it('devuelve los resultados en el orden de los elementos', async () => {
    const dobles = await enTandas([3, 1, 2], 2, async (numero) => {
      await new Promise((listo) => setTimeout(listo, numero))
      return numero * 2
    })
    expect(dobles).toEqual([6, 2, 4])
  })

  it('nunca corre más de las pedidas a la vez', async () => {
    let enCurso = 0
    let maximo = 0
    await enTandas([1, 2, 3, 4, 5, 6, 7], 3, async () => {
      enCurso += 1
      maximo = Math.max(maximo, enCurso)
      await new Promise((listo) => setTimeout(listo, 2))
      enCurso -= 1
    })
    expect(maximo).toBe(3)
  })

  it('sin elementos no hace nada', async () => {
    expect(await enTandas([], 3, () => Promise.resolve(1))).toEqual([])
  })
})
