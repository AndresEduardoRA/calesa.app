import { describe, expect, it } from 'vitest'
import type { Permisos } from '@/shared/lib/permisos'
import {
  accionesDeBloqueo,
  accionesDeError,
  alcanceDeAvisos,
  CAUSAS_DE_BLOQUEO,
  ETIQUETA_DE_AVISO,
  esCausaDeBloqueo,
  rutaParaDesvincular,
  vehiculoDelAviso,
  type AlcanceDeAvisos,
  type VehiculoDelAviso,
} from './avisos-de-vehiculo'

const TODO: AlcanceDeAvisos = {
  verLeads: true,
  verLogistica: true,
  verCotizaciones: true,
  verRepuestos: true,
}
const NADA: AlcanceDeAvisos = {
  verLeads: false,
  verLogistica: false,
  verCotizaciones: false,
  verRepuestos: false,
}
const VEHICULO: VehiculoDelAviso = { id: 'v1', leadId: 'l1', leadVisible: true, editable: true }

const etiquetas = (causa: (typeof CAUSAS_DE_BLOQUEO)[number], v = VEHICULO, a = TODO) =>
  accionesDeBloqueo(causa, v, a).acciones.map((x) => x.etiqueta)

describe('vinculado', () => {
  it('con todo: quitar el vínculo primero (destraba) y ver el lead después', () => {
    const { acciones, pedido } = accionesDeBloqueo('vinculado', VEHICULO, TODO)
    expect(acciones).toEqual([
      {
        tipo: 'ir',
        etiqueta: 'Quitar el vínculo',
        ruta: '/vehiculos/v1?panel=desvincular&luego=papelera',
      },
      { tipo: 'ir', etiqueta: 'Ver el lead', ruta: '/leads/l1' },
    ])
    expect(pedido).toBeNull()
  })

  it('sin que el lead se pueda abrir no ofrece verlo', () => {
    expect(etiquetas('vinculado', { ...VEHICULO, leadVisible: false })).toEqual([
      'Quitar el vínculo',
    ])
  })

  it('sin editar el vehículo no hay botón para quitar el vínculo: hay el pedido', () => {
    const resueltas = accionesDeBloqueo('vinculado', { ...VEHICULO, editable: false }, TODO)
    expect(resueltas.acciones.map((x) => x.etiqueta)).toEqual(['Ver el lead'])
    expect(resueltas.pedido).toBe('Para quitar el vínculo, pídeselo a quien administra los roles.')
  })

  it('sin leads.ver tampoco: el bloque del vínculo no existe', () => {
    const resueltas = accionesDeBloqueo('vinculado', VEHICULO, { ...TODO, verLeads: false })
    expect(resueltas.acciones.map((x) => x.etiqueta)).toEqual(['Ver el lead'])
    expect(resueltas.pedido).not.toBeNull()
  })

  it('sin nada de eso sólo queda el pedido', () => {
    const resueltas = accionesDeBloqueo(
      'vinculado',
      { ...VEHICULO, editable: false, leadVisible: false },
      NADA,
    )
    expect(resueltas.acciones).toEqual([])
    expect(resueltas.pedido).not.toBeNull()
  })
})

describe('el resto de las causas', () => {
  it.each([
    ['fase', 'Ver en logística', '/logistica/vehiculo/v1'],
    ['pagos', 'Ver en logística', '/logistica/vehiculo/v1'],
    ['aduana', 'Ver en logística', '/logistica/vehiculo/v1'],
    ['documentos', 'Ver los documentos', '/vehiculos/v1?seccion=documentos'],
    ['comprobante', 'Ver las cotizaciones', '/vehiculos/v1?seccion=cotizaciones'],
    ['final', 'Ver las cotizaciones', '/vehiculos/v1?seccion=cotizaciones'],
    ['repuestos', 'Ver el proyecto de repuestos', '/vehiculos/v1?seccion=repuestos'],
  ] as const)('%s lleva a %s', (causa, etiqueta, ruta) => {
    expect(accionesDeBloqueo(causa, VEHICULO, TODO).acciones).toEqual([
      { tipo: 'ir', etiqueta, ruta },
    ])
  })

  it('sin el permiso de lo que se ve no se ofrece, y no hay pedido (sólo informa)', () => {
    for (const causa of CAUSAS_DE_BLOQUEO) {
      if (causa === 'vinculado') continue
      expect(accionesDeBloqueo(causa, VEHICULO, NADA)).toEqual({ acciones: [], pedido: null })
    }
  })

  it('fase con y sin logistica.ver', () => {
    expect(etiquetas('fase')).toEqual(['Ver en logística'])
    expect(etiquetas('fase', VEHICULO, { ...TODO, verLogistica: false })).toEqual([])
  })

  it('cada permiso abre lo suyo y no lo de otro', () => {
    expect(etiquetas('documentos', VEHICULO, { ...NADA, verCotizaciones: true })).toEqual([])
    expect(etiquetas('comprobante', VEHICULO, { ...NADA, verCotizaciones: true })).toEqual([
      'Ver las cotizaciones',
    ])
    expect(etiquetas('repuestos', VEHICULO, { ...NADA, verRepuestos: true })).toEqual([
      'Ver el proyecto de repuestos',
    ])
  })
})

describe('el catálogo', () => {
  it('ninguna etiqueta es «Aceptar» ni «OK»: verbo + objeto', () => {
    for (const etiqueta of Object.values(ETIQUETA_DE_AVISO)) {
      expect(etiqueta).not.toMatch(/^(aceptar|ok|entendido)$/i)
      expect(etiqueta.split(' ').length).toBeGreaterThanOrEqual(2)
    }
  })

  it('nunca hay más de 3 acciones, para ninguna causa ni permiso', () => {
    for (const causa of CAUSAS_DE_BLOQUEO) {
      expect(accionesDeBloqueo(causa, VEHICULO, TODO).acciones.length).toBeLessThanOrEqual(3)
    }
  })

  it('toda acción dice su etiqueta con una del catálogo', () => {
    const del = new Set<string>(Object.values(ETIQUETA_DE_AVISO))
    for (const causa of CAUSAS_DE_BLOQUEO) {
      for (const accion of accionesDeBloqueo(causa, VEHICULO, TODO).acciones) {
        expect(del.has(accion.etiqueta)).toBe(true)
      }
    }
  })
})

describe('accionesDeError y esCausaDeBloqueo', () => {
  it('una causa conocida da sus acciones; sin causa o con una desconocida, nada', () => {
    expect(
      accionesDeError({ codigo: 'regla', mensaje: 'x', causa: 'documentos' }, VEHICULO, TODO)
        .acciones,
    ).toHaveLength(1)
    expect(accionesDeError({ codigo: 'regla', mensaje: 'x' }, VEHICULO, TODO).acciones).toEqual([])
    expect(
      accionesDeError({ codigo: 'regla', mensaje: 'x', causa: 'nueva' }, VEHICULO, TODO).acciones,
    ).toEqual([])
  })

  it('un conflicto suma «Ver los cambios» si la pantalla sabe adónde; sin adónde, nada', () => {
    const conflicto = { codigo: 'conflicto', mensaje: 'x' } as const
    expect(accionesDeError(conflicto, VEHICULO, TODO, '/actividad?v=1').acciones).toEqual([
      { tipo: 'ir', etiqueta: 'Ver los cambios', ruta: '/actividad?v=1' },
    ])
    expect(accionesDeError(conflicto, VEHICULO, TODO, null).acciones).toEqual([])
    expect(accionesDeError(conflicto, VEHICULO, TODO).acciones).toEqual([])
  })

  it('arma el vehículo del aviso con lo que la página resolvió', () => {
    expect(
      vehiculoDelAviso({ id: 'v1', leadId: 'l1' }, { editable: true, leadVisible: false }),
    ).toEqual({ id: 'v1', leadId: 'l1', leadVisible: false, editable: true })
  })

  it('reconoce todas las claves de la base y nada más', () => {
    for (const causa of CAUSAS_DE_BLOQUEO) {
      expect(esCausaDeBloqueo(causa)).toBe(true)
    }
    expect(esCausaDeBloqueo('otra')).toBe(false)
    expect(esCausaDeBloqueo(undefined)).toBe(false)
  })
})

describe('alcanceDeAvisos y rutaParaDesvincular', () => {
  const permiso = (clave: string, origenId: string | null = null) => ({
    clave,
    origenId,
    alcance: 'todos',
  })

  it('cada booleano sale del permiso que abre esa pantalla, por origen donde corresponde', () => {
    const permisos = [
      permiso('leads.ver'),
      permiso('logistica.ver', 'o1'),
      permiso('cotizaciones.ver', 'o2'),
      permiso('repuestos.ver'),
    ] as unknown as Permisos
    expect(alcanceDeAvisos(permisos, 'o1')).toEqual({
      verLeads: true,
      verLogistica: true,
      verCotizaciones: false,
      verRepuestos: true,
    })
    expect(alcanceDeAvisos([] as unknown as Permisos, 'o1')).toEqual(NADA)
  })

  it('quitar el vínculo siempre va a la ficha con el panel y el luego', () => {
    expect(rutaParaDesvincular('abc')).toBe('/vehiculos/abc?panel=desvincular&luego=papelera')
  })
})
