import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  accionesDeSituacion,
  CONDICION_POR_DEFECTO,
  esquemaDeSituacion,
  etiquetaDeSituacion,
  puedeResolverLaSubasta,
  SITUACIONES,
} from './situacion'

const ORIGEN = '00000000-0000-0000-0000-0000000000a1'
const OTRO = '00000000-0000-0000-0000-0000000000a2'

describe('etiquetaDeSituacion', () => {
  it('con fase, el nombre de su fase; sin fase, «Sin fase»; una jubilada se nombra igual', () => {
    expect(etiquetaDeSituacion('fase', { nombre: 'Comprado' })).toEqual({
      texto: 'Comprado',
      tono: 'fase',
    })
    expect(etiquetaDeSituacion('fase', null)).toEqual({ texto: 'Sin fase', tono: 'fase' })
    expect(etiquetaDeSituacion('fase', { nombre: 'Vieja (jubilada)' }).texto).toBe(
      'Vieja (jubilada)',
    )
  })

  it('las otras tres tapan la fase, con texto y no sólo color', () => {
    expect(etiquetaDeSituacion('en_subasta', { nombre: 'Subasta' })).toEqual({
      texto: 'En subasta',
      tono: 'info',
    })
    expect(etiquetaDeSituacion('sin_resolver', null)).toEqual({
      texto: 'Sin resolver',
      tono: 'aviso',
    })
    expect(etiquetaDeSituacion('no_ganada', { nombre: 'Subasta' })).toEqual({
      texto: 'No ganada',
      tono: 'apagado',
    })
  })

  it('una situación que la app no conoce se lee como su fase', () => {
    expect(esquemaDeSituacion.parse('perdida')).toBe('fase')
    expect(SITUACIONES.map((s) => esquemaDeSituacion.parse(s))).toEqual([...SITUACIONES])
  })
})

describe('puedeResolverLaSubasta', () => {
  const ver = { clave: 'logistica.ver', origenId: ORIGEN, alcance: 'todos' } as const

  it('con flujos.mover o .cualquiera y logistica.ver del origen', () => {
    const mover: Permisos = [{ clave: 'flujos.mover', origenId: ORIGEN, alcance: 'todos' }, ver]
    const cualquiera: Permisos = [
      { clave: 'flujos.mover.cualquiera', origenId: null, alcance: 'todos' },
      ver,
    ]
    expect(puedeResolverLaSubasta(mover, ORIGEN)).toBe(true)
    expect(puedeResolverLaSubasta(cualquiera, ORIGEN)).toBe(true)
  })

  it('sin logistica.ver no; sin mover no; en otro origen no', () => {
    expect(
      puedeResolverLaSubasta(
        [{ clave: 'flujos.mover', origenId: ORIGEN, alcance: 'todos' }],
        ORIGEN,
      ),
    ).toBe(false)
    expect(puedeResolverLaSubasta([ver], ORIGEN)).toBe(false)
    expect(
      puedeResolverLaSubasta(
        [{ clave: 'flujos.mover', origenId: OTRO, alcance: 'todos' }, ver],
        ORIGEN,
      ),
    ).toBe(false)
  })
})

describe('accionesDeSituacion', () => {
  it('sin resolver ofrece las dos; no ganada, deshacer; lo demás, nada', () => {
    expect(accionesDeSituacion({ situacion: 'sin_resolver', puede: true })).toEqual({
      laGanamos: true,
      noLaGanamos: true,
      deshacer: false,
    })
    expect(accionesDeSituacion({ situacion: 'no_ganada', puede: true })).toEqual({
      laGanamos: false,
      noLaGanamos: false,
      deshacer: true,
    })
    for (const situacion of ['en_subasta', 'fase'] as const) {
      expect(accionesDeSituacion({ situacion, puede: true })).toEqual({
        laGanamos: false,
        noLaGanamos: false,
        deshacer: false,
      })
    }
  })

  it('sin permiso, ningún botón', () => {
    for (const situacion of SITUACIONES) {
      expect(Object.values(accionesDeSituacion({ situacion, puede: false }))).toEqual([
        false,
        false,
        false,
      ])
    }
  })
})

describe('CONDICION_POR_DEFECTO', () => {
  it('deja fuera sólo las no ganadas', () => {
    expect(CONDICION_POR_DEFECTO).toEqual({ tipo: 'situacion_fuera_de', valores: ['no_ganada'] })
  })
})
