import { describe, expect, it } from 'vitest'
import { SECCIONES_DE_DATOS, seccionDeDatos, seccionesVisibles } from './secciones'

describe('seccionDeDatos', () => {
  it('abre «Exportar» sin sección, con una desconocida y con «Importar» mientras no esté', () => {
    expect(seccionDeDatos(undefined)).toBe('exportar')
    expect(seccionDeDatos('otra')).toBe('exportar')
    expect(seccionDeDatos('importar')).toBe('exportar')
    expect(seccionDeDatos('exportar')).toBe('exportar')
  })

  it('«Importar» queda declarada y apagada: hoy hay una sola sección visible', () => {
    expect(SECCIONES_DE_DATOS.map((s) => s.clave)).toEqual(['exportar', 'importar'])
    expect(seccionesVisibles().map((s) => s.clave)).toEqual(['exportar'])
  })
})
