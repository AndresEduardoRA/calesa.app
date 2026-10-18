import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  diasParaLaPurga,
  envioDesde,
  faltanPorMostrar,
  loteDesde,
  lotesDesde,
  motivoParaNoEnviar,
  palabraDePurga,
  puedeAbrirLaPapelera,
  puedeEnviarConAlcance,
  puedeEnviarLead,
  puedePurgarLeads,
  purgaDesde,
  restauracionDesde,
  resumenDeEnvio,
  resumenDePurga,
  resumenDeRestauracion,
  textoDePurga,
  motivoParaNoPurgar,
  MENSAJE_DE_LOTE_NO_DISPONIBLE,
  type LoteDePapelera,
} from './papelera'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const L = '33333333-3333-4333-8333-333333333333'

const permiso = (clave: string, alcance: 'propios' | 'todos'): Permisos[number] => ({
  clave: clave as Permisos[number]['clave'],
  origenId: null,
  alcance,
})

describe('lotesDesde', () => {
  it('lee los lotes con sus leads y los motivos', () => {
    const lotes = lotesDesde([
      {
        id: L,
        actualizado_en: '2026-10-15T10:00:00.123456+00:00',
        creado_en: '2026-10-15T09:00:00+00:00',
        creado_por_nombre: 'Rosa',
        es_mio: false,
        purga_el: '2026-11-14T09:00:00+00:00',
        enviados: 2,
        en_papelera: 2,
        leads: [
          {
            id: A,
            numero: 124,
            nombre: 'Ana',
            motivo_de_bloqueo: 'Tiene pagos registrados.',
            motivo_de_restaurar: null,
          },
          {
            id: B,
            numero: 125,
            nombre: 'Beto',
            motivo_de_bloqueo: null,
            motivo_de_restaurar: 'Ese teléfono ya lo tiene un lead sin dueño.',
          },
        ],
      },
    ])
    expect(lotes?.[0]).toMatchObject({
      id: L,
      actualizadoEn: '2026-10-15T10:00:00.123456+00:00',
      creadoPorNombre: 'Rosa',
      enviados: 2,
      enPapelera: 2,
    })
    expect(lotes?.[0]?.leads[0]?.motivoDeBloqueo).toBe('Tiene pagos registrados.')
    expect(lotes?.[0]?.leads[1]?.motivoDeRestaurar).toBe(
      'Ese teléfono ya lo tiene un lead sin dueño.',
    )
  })
  it('una papelera vacía es una lista vacía; una forma rota es null', () => {
    expect(lotesDesde([])).toEqual([])
    expect(lotesDesde({})).toBeNull()
  })
})

describe('las respuestas', () => {
  it('el envío trae el lote, su versión y el portal que cerró', () => {
    expect(
      envioDesde({
        lote: L,
        actualizado_en: 'v',
        repetido: false,
        portal_revocados: 1,
        enviados: [{ id: A, numero: 1, nombre: 'Ana' }],
      }),
    ).toMatchObject({ lote: L, portalRevocados: 1, repetido: false })
    expect(envioDesde({ lote: 'x' })).toBeNull()
  })
  it('restaurar y purgar traen lo hecho y lo que quedó, con su motivo', () => {
    expect(
      restauracionDesde({
        actualizado_en: 'v',
        restaurados: [],
        pendientes: [{ id: A, numero: 1, nombre: 'Ana', motivo: 'm' }],
        quedan: 1,
      })?.pendientes,
    ).toHaveLength(1)
    expect(
      purgaDesde({ actualizado_en: null, purgados: [], bloqueados: [], quedan: 0 })?.actualizadoEn,
    ).toBe('')
    expect(restauracionDesde(null)).toBeNull()
    expect(purgaDesde([])).toBeNull()
  })
})

describe('el resultado, dicho entero', () => {
  const ana = { id: A, numero: 1, nombre: 'Ana' }
  const beto = { id: B, numero: 2, nombre: 'Beto' }
  it('un envío de uno nombra al lead; varios se cuentan; el portal se dice', () => {
    const base = { lote: L, actualizadoEn: 'v', repetido: false, portalRevocados: 0 }
    expect(resumenDeEnvio({ ...base, enviados: [ana] })).toBe('«Ana» se envió a la papelera.')
    expect(resumenDeEnvio({ ...base, enviados: [ana, beto] })).toBe('Se enviaron 2 a la papelera.')
    expect(resumenDeEnvio({ ...base, enviados: [ana], portalRevocados: 1 })).toBe(
      '«Ana» se envió a la papelera. Se cerró su acceso al portal.',
    )
    expect(resumenDeEnvio({ ...base, enviados: [ana, beto], portalRevocados: 2 })).toContain(
      'Se cerraron 2 accesos al portal.',
    )
  })
  it('restaurar dice cuáles no volvieron y por qué', () => {
    const dicho = resumenDeRestauracion({
      actualizadoEn: 'v',
      restaurados: [ana],
      pendientes: [{ ...beto, motivo: 'Ese teléfono ya lo tiene un lead sin dueño.' }],
      quedan: 1,
    })
    expect(dicho).toBe(
      'Se restauró 1 de 2. No se restauró «Beto»: Ese teléfono ya lo tiene un lead sin dueño.',
    )
  })
  it('purgar resume y corta los motivos largos', () => {
    const muchos = [1, 2, 3, 4, 5].map((n) => ({
      id: A,
      numero: n,
      nombre: `L${String(n)}`,
      motivo: 'm',
    }))
    const dicho = resumenDePurga({
      actualizadoEn: 'v',
      purgados: [],
      bloqueados: muchos,
      quedan: 5,
    })
    expect(dicho).toContain('No se purgó ninguno.')
    expect(dicho).toContain('Y 2 más.')
  })
})

describe('cuándo se purga', () => {
  it('cuenta días enteros y no baja de cero', () => {
    expect(diasParaLaPurga('2026-10-18T00:00:00Z', '2026-10-15T12:00:00Z')).toBe(3)
    expect(diasParaLaPurga('2026-10-14T00:00:00Z', '2026-10-15T12:00:00Z')).toBe(0)
  })
  it('lo dice en palabras y ata la confirmación al tamaño', () => {
    expect(textoDePurga(0)).toBe('Se purga en la próxima pasada')
    expect(textoDePurga(1)).toBe('Se purga mañana')
    expect(textoDePurga(27)).toBe('Se purga en 27 días')
    expect(palabraDePurga(12)).toBe('purgar 12')
  })
})

describe('quién envía y quién abre', () => {
  const todos: Permisos = [permiso('leads.eliminar', 'todos')]
  const propios: Permisos = [permiso('leads.eliminar', 'propios')]
  it('«todos» envía cualquiera que ve; «propios», sólo si es el dueño', () => {
    expect(puedeEnviarLead(todos, B, A)).toBe(true)
    expect(puedeEnviarLead(propios, A, A)).toBe(true)
    expect(puedeEnviarLead(propios, B, A)).toBe(false)
    expect(puedeEnviarLead(propios, null, A)).toBe(false)
    expect(puedeEnviarLead([], A, A)).toBe(false)
    // Con el alcance ya resuelto (lo que recibe el kanban).
    expect(puedeEnviarConAlcance('todos', B, A)).toBe(true)
    expect(puedeEnviarConAlcance('propios', A, A)).toBe(true)
    expect(puedeEnviarConAlcance('propios', B, A)).toBe(false)
    expect(puedeEnviarConAlcance(null, A, A)).toBe(false)
  })
  it('la abre quien envía o quien purga; purga sólo quien tiene el permiso', () => {
    expect(puedeAbrirLaPapelera(propios)).toBe(true)
    expect(puedeAbrirLaPapelera([permiso('leads.papelera.purgar', 'todos')])).toBe(true)
    // Quien importa: el deshacer deja un lote suyo.
    expect(puedeAbrirLaPapelera([permiso('leads.crear', 'todos')])).toBe(true)
    expect(puedeAbrirLaPapelera([])).toBe(false)
    expect(puedePurgarLeads(propios)).toBe(false)
    expect(puedePurgarLeads([permiso('leads.papelera.purgar', 'todos')])).toBe(true)
  })
})

describe('motivoParaNoEnviar', () => {
  it('sin vinculados que se vean, nada; con uno o varios, lo dice', () => {
    expect(motivoParaNoEnviar(0)).toBeNull()
    expect(motivoParaNoEnviar(1)).toBe(
      'Tiene un vehículo vinculado: desvincúlalo en «Vehículos» antes de enviarlo.',
    )
    expect(motivoParaNoEnviar(2)).toBe(
      'Tiene 2 vehículos vinculados: desvincúlalos en «Vehículos» antes de enviarlo.',
    )
  })
})

describe('loteDesde y faltanPorMostrar (cierre 1)', () => {
  it('un lote entero de la RPC, o null si ya no está o la forma vino rota', () => {
    expect(loteDesde(null)).toBeNull()
    expect(loteDesde({ id: 'no-es-un-lote' })).toBeNull()
  })

  it('cuántos del lote todavía no se ven', () => {
    expect(
      faltanPorMostrar({ enPapelera: 200, leads: Array.from({ length: 20 }, () => ({})) as never }),
    ).toBe(180)
    expect(
      faltanPorMostrar({ enPapelera: 12, leads: Array.from({ length: 12 }, () => ({})) as never }),
    ).toBe(0)
    // Si mientras tanto se restauró algo, nunca da negativo.
    expect(
      faltanPorMostrar({ enPapelera: 3, leads: Array.from({ length: 5 }, () => ({})) as never }),
    ).toBe(0)
  })
})

describe('motivoParaNoPurgar', () => {
  const lead = (id: string) =>
    ({ id, nombre: id, numeros: {} }) as unknown as LoteDePapelera['leads'][number]
  const lote = (id: string, leads: string[]) =>
    ({ id, leads: leads.map(lead) }) as unknown as LoteDePapelera
  const lotes = [lote('l1', ['a', 'b']), lote('l2', ['c'])]

  it('abre un lote de la página, entero o con uno de sus leads', () => {
    expect(motivoParaNoPurgar(lotes, 'l1', null)).toBeNull()
    expect(motivoParaNoPurgar(lotes, 'l1', 'b')).toBeNull()
  })

  it('no abre un lote que no está en la página, o sin lote', () => {
    expect(motivoParaNoPurgar(lotes, 'zzz', null)).toBe(MENSAJE_DE_LOTE_NO_DISPONIBLE)
    expect(motivoParaNoPurgar(lotes, null, null)).toBe(MENSAJE_DE_LOTE_NO_DISPONIBLE)
  })

  it('no abre un lead que no es de ese lote', () => {
    expect(motivoParaNoPurgar(lotes, 'l1', 'c')).toBe('Ese lead ya no está en el lote.')
  })
})
