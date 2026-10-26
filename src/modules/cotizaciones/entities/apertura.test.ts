import { describe, expect, it } from 'vitest'
import { fallo, ok } from '@/shared/lib/errores'
import { aperturaDe } from './apertura'
import { crudaDeLaHoja, hojaDePrueba, respuestaDePrueba } from './hoja-de-prueba.soporte'
import { hojaDesde } from './hoja'

const SIN_CALCULAR = fallo('regla', 'x')

describe('aperturaDe: qué se ve al abrir la hoja', () => {
  it('con la hoja y el primer cálculo, la hoja al día', () => {
    const a = aperturaDe(ok(hojaDePrueba()), ok(respuestaDePrueba()))
    expect(a.tipo).toBe('lista')
    expect(a.tipo === 'lista' && a.inicial.estado).toEqual({ tipo: 'al_dia' })
  })

  it('sólo el «sin permiso» de la hoja es sin permiso; otro error de la hoja sube (y no se calcula nada)', () => {
    expect(aperturaDe(fallo('sin_permiso', 'x'), null).tipo).toBe('sin_permiso')
    expect(aperturaDe(fallo('inesperado', 'x'), null).tipo).toBe('error')
  })

  it('una hoja lista sin cálculo (no se hizo) queda en «No se pudo recalcular», no con un total inventado', () => {
    const a = aperturaDe(ok(hojaDePrueba()), null)
    expect(a.tipo === 'lista' && a.inicial).toEqual({
      respuesta: null,
      estado: { tipo: 'fallo', recargar: false },
    })
  })

  it('un origen sin fórmula publicada es su propio estado, con si se puede configurar', () => {
    const sin = hojaDesde({
      estado: 'sin_publicar',
      origen: { id: '00000000-0000-0000-0000-000000000001', nombre: 'Oficina' },
      puede_configurar: true,
    })
    const a = aperturaDe(ok(sin!), null)
    expect(a.tipo === 'sin_publicar' && a.hoja.puedeConfigurar).toBe(true)
  })

  it('un primer cálculo que falla deja la hoja en «No se pudo recalcular», con Recargar si no se arregla reintentando', () => {
    const a = aperturaDe(ok(hojaDePrueba()), fallo('inesperado', 'x'))
    expect(a.tipo === 'lista' && a.inicial).toEqual({
      respuesta: null,
      estado: { tipo: 'fallo', recargar: false },
    })
    const b = aperturaDe(ok(hojaDePrueba()), fallo('regla', 'x'))
    expect(b.tipo === 'lista' && b.inicial.estado).toEqual({ tipo: 'fallo', recargar: true })
  })

  it('una variante sin elección por defecto no es un error: espera a que se elija', () => {
    const cruda = crudaDeLaHoja()
    const variante = cruda.secciones[0]?.items[0] as Record<string, unknown>
    delete variante['por_defecto']
    const a = aperturaDe(ok(hojaDesde(cruda)!), SIN_CALCULAR)
    expect(a.tipo === 'lista' && a.inicial.estado).toEqual({ tipo: 'sin_variante' })
  })
})
