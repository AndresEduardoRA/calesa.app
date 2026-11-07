import { describe, expect, it } from 'vitest'
import { REGLAS_DE_PLANTILLA, rechazoDePlantilla } from './motivos-de-plantilla'

describe('REGLAS_DE_PLANTILLA', () => {
  it('va en el orden fijo de validar_plantilla(): el primer rechazo manda', () => {
    expect(REGLAS_DE_PLANTILLA).toEqual([
      'forma',
      'grupo_inexistente',
      'grupo_repetido',
      'grupo_faltante',
      'tono_inexistente',
      'nodo_inexistente',
      'nodo_sin_lugar',
      'nodo_restringido',
      'tipo_de_cambio_restringido',
    ])
  })
})

describe('rechazoDePlantilla', () => {
  // Los textos de los `format` de la base (20261106185900_plantilla_validar.sql), con el donde entre comillas latinas.
  it.each([
    ['forma', 'grupos[0]', 'La plantilla no tiene la forma esperada.'],
    ['grupo_inexistente', 'seguro', 'El grupo «seguro» no es de la fórmula.'],
    ['grupo_repetido', 'compra', 'El grupo «compra» está dos veces.'],
    [
      'grupo_faltante',
      'aduana',
      'Falta el grupo «aduana»: la tarjeta lleva todos los grupos de la fórmula.',
    ],
    ['tono_inexistente', 'compra', 'El grupo «compra» usa un tono que no está en el catálogo.'],
    ['nodo_inexistente', 'zz', 'La plantilla nombra «zz», que no es un nodo de la fórmula.'],
    [
      'nodo_sin_lugar',
      'cif',
      'El nodo «cif» no va en la tarjeta: no es de un grupo, el total ni lo aparte.',
    ],
    ['nodo_restringido', 'fees', 'La tarjeta no puede mostrar «fees»: no es del nivel «todos».'],
    [
      'tipo_de_cambio_restringido',
      'tc_adu',
      'La tarjeta no puede nombrar el tipo de cambio de «tc_adu»: no es del nivel «todos».',
    ],
  ] as const)('%s', (regla, donde, mensaje) => {
    expect(rechazoDePlantilla(regla, donde)).toEqual({ regla, donde, mensaje })
  })
})
