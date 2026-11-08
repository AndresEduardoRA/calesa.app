import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { VistaPrevia } from '../../../../entities/formula/vista-previa'
import type { LecturaDelTerreno } from '../../hooks/use-terreno-de-prueba'
import { VistaPreviaDeLaFormula } from './vista-previa-de-la-formula'

afterEach(cleanup)

const calculada = (usd: number | null, bs: number | null): VistaPrevia => ({
  tipo: 'calculada',
  valores: new Map(),
  estados: new Map(),
  faltantes: new Map(),
  totales: { usd, bs, monedaBs: 'BOB' },
})
const LISTA: LecturaDelTerreno = {
  tipo: 'lista',
  terreno: { tipos_cambio: {}, monedas: {}, tablas: {}, avisos: [] },
}

const montar = (props: Partial<Parameters<typeof VistaPreviaDeLaFormula>[0]> = {}) =>
  render(
    <VistaPreviaDeLaFormula
      lectura={LISTA}
      vista={calculada(1800, 12600)}
      rechazo={null}
      nombreDelOrigen="Japón"
      alReintentar={vi.fn()}
      {...props}
    />,
  )

describe('VistaPreviaDeLaFormula (T7)', () => {
  it('siempre dice «Cifras de prueba.» y qué se supuso', () => {
    montar()
    const region = screen.getByRole('region', { name: 'Vista previa' })
    expect(region.textContent).toContain('Cifras de prueba.')
    expect(region.textContent).toContain('Los datos en 0, las opciones apagadas')
  })

  it('leyendo: el esqueleto, sin totales', () => {
    montar({ lectura: { tipo: 'leyendo' }, vista: null })
    expect(screen.getByLabelText('Cargando la lista')).toBeTruthy()
    expect(screen.queryByText('Total en dólares')).toBeNull()
  })

  it('error de lectura: el estado con «Reintentar»', () => {
    const alReintentar = vi.fn()
    montar({ lectura: { tipo: 'error' }, vista: null, alReintentar })
    expect(screen.getByText('No pudimos leer los tipos de cambio y las tablas.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(alReintentar).toHaveBeenCalledTimes(1)
  })

  it('no_valida: dice que espera una fórmula válida, con la fila o con lo de arriba', () => {
    montar({
      vista: { tipo: 'no_valida' },
      rechazo: { mensaje: 'x', filaId: 'total', grupoId: null },
    })
    expect(screen.getByText(/La vista previa espera una fórmula válida:/).textContent).toContain(
      'la fila marcada dice qué corregir.',
    )
    cleanup()
    montar({ vista: { tipo: 'no_valida' }, rechazo: { mensaje: 'x', filaId: null, grupoId: null } })
    expect(screen.getByText(/La vista previa espera/).textContent).toContain(
      'el aviso de arriba de la lista',
    )
    cleanup()
    montar({ vista: { tipo: 'no_valida' }, rechazo: { mensaje: 'x', filaId: null, grupoId: 'g' } })
    expect(screen.getByText(/La vista previa espera/).textContent).toContain(
      'la tarjeta del grupo dice qué corregir.',
    )
  })

  it('no_calcula: dice que revises la variante por defecto', () => {
    montar({ vista: { tipo: 'no_calcula' } })
    expect(screen.getByText(/No se pudo calcular con estas cifras/)).toBeTruthy()
  })

  it('calculada: «Total en dólares» y «Total en Bs» por <Monto>, en un status', () => {
    montar()
    const estado = screen.getByRole('status')
    expect(estado.textContent).toContain('Total en dólares')
    expect(estado.textContent).toContain('Total en Bs')
    expect(estado.querySelectorAll('[data-monto]')).toHaveLength(2)
    expect(estado.textContent).toMatch(/1\.800,00/)
    expect(estado.textContent).toMatch(/12\.600,00/)
  })

  it('un total null dice «Sin cifra: falta algo en las filas.»', () => {
    montar({ vista: calculada(null, null) })
    expect(screen.getAllByText('Sin cifra: falta algo en las filas.')).toHaveLength(2)
  })

  it('un aviso por caso, con el nombre del origen', () => {
    montar({
      lectura: {
        tipo: 'lista',
        terreno: {
          tipos_cambio: {},
          monedas: {},
          tablas: {},
          avisos: [
            { codigo: 'tabla_ausente', clave: 'dep' },
            { codigo: 'cambio_ausente', clave: 'oficial' },
          ],
        },
      },
    })
    expect(screen.getByText('No hay una tabla «dep» activa en Japón ni compartida.')).toBeTruthy()
    expect(screen.getByText('No hay un tipo de cambio activo «oficial».')).toBeTruthy()
  })
})
