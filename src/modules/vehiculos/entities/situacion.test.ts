import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  accionesDeSituacion,
  CONDICION_POR_DEFECTO,
  esquemaDeSituacion,
  etiquetaDeSituacion,
  pedidoParaResolver,
  puedeResolverLaSubasta,
  SITUACIONES,
  textoDelAvisoDeSituacion,
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

describe('textoDelAvisoDeSituacion', () => {
  const sin = { resolucion: null, fecha: null }

  it('sin resolver pregunta, con su fase o sin ella', () => {
    expect(textoDelAvisoDeSituacion({ situacion: 'sin_resolver', fase: 'Subasta', ...sin })).toBe(
      'La subasta terminó y sigue en «Subasta». ¿La ganamos?',
    )
    expect(textoDelAvisoDeSituacion({ situacion: 'sin_resolver', fase: null, ...sin })).toBe(
      'La subasta terminó y todavía no tiene fase. ¿La ganamos?',
    )
  })

  it('no ganada dice quién y cuándo; sin el nombre, sólo cuándo; sin nada, que no cuenta', () => {
    const resolucion = { resultado: 'no_ganada' as const, resueltaEn: '2026-11-14T12:00:00Z' }
    expect(
      textoDelAvisoDeSituacion({
        situacion: 'no_ganada',
        fase: 'Subasta',
        resolucion: { ...resolucion, nombre: 'Rosa Mamani' },
        fecha: '14 nov 2026',
      }),
    ).toBe(
      'No ganada · la marcó Rosa Mamani el 14 nov 2026. Ya no cuenta en logística ni en Inicio.',
    )
    expect(
      textoDelAvisoDeSituacion({
        situacion: 'no_ganada',
        fase: null,
        resolucion: { ...resolucion, nombre: null },
        fecha: '14 nov 2026',
      }),
    ).toBe('No ganada · se marcó el 14 nov 2026. Ya no cuenta en logística ni en Inicio.')
    expect(textoDelAvisoDeSituacion({ situacion: 'no_ganada', fase: null, ...sin })).toBe(
      'No ganada. Ya no cuenta en logística ni en Inicio.',
    )
  })

  it('en subasta o en su fase no hay aviso', () => {
    expect(
      textoDelAvisoDeSituacion({ situacion: 'en_subasta', fase: 'Subasta', ...sin }),
    ).toBeNull()
    expect(textoDelAvisoDeSituacion({ situacion: 'fase', fase: 'Comprado', ...sin })).toBeNull()
  })

  it('sin permiso, a quién pedirlo', () => {
    expect(pedidoParaResolver('Copart')).toBe(
      'Para resolverla hace falta poder mover de fase en «Copart»: pídeselo a quien administra los roles.',
    )
  })
})
