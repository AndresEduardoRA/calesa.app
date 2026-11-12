import { describe, expect, it } from 'vitest'
import { motivoParaNoEscribirCompras } from './acciones'

describe('por qué «Registrar compra» está apagado', () => {
  it('sin el permiso de editar costos, el motivo es el permiso (aunque el proyecto esté cerrado)', () => {
    const motivo = 'Necesitas el permiso de editar costos para registrar compras.'
    expect(motivoParaNoEscribirCompras({ puedeEditarCostos: false, cerrado: false })).toBe(motivo)
    expect(motivoParaNoEscribirCompras({ puedeEditarCostos: false, cerrado: true })).toBe(motivo)
  })

  it('con el permiso y el proyecto cerrado, el motivo es el cierre', () => {
    expect(motivoParaNoEscribirCompras({ puedeEditarCostos: true, cerrado: true })).toBe(
      'El proyecto está cerrado: reábrelo para registrar compras.',
    )
  })

  it('con el permiso y el proyecto abierto, se puede', () => {
    expect(motivoParaNoEscribirCompras({ puedeEditarCostos: true, cerrado: false })).toBeNull()
  })
})
