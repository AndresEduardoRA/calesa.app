import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  diasParaLaPurga,
  envioDesde,
  errorDeEnvio,
  limpiezaPendienteDesde,
  faltanPorMostrar,
  loteDesde,
  lotesDesde,
  motivoParaNoEnviar,
  palabraDePurga,
  permisoDePapelera,
  puedeAbrirLaPapelera,
  puedePurgar,
  purgaDesde,
  restauracionDesde,
  resumenDeEnvio,
  resumenDePurga,
  resumenDeRestauracion,
  textoDePurga,
  type ResultadoDeEnvio,
} from './papelera'

const ID = (n: number) => `00000000-0000-0000-0000-00000000000${String(n)}`

const envio = (cambios: Partial<ResultadoDeEnvio>): ResultadoDeEnvio => ({
  lote: ID(9),
  actualizadoEn: '2026-10-13T12:00:00+00:00',
  enviados: [],
  rechazados: [],
  ...cambios,
})

describe('lotesDesde', () => {
  it('lee los lotes con sus vehículos', () => {
    const [lote] = lotesDesde([
      {
        id: ID(9),
        actualizado_en: '2026-10-13T12:00:00.5+00:00',
        creado_en: '2026-10-13T12:00:00+00:00',
        creado_por_nombre: 'Rosa Mamani',
        es_mio: false,
        es_limpieza: true,
        purga_el: '2026-11-12T12:00:00+00:00',
        enviados: 2,
        en_papelera: 1,
        vehiculos: [
          {
            id: ID(1),
            numero: 7,
            titulo: 'Kia Morning',
            origen_id: ID(5),
            miniatura: null,
            fotos: 3,
            motivo_de_bloqueo: 'Tiene pagos o gastos registrados.',
          },
        ],
      },
    ])
    expect(lote).toMatchObject({
      actualizadoEn: '2026-10-13T12:00:00.5+00:00',
      creadoPorNombre: 'Rosa Mamani',
      esLimpieza: true,
      enviados: 2,
      enPapelera: 1,
      vehiculos: [{ numero: 7, fotos: 3, motivoDeBloqueo: 'Tiene pagos o gastos registrados.' }],
    })
  })
})

describe('las respuestas de enviar, restaurar y purgar', () => {
  it('se leen tal como las da la base', () => {
    expect(
      envioDesde({
        lote: null,
        actualizado_en: null,
        enviados: [],
        rechazados: [{ id: ID(1), titulo: null, codigo: '42501', motivo: 'No tienes permiso.' }],
      }),
    ).toEqual(
      envio({
        lote: null,
        actualizadoEn: null,
        rechazados: [{ id: ID(1), titulo: null, codigo: '42501', motivo: 'No tienes permiso.' }],
      }),
    )
    expect(
      restauracionDesde({
        actualizado_en: 'v2',
        restaurados: [{ id: ID(1), numero: 1, titulo: 'A' }],
        pendientes: [],
        quedan: 0,
      }),
    ).toEqual({
      actualizadoEn: 'v2',
      restaurados: [{ id: ID(1), titulo: 'A' }],
      pendientes: [],
      quedan: 0,
    })
    expect(purgaDesde({ actualizado_en: 'v3', purgados: [], bloqueados: [], quedan: 2 })).toEqual({
      actualizadoEn: 'v3',
      purgados: [],
      bloqueados: [],
      quedan: 2,
    })
  })
})

describe('resumenDeEnvio', () => {
  it('uno solo se nombra, y dice si se quitó de la web', () => {
    const uno = envio({ enviados: [{ id: ID(1), titulo: 'Kia Morning', despublicado: false }] })
    expect(resumenDeEnvio(uno)).toBe('«Kia Morning» se envió a la papelera.')
    expect(
      resumenDeEnvio(
        envio({ enviados: [{ id: ID(1), titulo: 'Kia Morning', despublicado: true }] }),
      ),
    ).toBe('«Kia Morning» se envió a la papelera. Se quitó de la web.')
  })

  it('varios se cuentan', () => {
    const tres = envio({
      enviados: [1, 2, 3].map((n) => ({ id: ID(n), titulo: `V${String(n)}`, despublicado: n < 3 })),
    })
    expect(resumenDeEnvio(tres)).toBe('Se enviaron 3 a la papelera. Se quitaron 2 de la web.')
  })

  it('el resultado parcial se dice entero, con el motivo de cada uno', () => {
    const parcial = envio({
      enviados: [{ id: ID(1), titulo: 'A', despublicado: false }],
      rechazados: [
        {
          id: ID(2),
          titulo: 'B',
          codigo: '23514',
          motivo: 'Está vinculado a un lead. Quita el vínculo antes.',
        },
        {
          id: ID(3),
          titulo: null,
          codigo: '42501',
          motivo: 'No tienes permiso para enviarlo a la papelera.',
        },
      ],
    })
    expect(resumenDeEnvio(parcial)).toBe(
      'Se envió 1 de 3 a la papelera. No se envió «B»: Está vinculado a un lead. Quita el vínculo antes. No se envió Uno que no ves: No tienes permiso para enviarlo a la papelera.',
    )
  })

  it('con muchos rechazos, resume el resto', () => {
    const rechazados = [1, 2, 3, 4, 5].map((n) => ({
      id: ID(n),
      titulo: `V${String(n)}`,
      codigo: '23514',
      motivo: 'Tiene un comprobante emitido.',
    }))
    expect(resumenDeEnvio(envio({ lote: null, rechazados }))).toBe(
      'No se envió ninguno. No se envió «V1»: Tiene un comprobante emitido. No se envió «V2»: Tiene un comprobante emitido. No se envió «V3»: Tiene un comprobante emitido. Y 2 más.',
    )
  })
})

describe('errorDeEnvio', () => {
  it('uno solo que otra persona cambió es un conflicto; lo demás, una regla', () => {
    const uno = (codigo: string) =>
      envio({ lote: null, rechazados: [{ id: ID(1), titulo: 'A', codigo, motivo: 'Motivo.' }] })
    expect(errorDeEnvio(uno('PT409'))).toEqual({
      codigo: 'conflicto',
      mensaje: 'No se envió «A»: Motivo.',
    })
    expect(errorDeEnvio(uno('42501')).codigo).toBe('sin_permiso')
    expect(errorDeEnvio(uno('23514')).codigo).toBe('regla')
  })
})

describe('resumenDeRestauracion y resumenDePurga', () => {
  it('lo que choca queda dicho', () => {
    expect(
      resumenDeRestauracion({
        actualizadoEn: 'v',
        restaurados: [
          { id: ID(1), titulo: 'A' },
          { id: ID(2), titulo: 'B' },
        ],
        pendientes: [{ id: ID(3), titulo: 'C', motivo: 'Ya hay un vehículo con el VIN X.' }],
        quedan: 1,
      }),
    ).toBe('Se restauraron 2 de 3. No se restauró «C»: Ya hay un vehículo con el VIN X.')
    expect(
      resumenDeRestauracion({
        actualizadoEn: 'v',
        restaurados: [{ id: ID(1), titulo: 'A' }],
        pendientes: [],
        quedan: 0,
      }),
    ).toBe('«A» volvió al inventario.')
  })

  it('la purga, igual', () => {
    expect(
      resumenDePurga({
        actualizadoEn: 'v',
        purgados: [{ id: ID(1), titulo: 'A' }],
        bloqueados: [],
        quedan: 0,
      }),
    ).toBe('«A» se purgó.')
    expect(
      resumenDePurga({
        actualizadoEn: 'v',
        purgados: [],
        bloqueados: [{ id: ID(1), titulo: 'A', motivo: 'Tiene pagos o gastos registrados.' }],
        quedan: 1,
      }),
    ).toBe('No se purgó «A»: Tiene pagos o gastos registrados.')
  })
})

describe('cuándo se purga', () => {
  const AHORA = '2026-10-13T12:00:00+00:00'

  it('cuenta días enteros hacia arriba', () => {
    expect(diasParaLaPurga('2026-11-12T12:00:00+00:00', AHORA)).toBe(30)
    expect(diasParaLaPurga('2026-10-14T11:00:00+00:00', AHORA)).toBe(1)
    expect(diasParaLaPurga('2026-10-13T11:00:00+00:00', AHORA)).toBe(0)
  })

  it('lo dice', () => {
    expect(textoDePurga(27)).toBe('Se purga en 27 días')
    expect(textoDePurga(1)).toBe('Se purga mañana')
    expect(textoDePurga(0)).toBe('Se purga en la próxima pasada')
  })

  it('la palabra de un lote lleva su tamaño', () => {
    expect(palabraDePurga(12)).toBe('purgar 12')
  })
})

describe('qué se sabe de antemano que no va', () => {
  it('lo vinculado y lo que salió de su fase inicial', () => {
    expect(motivoParaNoEnviar({ leadId: ID(1), faseId: null }, null)).toBe(
      'Está vinculado a un lead. Quita el vínculo antes.',
    )
    expect(
      motivoParaNoEnviar(
        { leadId: null, faseId: ID(2) },
        { nombre: 'En tránsito', esInicial: false },
      ),
    ).toBe('Está en «En tránsito». Sólo va a la papelera lo que sigue en su fase inicial.')
    expect(
      motivoParaNoEnviar(
        { leadId: null, faseId: ID(2) },
        { nombre: 'Disponible', esInicial: true },
      ),
    ).toBeNull()
    expect(motivoParaNoEnviar({ leadId: null, faseId: null }, null)).toBeNull()
  })

  it('sin el permiso la acción no existe; con un motivo, se ve apagada', () => {
    expect(permisoDePapelera(false, 'Motivo.')).toEqual({ estado: 'oculto' })
    expect(permisoDePapelera(true, 'Motivo.')).toEqual({
      estado: 'deshabilitado',
      motivo: 'Motivo.',
    })
    expect(permisoDePapelera(true, null)).toEqual({ estado: 'habilitado' })
  })
})

describe('quién abre la papelera', () => {
  const envia: Permisos = [{ clave: 'vehiculos.eliminar', origenId: ID(5), alcance: 'propios' }]
  const purga: Permisos = [{ clave: 'vehiculos.papelera.purgar', origenId: null, alcance: 'todos' }]

  it('quien envía en algún origen o quien puede vaciarla', () => {
    expect(puedeAbrirLaPapelera(envia)).toBe(true)
    expect(puedeAbrirLaPapelera(purga)).toBe(true)
    expect(puedeAbrirLaPapelera([])).toBe(false)
    expect(puedePurgar(envia)).toBe(false)
    expect(puedePurgar(purga)).toBe(true)
  })
})

describe('limpiezaPendienteDesde', () => {
  it('sólo avisa si hay algo esperando', () => {
    expect(limpiezaPendienteDesde(null)).toBeNull()
    expect(limpiezaPendienteDesde({ objetos: 0, desde: null })).toBeNull()
    expect(limpiezaPendienteDesde({ objetos: 4, desde: '2026-10-13T06:00:00+00:00' })).toEqual({
      objetos: 4,
      hayMas: false,
      desde: '2026-10-13T06:00:00+00:00',
    })
  })
  it('la cola se cuenta hasta 1.000: más es «hay más»', () => {
    expect(
      limpiezaPendienteDesde({ objetos: 1000, hay_mas: true, desde: '2026-10-13T06:00:00+00:00' }),
    ).toMatchObject({ objetos: 1000, hayMas: true })
  })
})

describe('loteDesde y faltanPorMostrar (cierre 1)', () => {
  it('un lote entero de la RPC, o null si ya no está o la forma vino rota', () => {
    expect(loteDesde(null)).toBeNull()
    expect(loteDesde({ id: 'no-es-un-lote' })).toBeNull()
  })

  it('cuántos del lote todavía no se ven', () => {
    const de = (n: number) => Array.from({ length: n }, () => ({})) as never
    expect(faltanPorMostrar({ enPapelera: 200, vehiculos: de(20) })).toBe(180)
    expect(faltanPorMostrar({ enPapelera: 12, vehiculos: de(12) })).toBe(0)
    expect(faltanPorMostrar({ enPapelera: 3, vehiculos: de(5) })).toBe(0)
  })
})
