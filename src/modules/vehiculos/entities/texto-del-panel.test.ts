import { describe, expect, it } from 'vitest'
import {
  leerTextoDelPanel,
  MINIMO_DEL_PANEL,
  queSePuedeTraer,
  type ContextoDeTraer,
} from './texto-del-panel'

const COPART = 'https://www.copart.com/lot/58540656/clean-title-2024-ford-bronco-big-bend'
const VIN = '1FMDE5BH9RLA12345'

describe('leerTextoDelPanel', () => {
  it('vacío no busca ni trae ni avisa', () => {
    expect(leerTextoDelPanel('')).toEqual({ busqueda: null, traer: null, aviso: null })
    expect(leerTextoDelPanel('   ')).toEqual({ busqueda: null, traer: null, aviso: null })
  })

  it('un enlace de Copart o IAAI se trae y no se busca', () => {
    const leido = leerTextoDelPanel(` ${COPART} `)
    expect(leido.busqueda).toBeNull()
    expect(leido.aviso).toBeNull()
    expect(leido.traer).toEqual({ tipo: 'enlace', valor: COPART, plataforma: 'copart' })
    expect(leerTextoDelPanel('https://www.iaai.com/VehicleDetail/1234').traer?.tipo).toBe('enlace')
  })

  it('otro texto que empieza con http dice el motivo y no busca', () => {
    const leido = leerTextoDelPanel('https://ejemplo.com/auto')
    expect(leido.busqueda).toBeNull()
    expect(leido.traer).toBeNull()
    expect(leido.aviso).toBe('Ese enlace no es de una subasta que se pueda consultar.')
  })

  it('un VIN o un lote buscan y también se pueden traer', () => {
    expect(leerTextoDelPanel(VIN.toLowerCase())).toEqual({
      busqueda: VIN.toLowerCase(),
      traer: { tipo: 'vin', valor: VIN },
      aviso: null,
    })
    expect(leerTextoDelPanel('58540656')).toEqual({
      busqueda: '58540656',
      traer: { tipo: 'lote', valor: '58540656' },
      aviso: null,
    })
  })

  it('un nombre con 3 letras o dígitos seguidos busca', () => {
    expect(leerTextoDelPanel('Bronco')).toEqual({ busqueda: 'Bronco', traer: null, aviso: null })
    expect(leerTextoDelPanel('  F-150 ').busqueda).toBe('F-150')
  })

  it('un texto más corto avisa el mínimo y no busca', () => {
    for (const texto of ['Br', 'a-b', '12']) {
      expect(leerTextoDelPanel(texto)).toEqual({
        busqueda: null,
        traer: null,
        aviso: MINIMO_DEL_PANEL.aviso,
      })
    }
    expect(MINIMO_DEL_PANEL.aviso).toBe('Escribe al menos 3 letras o números.')
  })

  it('corta lo largo a 100 caracteres', () => {
    const leido = leerTextoDelPanel('a'.repeat(150))
    expect(leido.busqueda).toBe('a'.repeat(100))
  })
})

describe('queSePuedeTraer', () => {
  const todo: ContextoDeTraer = { puedeCargar: true, esSubasta: true, apibaraActiva: true }
  const enlace = leerTextoDelPanel(COPART).traer
  const lote = leerTextoDelPanel('58540656').traer
  const vin = leerTextoDelPanel(VIN).traer

  it('con permiso, origen de subasta y apibara encendida dice qué trae', () => {
    expect(queSePuedeTraer(enlace, todo)).toEqual({
      puede: true,
      etiqueta: 'Traer el enlace de Copart',
      aviso: null,
    })
    expect(queSePuedeTraer(lote, todo).etiqueta).toBe('Traer el lote 58540656')
    expect(queSePuedeTraer(vin, todo).etiqueta).toBe(`Traer el VIN ${VIN}`)
  })

  it('sin nada que traer no hay botón ni aviso', () => {
    expect(queSePuedeTraer(null, todo)).toEqual({ puede: false, etiqueta: null, aviso: null })
  })

  it('un enlace que no se puede traer dice por qué', () => {
    expect(queSePuedeTraer(enlace, { ...todo, apibaraActiva: false }).aviso).toBe(
      'La consulta de subastas está apagada: carga el vehículo a mano.',
    )
    expect(queSePuedeTraer(enlace, { ...todo, esSubasta: false }).aviso).toBe(
      'Este origen no trae vehículos de una subasta: búscalo por nombre o cárgalo a mano.',
    )
    expect(queSePuedeTraer(enlace, { ...todo, puedeCargar: false })).toEqual({
      puede: false,
      etiqueta: null,
      aviso: 'No puedes dar de alta en este origen: busca el vehículo por nombre, VIN o lote.',
    })
  })

  it('un VIN o un lote que no se pueden traer sólo se buscan, sin aviso', () => {
    for (const contexto of [
      { ...todo, apibaraActiva: false },
      { ...todo, esSubasta: false },
      { ...todo, puedeCargar: false },
    ]) {
      expect(queSePuedeTraer(lote, contexto)).toEqual({ puede: false, etiqueta: null, aviso: null })
      expect(queSePuedeTraer(vin, contexto).aviso).toBeNull()
    }
  })
})
