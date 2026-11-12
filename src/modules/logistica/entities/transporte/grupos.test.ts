import { describe, expect, it } from 'vitest'
import {
  grupoDesde,
  nombreDeCatalogo,
  paginaDeGruposDesde,
  textoDeUnidades,
  textosDelGrupo,
  valorDelGrupo,
} from './grupos'

const ID = '11111111-1111-4111-8111-111111111111'

const grupoCrudo = {
  clave: 'ECMU123456',
  unidades: 2,
  hay_mas: false,
  hay_ocultas: false,
  naviera_id: ID,
  puerto_origen_id: null,
  puerto_destino_id: null,
  zarpe_el: '2026-12-01',
  eta_el: null,
  arribo_el: null,
  varios: ['eta_el'],
}

describe('la página de grupos que lee la base', () => {
  it('lee la forma válida', () => {
    const pagina = paginaDeGruposDesde({ grupos: [grupoCrudo], siguiente: ID, cortada: false })
    expect(pagina?.siguiente).toBe(ID)
    expect(pagina?.grupos[0]).toMatchObject({
      clave: 'ECMU123456',
      unidades: 2,
      navieraId: ID,
      zarpeEl: '2026-12-01',
      varios: ['eta_el'],
    })
  })

  it('sin `siguiente` no es la forma: nulo', () => {
    expect(paginaDeGruposDesde({ grupos: [], cortada: false })).toBeNull()
  })

  it('un grupo mal formado hace nulo toda la página (nunca se descarta en silencio)', () => {
    expect(
      paginaDeGruposDesde({
        grupos: [{ ...grupoCrudo, naviera_id: 'no-uuid' }],
        siguiente: null,
        cortada: false,
      }),
    ).toBeNull()
  })

  it('«siguiente» nulo y «cortada» se conservan', () => {
    expect(paginaDeGruposDesde({ grupos: [], siguiente: null, cortada: true })).toEqual({
      grupos: [],
      siguiente: null,
      cortada: true,
    })
  })
})

describe('el grupo abierto', () => {
  const unidad = {
    transporte_id: ID,
    vehiculo_id: ID,
    repuesto_id: null,
    titulo: 'Toyota Hilux',
    fase_id: null,
    fase: null,
    naviera_id: null,
    puerto_origen_id: null,
    puerto_destino_id: null,
    contenedor: 'ECMU123456',
    booking: null,
    zarpe_el: null,
    eta_el: '2026-12-15',
    arribo_el: null,
    actualizado_en: '2026-11-12T10:00:00+00:00',
    editable: true,
  }

  it('lee sus unidades con la versión que vio', () => {
    const grupo = grupoDesde({
      tipo: 'contenedor',
      clave: 'ECMU123456',
      unidades: [unidad],
      hay_mas: false,
      hay_ocultas: true,
    })
    expect(grupo?.hayOcultas).toBe(true)
    expect(grupo?.unidades[0]).toMatchObject({
      transporteId: ID,
      titulo: 'Toyota Hilux',
      etaEl: '2026-12-15',
      actualizadoEn: '2026-11-12T10:00:00+00:00',
      editable: true,
    })
  })

  it('un tipo ajeno no es la forma', () => {
    expect(
      grupoDesde({ tipo: 'otro', clave: 'x', unidades: [], hay_mas: false, hay_ocultas: false }),
    ).toBeNull()
  })
})

describe('qué dice una columna', () => {
  it('el dato común se escribe', () => {
    expect(valorDelGrupo('2026-12-01', 'zarpe_el', [])).toEqual({
      tipo: 'comun',
      valor: '2026-12-01',
    })
  })

  it('«varios» gana aunque el valor salga nulo', () => {
    expect(valorDelGrupo(null, 'eta_el', ['eta_el'])).toEqual({ tipo: 'varios' })
  })

  it('un dato que ninguna unidad tiene es «sin»', () => {
    expect(valorDelGrupo(null, 'arribo_el', ['eta_el'])).toEqual({ tipo: 'sin' })
  })
})

describe('textos', () => {
  it('unidades: una, varias y «200+» sin dar un total', () => {
    expect(textoDeUnidades(1, false)).toBe('1 unidad')
    expect(textoDeUnidades(3, false)).toBe('3 unidades')
    expect(textoDeUnidades(200, true)).toBe('200+ unidades')
  })

  it('un id de catálogo ausente no da nombre (nunca el uuid)', () => {
    const lista = [{ id: ID, nombre: 'Maersk' }]
    expect(nombreDeCatalogo(lista, ID)).toBe('Maersk')
    expect(nombreDeCatalogo(lista, '22222222-2222-4222-8222-222222222222')).toBeNull()
    expect(nombreDeCatalogo(lista, null)).toBeNull()
  })
})

describe('la fila de un grupo', () => {
  const NAVIERA = '11111111-1111-4111-8111-111111111111'
  const ORIGEN = '22222222-2222-4222-8222-222222222222'
  const catalogos = {
    navieras: [{ id: NAVIERA, nombre: 'Maersk' }],
    puertos: [{ id: ORIGEN, nombre: 'Miami' }],
  }
  const grupo = {
    clave: 'ECMU123456',
    unidades: 2,
    hayMas: false,
    hayOcultas: false,
    navieraId: NAVIERA,
    puertoOrigenId: ORIGEN,
    puertoDestinoId: null,
    zarpeEl: '2026-12-01',
    etaEl: null,
    arriboEl: null,
    varios: ['eta_el' as const],
  }
  const fecha = (iso: string) => `día ${iso}`

  it('escribe lo común, «Varias» lo que difiere y nada lo que falta', () => {
    expect(textosDelGrupo(grupo, catalogos, fecha)).toEqual({
      naviera: 'Maersk',
      ruta: 'Miami → —',
      zarpe: 'día 2026-12-01',
      eta: 'Varias',
      arribo: null,
      unidades: '2 unidades',
    })
  })

  it('los puertos que difieren dicen «Varios» y un id que ya no está no se escribe', () => {
    const t = textosDelGrupo(
      {
        ...grupo,
        navieraId: '33333333-3333-4333-8333-333333333333',
        puertoOrigenId: null,
        varios: ['puerto_destino_id'],
      },
      catalogos,
      fecha,
    )
    expect(t.naviera).toBeNull()
    expect(t.ruta).toBe('— → Varios')
  })

  it('sin origen ni destino no hay ruta', () => {
    expect(
      textosDelGrupo({ ...grupo, puertoOrigenId: null, varios: [] }, catalogos, fecha).ruta,
    ).toBeNull()
  })
})
