import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { conReglasDeCampo, esquemaClave, esquemaEtiqueta, esquemaGrupo } from './esquemas'

describe('esquemaClave', () => {
  const clave = esquemaClave(['nombre'], 'Ya es un dato fijo.')

  it('acepta una clave bien formada', () => {
    expect(clave.safeParse('signo_zodiacal').success).toBe(true)
  })

  it('rechaza mayúsculas, espacios y una que empieza con número', () => {
    expect(clave.safeParse('Signo').success).toBe(false)
    expect(clave.safeParse('signo zodiacal').success).toBe(false)
    expect(clave.safeParse('1signo').success).toBe(false)
  })

  it('rechaza una reservada con el motivo del módulo', () => {
    const resultado = clave.safeParse('nombre')
    expect(resultado.success).toBe(false)
    expect(resultado.error?.issues[0]?.message).toBe('Ya es un dato fijo.')
  })
})

describe('esquemaEtiqueta y esquemaGrupo', () => {
  it('la etiqueta pide al menos dos caracteres y recorta', () => {
    expect(esquemaEtiqueta.safeParse('A').success).toBe(false)
    expect(esquemaEtiqueta.parse('  Edad ')).toBe('Edad')
  })

  it('un grupo vacío es «sin grupo»', () => {
    expect(esquemaGrupo.parse('  ')).toBeNull()
    expect(esquemaGrupo.parse('Datos personales')).toBe('Datos personales')
  })
})

describe('conReglasDeCampo', () => {
  const esquema = conReglasDeCampo(
    z.object({
      tipo: z.enum(['texto', 'opcion']),
      opciones: z.array(z.object({ clave: z.string(), etiqueta: z.string() })),
      valorDefecto: z.union([z.string(), z.null()]),
    }),
  )
  const OPCIONES = [{ clave: 'a', etiqueta: 'A' }]

  it('un campo de opciones necesita al menos una', () => {
    expect(esquema.safeParse({ tipo: 'opcion', opciones: [], valorDefecto: null }).success).toBe(
      false,
    )
    expect(
      esquema.safeParse({ tipo: 'opcion', opciones: OPCIONES, valorDefecto: null }).success,
    ).toBe(true)
  })

  it('un campo sin opciones no las lleva', () => {
    expect(
      esquema.safeParse({ tipo: 'texto', opciones: OPCIONES, valorDefecto: null }).success,
    ).toBe(false)
  })

  it('el valor por defecto tiene que servir para el tipo', () => {
    expect(esquema.safeParse({ tipo: 'texto', opciones: [], valorDefecto: 'Gris' }).success).toBe(
      true,
    )
    expect(
      esquema.safeParse({ tipo: 'opcion', opciones: OPCIONES, valorDefecto: 'z' }).success,
    ).toBe(false)
    expect(
      esquema.safeParse({ tipo: 'opcion', opciones: OPCIONES, valorDefecto: 'a' }).success,
    ).toBe(true)
  })
})
