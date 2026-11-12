import { beforeEach, describe, expect, it, vi } from 'vitest'
import { noLeidosStore } from './no-leidos-store'

describe('el contador de no leídos', () => {
  beforeEach(() => {
    noLeidosStore.reiniciar()
  })

  it('arranca en cero y avisa a cada suscriptor cuando cambia', () => {
    const a = vi.fn()
    const b = vi.fn()
    expect(noLeidosStore.leer()).toBe(0)
    noLeidosStore.suscribir(a)
    noLeidosStore.suscribir(b)
    noLeidosStore.poner(3)
    expect(noLeidosStore.leer()).toBe(3)
    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('ignora lo que no es un entero de 0 a 100 y conserva el último valor', () => {
    noLeidosStore.poner(4)
    const oyente = vi.fn()
    noLeidosStore.suscribir(oyente)
    for (const malo of [-1, 101, 2.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      noLeidosStore.poner(malo)
    }
    expect(noLeidosStore.leer()).toBe(4)
    expect(oyente).not.toHaveBeenCalled()
  })

  it('no avisa si el valor es el mismo y deja de avisar al desuscribir', () => {
    const oyente = vi.fn()
    const desuscribir = noLeidosStore.suscribir(oyente)
    noLeidosStore.poner(0)
    expect(oyente).not.toHaveBeenCalled()
    noLeidosStore.poner(2)
    desuscribir()
    noLeidosStore.poner(5)
    expect(oyente).toHaveBeenCalledTimes(1)
    expect(noLeidosStore.leer()).toBe(5)
  })
})
