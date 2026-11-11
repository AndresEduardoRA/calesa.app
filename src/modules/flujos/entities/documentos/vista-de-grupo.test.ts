import { expect, it } from 'vitest'
import { usoDeTipoDesde, type TipoDeDocumento } from './tipo-de-documento'
import {
  MOTIVO_DE_TIPO_NO_DISPONIBLE,
  MOTIVO_SOLO_LECTURA_DE_EMPRESA,
  motivoParaNoAbrirTipo,
  motivoParaNoEliminarPorUrl,
  type VistaDeGrupo,
  type VistasDeGrupos,
} from './vista-de-grupo'

const FLUJO = '5b0c7c1e-3f6e-4a0c-9a55-1d7a6c2e9f10'

function tipo(id: string, flujoId: string | null): TipoDeDocumento {
  return {
    id,
    flujoId,
    nombre: id,
    descripcion: null,
    formatos: ['application/pdf'],
    modo: 'ninguno',
    vigenciaDias: null,
    avisoDias: null,
    visiblePortal: false,
    activo: true,
    orden: 1,
    actualizadoEn: '2026-11-11T10:00:00.123456+00:00',
  }
}

function vista(
  flujoId: string | null,
  ids: string[],
  puedeCambiar: boolean,
  usados: string[] = [],
): VistaDeGrupo {
  return {
    grupo: { flujoId, tope: 3, tipos: ids.map((id) => tipo(id, flujoId)), hayMas: false },
    puedeCambiar,
    uso: puedeCambiar
      ? Object.fromEntries(ids.map((id) => [id, usoDeTipoDesde(usados.includes(id) ? 2 : 0, 0)]))
      : null,
  }
}

const vistas: VistasDeGrupos = {
  empresa: vista(null, ['bl', 'titulo'], false),
  flujo: vista(FLUJO, ['a', 'b', 'c'], true, ['b']),
}

it('quien sólo ve el grupo de la empresa no abre «Nuevo» ni «Editar» y lee el motivo', () => {
  expect(motivoParaNoAbrirTipo(vistas, 'nuevo', 'empresa', null)).toBe(
    MOTIVO_SOLO_LECTURA_DE_EMPRESA,
  )
  expect(motivoParaNoAbrirTipo(vistas, 'editar', null, 'bl')).toBe(MOTIVO_SOLO_LECTURA_DE_EMPRESA)
})

it('«Nuevo» no abre al tope del grupo, ni con un grupo que no existe; «Editar» no abre un tipo ausente', () => {
  expect(motivoParaNoAbrirTipo(vistas, 'nuevo', 'flujo', null)).toContain('Ya hay 3')
  expect(motivoParaNoAbrirTipo({ ...vistas, flujo: null }, 'nuevo', 'flujo', null)).not.toBeNull()
  expect(motivoParaNoAbrirTipo(vistas, 'nuevo', 'otro', null)).not.toBeNull()
  expect(motivoParaNoAbrirTipo(vistas, 'editar', null, 'no-esta')).toBe(
    MOTIVO_DE_TIPO_NO_DISPONIBLE,
  )
  expect(motivoParaNoAbrirTipo(vistas, 'editar', null, 'a')).toBeNull()
})

it('eliminar por URL: abre uno sin uso; con uso o de sólo lectura no abre y dice por qué', () => {
  expect(motivoParaNoEliminarPorUrl(vistas, 'a')).toBeNull()
  expect(motivoParaNoEliminarPorUrl(vistas, 'b')).toContain('Lo usan 2 documentos')
  expect(motivoParaNoEliminarPorUrl(vistas, 'bl')).toBe(MOTIVO_SOLO_LECTURA_DE_EMPRESA)
  expect(motivoParaNoEliminarPorUrl(vistas, 'x')).toBe(MOTIVO_DE_TIPO_NO_DISPONIBLE)
})
