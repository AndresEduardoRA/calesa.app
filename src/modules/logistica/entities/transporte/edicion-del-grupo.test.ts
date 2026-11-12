import { describe, expect, it } from 'vitest'
import {
  cambiosDelGrupo,
  esperadasDelGrupo,
  puedeEditarElGrupo,
  textoDelPieDelGrupo,
  textoDelRechazoDelGrupo,
  valoresComunes,
} from './edicion-del-grupo'
import type { UnidadDelGrupo } from './grupos'
import { VALORES_VACIOS_DE_TRANSPORTE } from './transporte'

const NAVIERA = '11111111-1111-4111-8111-111111111111'

function unidad(n: number, extra: Partial<UnidadDelGrupo> = {}): UnidadDelGrupo {
  return {
    transporteId: `00000000-0000-4000-8000-00000000000${n}`,
    vehiculoId: `00000000-0000-4000-9000-00000000000${n}`,
    repuestoId: null,
    titulo: `Unidad ${n}`,
    faseId: null,
    fase: null,
    navieraId: NAVIERA,
    puertoOrigenId: null,
    puertoDestinoId: null,
    contenedor: 'ECMU123456',
    booking: null,
    zarpeEl: '2026-12-01',
    etaEl: '2026-12-15',
    arriboEl: null,
    actualizadoEn: `2026-11-12T10:00:0${n}+00:00`,
    editable: true,
    ...extra,
  }
}

describe('valoresComunes', () => {
  it('lo igual en todas es común', () => {
    const c = valoresComunes([unidad(1), unidad(2)])
    expect(c.varios).toEqual([])
    expect(c.valores.naviera).toBe(NAVIERA)
    expect(c.valores.contenedor).toBe('ECMU123456')
    expect(c.valores.eta).toBe('2026-12-15')
  })

  it('dos ETA distintas son «Varios» y quedan vacías', () => {
    const c = valoresComunes([unidad(1), unidad(2, { etaEl: '2026-12-20' })])
    expect(c.varios).toEqual(['eta'])
    expect(c.valores.eta).toBe('')
    expect(c.valores.zarpe).toBe('2026-12-01')
  })

  it('una con naviera y otra sin es «Varios»', () => {
    const c = valoresComunes([unidad(1), unidad(2, { navieraId: null })])
    expect(c.varios).toEqual(['naviera'])
    expect(c.valores.naviera).toBe('')
  })

  it('todas nulas es común y vacío', () => {
    const c = valoresComunes([unidad(1), unidad(2)])
    expect(c.varios).not.toContain('booking')
    expect(c.valores.booking).toBe('')
  })

  it('sin unidades, todo vacío y sin «Varios»; las notas siempre vacías', () => {
    expect(valoresComunes([])).toEqual({ valores: VALORES_VACIOS_DE_TRANSPORTE, varios: [] })
    expect(valoresComunes([unidad(1)]).valores.notas).toBe('')
  })
})

describe('cambiosDelGrupo', () => {
  const comunes = valoresComunes([unidad(1), unidad(2, { etaEl: '2026-12-20' })])

  it('sin tocar, nada que mandar', () => {
    expect(cambiosDelGrupo(comunes, comunes.valores)).toBeNull()
  })

  it('un campo común cambiado manda sólo esa clave de la base', () => {
    expect(cambiosDelGrupo(comunes, { ...comunes.valores, zarpe: '2026-12-02' })).toEqual({
      zarpe_el: '2026-12-02',
    })
  })

  it('un campo común vaciado manda null (vacía a todas)', () => {
    expect(cambiosDelGrupo(comunes, { ...comunes.valores, zarpe: '' })).toEqual({ zarpe_el: null })
  })

  it('un «Varios» escrito se manda; un «Varios» vacío no se toca', () => {
    expect(cambiosDelGrupo(comunes, { ...comunes.valores, eta: '2026-12-30' })).toEqual({
      eta_el: '2026-12-30',
    })
    expect(cambiosDelGrupo(comunes, { ...comunes.valores, eta: '' })).toBeNull()
  })

  it('contenedor y booking se normalizan y las claves son las de la base', () => {
    expect(
      cambiosDelGrupo(comunes, { ...comunes.valores, contenedor: ' ab c 1 ', booking: 'bk 9' }),
    ).toEqual({ contenedor: 'ABC1', booking: 'BK9' })
    expect(
      cambiosDelGrupo(comunes, {
        ...comunes.valores,
        naviera: '22222222-2222-4222-8222-222222222222',
        puertoOrigen: '33333333-3333-4333-8333-333333333333',
        puertoDestino: '44444444-4444-4444-8444-444444444444',
        arribo: '2026-12-31',
      }),
    ).toEqual({
      naviera_id: '22222222-2222-4222-8222-222222222222',
      puerto_origen_id: '33333333-3333-4333-8333-333333333333',
      puerto_destino_id: '44444444-4444-4444-8444-444444444444',
      arribo_el: '2026-12-31',
    })
  })

  it('nunca manda las notas', () => {
    expect(cambiosDelGrupo(comunes, { ...comunes.valores, notas: 'hola' })).toBeNull()
  })
})

describe('esperadasDelGrupo', () => {
  it('cada transporte con la versión que vio el resumen', () => {
    const u = [unidad(1), unidad(2)]
    expect(esperadasDelGrupo(u)).toEqual({
      [u[0]!.transporteId]: u[0]!.actualizadoEn,
      [u[1]!.transporteId]: u[1]!.actualizadoEn,
    })
  })
})

describe('puedeEditarElGrupo', () => {
  const bien = { unidades: [unidad(1)], hayMas: false, hayOcultas: false }

  it('con todo en orden puede', () => {
    expect(puedeEditarElGrupo(bien)).toEqual({ puede: true })
  })

  it('dice el primer motivo, en orden', () => {
    expect(puedeEditarElGrupo({ ...bien, unidades: [] })).toEqual({
      puede: false,
      motivo: 'Este grupo no tiene unidades que puedas ver.',
    })
    expect(puedeEditarElGrupo({ ...bien, hayMas: true, hayOcultas: true })).toEqual({
      puede: false,
      motivo: 'Hay más unidades de las que se muestran: no se puede editar el grupo desde aquí.',
    })
    expect(puedeEditarElGrupo({ ...bien, hayOcultas: true })).toEqual({
      puede: false,
      motivo: 'Hay unidades que no ves: no se puede editar el grupo desde aquí.',
    })
    expect(
      puedeEditarElGrupo({ ...bien, unidades: [unidad(1), unidad(2, { editable: false })] }),
    ).toEqual({ puede: false, motivo: 'Hay unidades del grupo que no puedes editar.' })
  })
})

describe('textos', () => {
  it('el pie cuenta las unidades', () => {
    expect(textoDelPieDelGrupo(3)).toBe('Se aplicará a las 3 unidades.')
    expect(textoDelPieDelGrupo(1)).toBe('Se aplicará a la única unidad.')
  })

  it('el rechazo quita «Recarga.», baja la primera letra y deja «título» tal cual', () => {
    expect(textoDelRechazoDelGrupo('El grupo cambió mientras lo editabas. Recarga.')).toBe(
      'No se cambió ninguna: el grupo cambió mientras lo editabas.',
    )
    expect(textoDelRechazoDelGrupo('«Hilux» no admite contenedor.')).toBe(
      'No se cambió ninguna: «Hilux» no admite contenedor.',
    )
  })
})
