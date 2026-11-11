import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  flujoParaConfigurarDesde,
  flujosConfigurables,
  type FilasDeFlujo,
  type FlujoConfigurable,
} from './flujo'

const guid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const ORIGEN_A = guid(901)
const ORIGEN_B = guid(902)

function faseFila(n: number, extra: Record<string, unknown> = {}) {
  return {
    id: guid(n),
    nombre: `Fase ${String(n)}`,
    descripcion: null,
    color: '#465fff',
    icono: null,
    orden: n * 10,
    activa: true,
    es_inicial: false,
    es_final: false,
    es_logistica: true,
    demora_dias: null,
    alerta_cada_horas: 12,
    nota_obligatoria: false,
    permite_contenedor: false,
    permite_aduana: false,
    cuenta_llegada_repuestos: false,
    publica_web: false,
    visible_portal: true,
    alias_portal: 'En camino',
    descripcion_portal: null,
    ...extra,
  }
}

function filas(extra: Partial<FilasDeFlujo> = {}): FilasDeFlujo {
  return {
    encabezado: {
      id: guid(1),
      ambito: 'vehiculos',
      origen_id: ORIGEN_A,
      nombre: 'Subasta USA',
      activo: true,
      actualizado_en: '2026-11-10T14:03:22.123456+00:00',
    },
    reglas: [{ regla: 'logistica', activa: true }],
    fases: [faseFila(3), faseFila(1, { es_inicial: true }), faseFila(2)],
    transiciones: [
      {
        id: guid(51),
        de_fase_id: guid(1),
        a_fase_id: guid(2),
        accion: null,
        nota_obligatoria: true,
      },
    ],
    requisitos: [],
    rolesPorFase: [{ fase_id: guid(1), rol_id: guid(71) }],
    rolesPorTransicion: [{ transicion_id: guid(51), rol_id: guid(71) }],
    truncado: { fases: false, transiciones: false, requisitos: false, roles: false },
    ...extra,
  }
}

describe('flujoParaConfigurarDesde', () => {
  it('deja la versión como texto, las fases en orden y con todos sus atributos', () => {
    const flujo = flujoParaConfigurarDesde(filas())
    expect(flujo.version).toBe('2026-11-10T14:03:22.123456+00:00')
    expect(flujo.fases.map((f) => f.nombre)).toEqual(['Fase 1', 'Fase 2', 'Fase 3'])
    expect(flujo.fases[0]).toMatchObject({
      esInicial: true,
      esLogistica: true,
      alertaCadaHoras: 12,
      visiblePortal: true,
      aliasPortal: 'En camino',
      demoraDias: null,
    })
    expect(flujo.transiciones[0]).toEqual({
      id: guid(51),
      deFaseId: guid(1),
      aFaseId: guid(2),
      accion: null,
      notaObligatoria: true,
    })
    expect(flujo.rolesPorFase).toEqual([{ faseId: guid(1), rolId: guid(71) }])
  })

  it('lleva la bandera de truncado tal como la leyó la consulta', () => {
    const truncado = { fases: true, transiciones: false, requisitos: false, roles: true }
    expect(flujoParaConfigurarDesde(filas({ truncado })).truncado).toEqual(truncado)
  })

  it('rechaza una fila con un id que no es guid o un ámbito desconocido', () => {
    expect(() =>
      flujoParaConfigurarDesde(filas({ fases: [faseFila(1, { id: 'no-es-guid' })] })),
    ).toThrow()
    expect(() =>
      flujoParaConfigurarDesde(
        filas({ encabezado: { ...(filas().encabezado as object), ambito: 'otro' } }),
      ),
    ).toThrow()
  })
})

describe('flujosConfigurables', () => {
  const de = (
    n: number,
    ambito: 'vehiculos' | 'repuestos',
    origenId: string | null,
    activo = true,
  ): FlujoConfigurable => ({
    id: guid(n),
    ambito,
    origenId,
    nombre: `Flujo ${String(n)}`,
    activo,
  })
  const flujos = [
    de(1, 'vehiculos', ORIGEN_A),
    de(2, 'vehiculos', ORIGEN_B, false),
    de(3, 'repuestos', null),
  ]
  const concesion = (
    clave: 'flujos.configurar' | 'repuestos.configurar',
    origenId: string | null,
  ) => ({ clave, origenId, alcance: 'todos' }) as const

  const ids = (permisos: Permisos) => flujosConfigurables(flujos, permisos).map((f) => f.id)

  it('un asesor sin permisos no ve ninguno', () => {
    expect(ids([])).toEqual([])
  })

  it('flujos.configurar de otro origen no muestra el de éste', () => {
    expect(ids([concesion('flujos.configurar', ORIGEN_B)])).toEqual([guid(2)])
  })

  it('repuestos.configurar muestra sólo el de repuestos', () => {
    expect(ids([concesion('repuestos.configurar', null)])).toEqual([guid(3)])
  })

  it('una concesión sin origen vale para todos los orígenes, también los inactivos', () => {
    expect(ids([concesion('flujos.configurar', null)])).toEqual([guid(1), guid(2)])
  })

  it('con las dos claves ve todos', () => {
    expect(
      ids([concesion('flujos.configurar', null), concesion('repuestos.configurar', null)]),
    ).toEqual([guid(1), guid(2), guid(3)])
  })
})
