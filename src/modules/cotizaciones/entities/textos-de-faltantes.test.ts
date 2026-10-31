import { describe, expect, it } from 'vitest'
import { CODIGOS_DE_FALTANTE } from './motor-contexto'
import { SE_ELIGE_EN_EL_PANEL, textoDelFaltante } from './textos-de-faltantes'

describe('textoDelFaltante', () => {
  it('sólo el dato del vehículo sin valor o sin fila dice dónde se elige, y sólo si se elige', () => {
    for (const codigo of CODIGOS_DE_FALTANTE) {
      const seElige = codigo === 'campo_sin_valor' || codigo === 'fila_sin_coincidencia'
      expect(textoDelFaltante(codigo, true) === SE_ELIGE_EN_EL_PANEL).toBe(seElige)
      expect(textoDelFaltante(codigo)).not.toBe(SE_ELIGE_EN_EL_PANEL)
    }
  })
})
