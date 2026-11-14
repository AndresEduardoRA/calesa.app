import { describe, expect, it } from 'vitest'
import type { FaseParaConfigurar, FlujoParaConfigurar, RequisitoParaConfigurar } from './flujo'
import {
  marcasDeLaFase,
  resumenDeRequisitos,
  rolesDeLaFase,
  salidasDeLaFase,
  textoDeLaDemora,
} from './lectura-de-fase'

const guid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const fase = (n: number, extra: Partial<FaseParaConfigurar> = {}): FaseParaConfigurar => ({
  id: guid(n),
  nombre: `Fase ${String(n)}`,
  descripcion: null,
  color: '#465fff',
  icono: null,
  orden: n,
  activa: true,
  esInicial: false,
  esFinal: false,
  esLogistica: true,
  demoraDias: null,
  alertaCadaHoras: null,
  notaObligatoria: false,
  permiteContenedor: false,
  permiteAduana: false,
  cuentaLlegadaRepuestos: false,
  publicaWeb: false,
  visiblePortal: false,
  aliasPortal: null,
  descripcionPortal: null,
  esSubasta: false,
  ...extra,
})

const requisito = (
  n: number,
  faseId: string,
  extra: Partial<RequisitoParaConfigurar> = {},
): RequisitoParaConfigurar => ({
  id: guid(500 + n),
  faseId,
  tipo: 'documento',
  bloqueante: true,
  orden: n,
  claveDato: null,
  config: null,
  esperaAmbito: null,
  esperaFaseId: null,
  formatos: null,
  maxArchivos: null,
  minArchivos: null,
  notas: null,
  tipoDocumentoId: null,
  ...extra,
})

const ROL_A = { id: guid(801), nombre: 'Logística', color: null }
const ROL_B = { id: guid(802), nombre: 'Compras', color: null }

function flujo(extra: Partial<FlujoParaConfigurar> = {}): FlujoParaConfigurar {
  return {
    id: guid(900),
    ambito: 'vehiculos',
    origenId: guid(901),
    nombre: 'Flujo',
    activo: true,
    version: '2026-11-11T00:00:00+00:00',
    origenEsSubasta: false,
    reglas: [],
    fases: [fase(1), fase(2), fase(3)],
    transiciones: [],
    rolesPorFase: [],
    rolesPorTransicion: [],
    requisitos: [],
    truncado: { fases: false, transiciones: false, requisitos: false, roles: false },
    ...extra,
  }
}

describe('marcasDeLaFase', () => {
  it('Inicial, Final y Jubilada, en ese orden', () => {
    expect(marcasDeLaFase(fase(1, { esInicial: true }))).toEqual(['Inicial'])
    expect(marcasDeLaFase(fase(1, { esFinal: true, activa: false }))).toEqual(['Final', 'Jubilada'])
    expect(marcasDeLaFase(fase(1))).toEqual([])
  })
})

describe('textoDeLaDemora', () => {
  it('nulo hereda la de la empresa, 0 la apaga, n la dice', () => {
    expect(textoDeLaDemora(null)).toBe('Usa la demora de la empresa')
    expect(textoDeLaDemora(0)).toBe('Sin alerta de demora')
    expect(textoDeLaDemora(1)).toBe('Alerta al día 1')
    expect(textoDeLaDemora(5)).toBe('Alerta a los 5 días')
  })
})

describe('salidasDeLaFase', () => {
  it('lista las transiciones que salen de la fase con su destino y sus roles', () => {
    const f = flujo({
      transiciones: [
        {
          id: guid(701),
          deFaseId: guid(1),
          aFaseId: guid(2),
          accion: 'Avanzar',
          notaObligatoria: false,
        },
        {
          id: guid(702),
          deFaseId: guid(1),
          aFaseId: guid(3),
          accion: null,
          notaObligatoria: false,
        },
        {
          id: guid(703),
          deFaseId: guid(2),
          aFaseId: guid(3),
          accion: null,
          notaObligatoria: false,
        },
      ],
      rolesPorTransicion: [
        { transicionId: guid(701), rolId: ROL_A.id },
        { transicionId: guid(701), rolId: guid(999) },
      ],
    })
    expect(salidasDeLaFase(f, guid(1), [ROL_A, ROL_B])).toEqual([
      { accion: 'Avanzar', destino: 'Fase 2', roles: ['Logística', 'otro rol'] },
      { accion: 'Mover', destino: 'Fase 3', roles: [] },
    ])
  })

  it('sin salidas da una lista vacía', () => {
    expect(salidasDeLaFase(flujo(), guid(1), [])).toEqual([])
  })

  it('una fase destino que no está leída se dice «otra fase»', () => {
    const f = flujo({
      transiciones: [
        {
          id: guid(701),
          deFaseId: guid(1),
          aFaseId: guid(77),
          accion: null,
          notaObligatoria: false,
        },
      ],
    })
    expect(salidasDeLaFase(f, guid(1), [])[0]?.destino).toBe('otra fase')
  })
})

describe('rolesDeLaFase', () => {
  it('nombra los roles que pueden mover hasta la fase; uno fuera de la lista es «otro rol»', () => {
    const f = flujo({
      rolesPorFase: [
        { faseId: guid(1), rolId: ROL_B.id },
        { faseId: guid(1), rolId: guid(999) },
        { faseId: guid(2), rolId: ROL_A.id },
      ],
    })
    expect(rolesDeLaFase(f, guid(1), [ROL_A, ROL_B])).toEqual(['Compras', 'otro rol'])
    expect(rolesDeLaFase(f, guid(3), [ROL_A, ROL_B])).toEqual([])
  })
})

describe('resumenDeRequisitos', () => {
  it('cuenta por tipo y dice cuántos bloquean', () => {
    const reqs = [
      requisito(1, guid(1), { tipo: 'documento', bloqueante: true }),
      requisito(2, guid(1), { tipo: 'dato', bloqueante: true }),
      requisito(3, guid(1), { tipo: 'dato', bloqueante: false }),
      requisito(4, guid(2), { tipo: 'espera', bloqueante: true }),
    ]
    expect(resumenDeRequisitos(reqs, guid(1))).toEqual([
      'Documentos: 1 (bloquea)',
      'Datos: 2 (1 bloquea)',
    ])
    expect(resumenDeRequisitos(reqs, guid(2))).toEqual(['Esperas: 1 (bloquea)'])
  })

  it('sin requisitos da una lista vacía', () => {
    expect(resumenDeRequisitos([], guid(1))).toEqual([])
  })

  it('ninguno bloquea no lo dice', () => {
    expect(resumenDeRequisitos([requisito(1, guid(1), { bloqueante: false })], guid(1))).toEqual([
      'Documentos: 1',
    ])
  })
})
