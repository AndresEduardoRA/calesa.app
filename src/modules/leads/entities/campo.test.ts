import { describe, expect, it } from 'vitest'
import {
  CLAVES_RESERVADAS_DE_LEAD,
  camposDeLeadDesde,
  claveDeCampoDeLead,
  soloCarteraPorTipo,
  valorDefectoVigente,
} from './campo'

function fila(n: number, extra: Record<string, unknown> = {}) {
  return {
    id: `00000000-0000-0000-0000-0000000000${String(n).padStart(2, '0')}`,
    clave: `campo_${String(n)}`,
    etiqueta: `Campo ${String(n)}`,
    tipo: 'texto',
    opciones: [],
    requerido: false,
    valor_defecto: null,
    valor_defecto_empresa: null,
    grupo: 'Datos personales',
    orden: n * 10,
    en_tabla: false,
    filtrable: false,
    solo_cartera: false,
    es_sistema: false,
    activo: true,
    actualizado_en: '2026-10-14T20:00:00+00:00',
    ...extra,
  }
}

describe('camposDeLeadDesde', () => {
  it('los deja en el orden del layout y trae lo propio de un lead', () => {
    const campos = camposDeLeadDesde([
      fila(3),
      fila(1, { solo_cartera: true, en_tabla: true }),
      fila(2),
    ])
    expect(campos.map((campo) => campo.clave)).toEqual(['campo_1', 'campo_2', 'campo_3'])
    expect(campos[0]).toMatchObject({ soloCartera: true, enTabla: true, filtrable: false })
  })

  it('unas opciones mal formadas no tumban la pantalla', () => {
    const [campo] = camposDeLeadDesde([fila(1, { opciones: 'no es una lista' })])
    expect(campo?.opciones).toEqual([])
  })

  it('trae el valor por defecto fijo o el de la empresa; uno mal formado es «sin valor»', () => {
    expect(camposDeLeadDesde([fila(1, { valor_defecto: 'Gris' })])[0]?.valorDefecto).toBe('Gris')
    expect(
      camposDeLeadDesde([fila(1, { valor_defecto_empresa: 'ciudad' })])[0]?.valorDefectoEmpresa,
    ).toBe('ciudad')
    expect(
      camposDeLeadDesde([fila(1, { valor_defecto: { raro: true } })])[0]?.valorDefecto,
    ).toBeNull()
  })

  it('rechaza un tipo que un lead no lleva (VIN, lote) o que la base no conoce', () => {
    expect(() => camposDeLeadDesde([fila(1, { tipo: 'vin' })])).toThrow()
    expect(() => camposDeLeadDesde([fila(1, { tipo: 'lote' })])).toThrow()
    expect(() => camposDeLeadDesde([fila(1, { tipo: 'mapa' })])).toThrow()
  })

  it('acepta el correo y el documento', () => {
    expect(camposDeLeadDesde([fila(1, { tipo: 'correo' })])[0]?.tipo).toBe('correo')
    expect(camposDeLeadDesde([fila(1, { tipo: 'documento' })])[0]?.tipo).toBe('documento')
  })
})

describe('claveDeCampoDeLead', () => {
  it('sale de la etiqueta', () => {
    expect(claveDeCampoDeLead('Signo zodiacal', [])).toBe('signo_zodiacal')
  })

  it('no choca con un dato fijo ni con otro campo', () => {
    expect(claveDeCampoDeLead('Nombre', [])).toBe('nombre_2')
    expect(claveDeCampoDeLead('Teléfono', [])).toBe('telefono_2')
    expect(claveDeCampoDeLead('Edad', ['edad'])).toBe('edad_2')
  })

  it('las reservadas son las de la base', () => {
    expect(CLAVES_RESERVADAS_DE_LEAD).toContain('telefono_principal')
    expect(CLAVES_RESERVADAS_DE_LEAD).toContain('atributos')
    expect(CLAVES_RESERVADAS_DE_LEAD).not.toContain('ciudad')
  })
})

describe('soloCarteraPorTipo', () => {
  it('el correo y el documento nacen privados; el resto, no', () => {
    expect(soloCarteraPorTipo('correo')).toBe(true)
    expect(soloCarteraPorTipo('documento')).toBe(true)
    expect(soloCarteraPorTipo('texto')).toBe(false)
    expect(soloCarteraPorTipo('numero')).toBe(false)
  })
})

describe('valorDefectoVigente', () => {
  const empresa = { ciudad: 'Santa Cruz', pais: 'Bolivia' }

  it('el fijo, si no pide el de la empresa', () => {
    expect(valorDefectoVigente({ valorDefecto: 'Gris', valorDefectoEmpresa: null }, empresa)).toBe(
      'Gris',
    )
  })

  it('el de la empresa, resuelto hoy', () => {
    expect(
      valorDefectoVigente({ valorDefecto: null, valorDefectoEmpresa: 'ciudad' }, empresa),
    ).toBe('Santa Cruz')
    expect(valorDefectoVigente({ valorDefecto: null, valorDefectoEmpresa: 'pais' }, empresa)).toBe(
      'Bolivia',
    )
  })

  it('sigue a la empresa si cambia de ciudad', () => {
    const campo = { valorDefecto: null, valorDefectoEmpresa: 'ciudad' } as const
    expect(valorDefectoVigente(campo, { ciudad: 'La Paz', pais: 'Bolivia' })).toBe('La Paz')
  })

  it('sin dato de la empresa, nada (no inventa)', () => {
    const campo = { valorDefecto: null, valorDefectoEmpresa: 'ciudad' } as const
    expect(valorDefectoVigente(campo, { ciudad: null, pais: 'Bolivia' })).toBeNull()
    expect(valorDefectoVigente(campo, { ciudad: '  ', pais: 'Bolivia' })).toBeNull()
  })
})
