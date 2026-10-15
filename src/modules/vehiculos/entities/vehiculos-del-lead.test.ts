import { describe, expect, it } from 'vitest'
import {
  MOTIVO_DE_OTRO_LEAD,
  MOTIVO_SIN_EDICION,
  MOTIVO_YA_VINCULADO,
  candidatosDesde,
  nombreConNumero,
  respuestaDeInteresDesde,
  respuestaDeVinculoDesde,
  rotuloDeVehiculo,
  textoDeInteres,
  textoDeVinculo,
  validarNota,
  vehiculosDelLeadDesde,
  vinculoPosible,
  type CandidatoDeVinculo,
} from './vehiculos-del-lead'

const ID = '11111111-1111-4111-8111-111111111111'
const fila = {
  id: ID,
  numero: 12,
  titulo: 'Toyota Corolla',
  actualizado_en: '2026-10-15T10:00:00.123456+00:00',
  origen_nombre: 'Oficina',
  portada: null,
  editable: true,
}

describe('vehiculosDelLeadDesde', () => {
  it('lee las tres listas y si puede actuar', () => {
    const leido = vehiculosDelLeadDesde({
      vinculados: [{ ...fila, desde: '2026-10-01T10:00:00+00:00' }],
      interesados: [
        {
          ...fila,
          nota: 'Lo quiere en rojo',
          marcado_en: '2026-10-02T10:00:00+00:00',
          vinculado_aqui: true,
        },
      ],
      historial: [
        {
          vehiculo_id: ID,
          titulo: 'Toyota Corolla',
          numero: 12,
          desde: '2026-09-01',
          hasta: '2026-09-10',
        },
      ],
      puedo_actuar: true,
    })
    expect(leido?.vinculados[0]).toMatchObject({
      id: ID,
      titulo: 'Toyota Corolla',
      actualizadoEn: fila.actualizado_en,
    })
    expect(leido?.interesados[0]).toMatchObject({ nota: 'Lo quiere en rojo', vinculadoAqui: true })
    expect(leido?.historial[0]).toMatchObject({ vehiculoId: ID, hasta: '2026-09-10' })
    expect(leido?.puedoActuar).toBe(true)
  })

  it('una forma rota es null, no «sin vehículos»', () => {
    expect(vehiculosDelLeadDesde({ vinculados: 'x' })).toBeNull()
    expect(vehiculosDelLeadDesde(null)).toBeNull()
  })
})

const candidato = (cambios: Partial<CandidatoDeVinculo> = {}): CandidatoDeVinculo => ({
  id: ID,
  numero: 12,
  titulo: 'Toyota Corolla',
  actualizadoEn: fila.actualizado_en,
  origenNombre: 'Oficina',
  portada: null,
  editable: true,
  vinculadoAqui: false,
  vinculadoAOtro: false,
  otroLead: null,
  reemplazable: false,
  interesado: false,
  ...cambios,
})

describe('candidatosDesde', () => {
  it('lee el estado de cada uno frente al lead', () => {
    const [uno] = candidatosDesde([
      {
        ...fila,
        vinculado_aqui: false,
        vinculado_a_otro: true,
        otro_lead: { nombre: 'Ana Rojas', numero: 7 },
        reemplazable: true,
        interesado: true,
      },
    ])
    expect(uno).toMatchObject({
      vinculadoAOtro: true,
      otroLead: { nombre: 'Ana Rojas' },
      reemplazable: true,
      interesado: true,
    })
  })

  it('lo que no cumple da una lista vacía', () => {
    expect(candidatosDesde([{ id: 'no' }])).toEqual([])
  })
})

describe('vinculoPosible', () => {
  it('libre y editable: se vincula', () => {
    expect(vinculoPosible(candidato())).toEqual({ tipo: 'vincular' })
  })

  it('ya vinculado a este lead, o sin poder editarlo: no, con el motivo', () => {
    expect(vinculoPosible(candidato({ vinculadoAqui: true }))).toEqual({
      tipo: 'no',
      motivo: MOTIVO_YA_VINCULADO,
    })
    expect(vinculoPosible(candidato({ editable: false }))).toEqual({
      tipo: 'no',
      motivo: MOTIVO_SIN_EDICION,
    })
  })

  it('de otro lead: se reemplaza sólo si también es de su cartera, y nombra al que lo pierde', () => {
    expect(
      vinculoPosible(
        candidato({
          vinculadoAOtro: true,
          reemplazable: true,
          otroLead: { nombre: 'Ana', numero: 7 },
        }),
      ),
    ).toEqual({ tipo: 'reemplazar', anterior: '«Ana» (#7)' })
    expect(
      vinculoPosible(candidato({ vinculadoAOtro: true, otroLead: { nombre: 'Ana', numero: 7 } })),
    ).toEqual({
      tipo: 'no',
      motivo: MOTIVO_DE_OTRO_LEAD,
    })
    // Uno que no ve no se nombra y no se reemplaza.
    expect(vinculoPosible(candidato({ vinculadoAOtro: true, reemplazable: true }))).toEqual({
      tipo: 'no',
      motivo: MOTIVO_DE_OTRO_LEAD,
    })
  })
})

describe('rótulos', () => {
  it('nombra un lead y un vehículo con su número', () => {
    expect(nombreConNumero({ nombre: 'Ana', numero: 7 })).toBe('«Ana» (#7)')
    expect(rotuloDeVehiculo({ titulo: 'Toyota Corolla', numero: 12 })).toBe('Toyota Corolla · #12')
  })
})

describe('validarNota', () => {
  it('recorta, vacía es nula y 501 no entra', () => {
    expect(validarNota('  Rojo  ')).toEqual({ ok: true, nota: 'Rojo' })
    expect(validarNota('   ')).toEqual({ ok: true, nota: null })
    expect(validarNota('x'.repeat(500))).toEqual({ ok: true, nota: 'x'.repeat(500) })
    expect(validarNota('x'.repeat(501))).toEqual({
      ok: false,
      motivo: 'La nota no puede pasar de 500 caracteres.',
    })
  })
})

describe('respuestas', () => {
  it('lee la del vínculo y la del interés', () => {
    expect(
      respuestaDeVinculoDesde({
        resultado: 'desvinculado',
        actualizado_en: 'v2',
        limpieza_el: '2026-10-18',
      }),
    ).toEqual({ resultado: 'desvinculado', actualizadoEn: 'v2', limpiezaEl: '2026-10-18' })
    expect(respuestaDeVinculoDesde({ resultado: 'otro' })).toBeNull()
    expect(respuestaDeInteresDesde({ resultado: 'quitado', nota: 'Rojo' })).toEqual({
      resultado: 'quitado',
      nota: 'Rojo',
    })
    expect(respuestaDeInteresDesde({})).toBeNull()
  })
})

describe('textos de cada resultado', () => {
  const auto = { titulo: 'Toyota Corolla', numero: 12 }
  const vinculo = (
    resultado: 'vinculado' | 'desvinculado' | 'reemplazado' | 'sin_cambios',
    limpiezaEl: string | null = null,
  ) => ({
    resultado,
    actualizadoEn: 'v',
    limpiezaEl,
  })

  it('el vínculo, entero', () => {
    expect(textoDeVinculo(vinculo('vinculado'), auto)).toBe(
      'Se vinculó «Toyota Corolla · #12» a este lead.',
    )
    expect(textoDeVinculo(vinculo('reemplazado'), auto, '«Ana» (#7)')).toBe(
      'Se vinculó «Toyota Corolla · #12» a este lead; ya no está vinculado a «Ana» (#7).',
    )
    expect(textoDeVinculo(vinculo('sin_cambios'), auto)).toBe(
      '«Toyota Corolla · #12» ya estaba así.',
    )
    expect(textoDeVinculo(vinculo('desvinculado'), auto)).toBe(
      'Se desvinculó «Toyota Corolla · #12».',
    )
  })

  it('desvincular avisa si la limpieza automática se lo llevaría', () => {
    expect(textoDeVinculo(vinculo('desvinculado', '2026-10-18'), auto)).toBe(
      'Se desvinculó «Toyota Corolla · #12». Como es de una subasta que nadie compró, la limpieza automática se lo llevará el 18/10 si nadie lo conserva.',
    )
  })

  it('el interés, entero', () => {
    expect(textoDeInteres({ resultado: 'marcado', nota: null }, auto)).toBe(
      'Se marcó el interés en «Toyota Corolla · #12».',
    )
    expect(textoDeInteres({ resultado: 'nota_cambiada', nota: 'x' }, auto)).toBe(
      'Se cambió la nota del interés en «Toyota Corolla · #12».',
    )
    expect(textoDeInteres({ resultado: 'quitado', nota: null }, auto)).toBe(
      'Se quitó el interés en «Toyota Corolla · #12».',
    )
    expect(textoDeInteres({ resultado: 'sin_cambios', nota: null }, auto)).toBe(
      'El interés en «Toyota Corolla · #12» ya estaba así.',
    )
  })
})
