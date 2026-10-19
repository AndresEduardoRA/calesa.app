import { describe, expect, it } from 'vitest'
import type { EtapaGuardada } from './embudo'
import {
  cambiosDeOportunidad,
  datosDeOportunidad,
  montoDesdeTexto,
  oportunidadDesde,
  oportunidadesDelLeadDesde,
  oportunidadesParaMostrar,
  OPORTUNIDADES_VISIBLES_DEL_LEAD,
  validarMotivo,
  motivoParaNoMover,
  MENSAJE_DE_OPORTUNIDAD_A_MOVER_NO_DISPONIBLE,
  validarOportunidad,
  valoresDeOportunidad,
  type Oportunidad,
} from './oportunidad'

const fila = {
  id: '00000000-0000-0000-0000-000000000001',
  lead_id: '00000000-0000-0000-0000-000000000002',
  embudo_id: '00000000-0000-0000-0000-000000000003',
  etapa_id: '00000000-0000-0000-0000-000000000004',
  estado: 'abierta',
  titulo: 'Hilux 2020',
  notas: null,
  monto_estimado: 25000.5,
  moneda: 'USD',
  motivo_perdida: null,
  ultima_actividad_en: '2026-10-16T10:00:00+00:00',
  creado_en: '2026-10-16T10:00:00+00:00',
  actualizado_en: '2026-10-16T10:00:00.123456+00:00',
  eliminado: false,
  vehiculo: { id: '00000000-0000-0000-0000-000000000005', titulo: 'Toyota Hilux', numero: 7 },
  vehiculo_oculto: false,
}

const leida = (): Oportunidad => {
  const o = oportunidadDesde(fila)
  if (!o) throw new Error('no leyó')
  return o
}

describe('oportunidadDesde', () => {
  it('lee la forma de `_oportunidad_json` con su vehículo', () => {
    expect(leida()).toMatchObject({
      titulo: 'Hilux 2020',
      monto: 25000.5,
      moneda: 'USD',
      enEtapaDesde: fila.ultima_actividad_en,
      vehiculo: { titulo: 'Toyota Hilux', numero: 7 },
      vehiculoOculto: false,
    })
  })
  it('el monto que llega como texto (numeric) se lee como número; lo roto es null', () => {
    expect(oportunidadDesde({ ...fila, monto_estimado: '1200.00' })?.monto).toBe(1200)
    expect(oportunidadDesde({ ...fila, estado: 'otro' })).toBeNull()
  })
  it('las del lead traen su etapa y su embudo, y si puede crear', () => {
    const r = oportunidadesDelLeadDesde({
      puedo_crear: true,
      oportunidades: [
        {
          ...fila,
          etapa: {
            id: fila.etapa_id,
            nombre: 'Nuevo',
            color: 'azul',
            es_ganada: false,
            es_perdida: false,
          },
          embudo: { id: fila.embudo_id, nombre: 'Ventas' },
        },
        { roto: true },
      ],
    })
    expect(r?.puedoCrear).toBe(true)
    expect(r?.oportunidades).toHaveLength(1)
    expect(r?.oportunidades[0]?.etapa).toEqual({
      id: fila.etapa_id,
      nombre: 'Nuevo',
      color: 'azul',
      esGanada: false,
      esPerdida: false,
    })
    expect(oportunidadesDelLeadDesde(null)).toBeNull()
  })
})

describe('montoDesdeTexto', () => {
  it('entiende los separadores de miles y decimales', () => {
    expect(montoDesdeTexto('25000')).toBe(25000)
    expect(montoDesdeTexto('25.000')).toBe(25000)
    expect(montoDesdeTexto('25.000,50')).toBe(25000.5)
    expect(montoDesdeTexto('25,000.5')).toBe(25000.5)
    expect(montoDesdeTexto('1.234.567')).toBe(1234567)
    expect(montoDesdeTexto(' ')).toBeNull()
  })
  it('lo que no es un número', () => {
    expect(montoDesdeTexto('-5')).toBe('invalido')
    expect(montoDesdeTexto('abc')).toBe('invalido')
    expect(montoDesdeTexto('1,2,3')).toBe('invalido')
  })
})

describe('validarOportunidad', () => {
  const valores = { titulo: 'Hilux', monto: '', notas: '', vehiculo: '' }
  it('título, monto y notas, por campo', () => {
    expect(validarOportunidad(valores)).toEqual({})
    expect(validarOportunidad({ ...valores, titulo: ' ' }).titulo).toMatch(/entre 1 y 120/)
    expect(validarOportunidad({ ...valores, titulo: 'x'.repeat(121) }).titulo).toMatch(
      /entre 1 y 120/,
    )
    expect(validarOportunidad({ ...valores, monto: 'mucho' }).monto_estimado).toMatch(/con números/)
    expect(validarOportunidad({ ...valores, monto: '1000000000000' }).monto_estimado).toBe(
      'El monto es demasiado grande.',
    )
    expect(validarOportunidad({ ...valores, notas: 'x'.repeat(2001) }).notas).toMatch(/hasta 2000/)
  })
  it('el motivo hasta 200', () => {
    expect(validarMotivo('x'.repeat(200))).toBeNull()
    expect(validarMotivo('x'.repeat(201))).toBe('El motivo lleva hasta 200 caracteres.')
  })
})

describe('lo que viaja', () => {
  it('al crear: recorta, el monto como número y el vehículo como id', () => {
    expect(
      datosDeOportunidad({ titulo: ' Hilux ', monto: '25.000', notas: ' ', vehiculo: 'v1' }),
    ).toEqual({
      titulo: 'Hilux',
      monto_estimado: 25000,
      notas: null,
      vehiculo_id: 'v1',
    })
  })
  it('al editar, sólo lo que cambió; un vehículo que ya no se ve no se toca', () => {
    const antes = leida()
    expect(cambiosDeOportunidad(antes, valoresDeOportunidad(antes))).toEqual({})
    expect(cambiosDeOportunidad(antes, { ...valoresDeOportunidad(antes), titulo: 'Otra' })).toEqual(
      {
        titulo: 'Otra',
      },
    )
    expect(cambiosDeOportunidad(antes, { ...valoresDeOportunidad(antes), vehiculo: '' })).toEqual({
      vehiculo_id: null,
    })
    const oculta = { ...antes, vehiculo: null, vehiculoOculto: true }
    expect(valoresDeOportunidad(oculta).vehiculo).toBe('oculto')
    expect(cambiosDeOportunidad(oculta, valoresDeOportunidad(oculta))).toEqual({})
  })
  it('una nueva arranca vacía', () => {
    expect(valoresDeOportunidad(null)).toEqual({ titulo: '', monto: '', notas: '', vehiculo: '' })
  })
})

describe('motivoParaNoMover', () => {
  const etapa = (id: string, nombre: string, esPerdida = false) =>
    ({ id, nombre, esPerdida }) as unknown as EtapaGuardada
  const etapas = [etapa('a', 'Nuevo'), etapa('b', 'Cotizado'), etapa('c', 'Perdido', true)]

  it('abre cuando la oportunidad está, la etapa es otra y es una perdida', () => {
    expect(motivoParaNoMover({ etapaId: 'a' }, etapas, 'c')).toBeNull()
  })

  it('no abre si la oportunidad no está entre las cargadas', () => {
    expect(motivoParaNoMover(null, etapas, 'c')).toBe(MENSAJE_DE_OPORTUNIDAD_A_MOVER_NO_DISPONIBLE)
  })

  it('no abre si la etapa no existe o falta en la URL', () => {
    expect(motivoParaNoMover({ etapaId: 'a' }, etapas, 'zzz')).toBe(
      'Esa etapa ya no existe en este embudo.',
    )
    expect(motivoParaNoMover({ etapaId: 'a' }, etapas, null)).toBe(
      'Esa etapa ya no existe en este embudo.',
    )
  })

  it('no abre si ya está en esa etapa', () => {
    expect(motivoParaNoMover({ etapaId: 'c' }, etapas, 'c')).toBe(
      'La oportunidad ya está en «Perdido».',
    )
  })

  it('no abre para una etapa que no pide motivo', () => {
    expect(motivoParaNoMover({ etapaId: 'a' }, etapas, 'b')).toBe(
      'Pasar a «Cotizado» no pide un motivo: se mueve desde «Mover a…».',
    )
  })
})

describe('oportunidadesParaMostrar', () => {
  const lista = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

  it('hasta 10 se ven todas, sin recorte', () => {
    expect(OPORTUNIDADES_VISIBLES_DEL_LEAD).toBe(10)
    expect(oportunidadesParaMostrar(lista(0), false)).toEqual({ visibles: [], recortada: false })
    expect(oportunidadesParaMostrar(lista(10), false)).toEqual({
      visibles: lista(10),
      recortada: false,
    })
  })

  it('con más de 10 se ven las 10 primeras, que son las más recientes (abiertas primero), y se dice que hay más', () => {
    expect(oportunidadesParaMostrar(lista(11), false)).toEqual({
      visibles: lista(10),
      recortada: true,
    })
    expect(oportunidadesParaMostrar(lista(100), false).visibles).toHaveLength(10)
  })

  it('con «Ver todas» se ven todas las que trajo la lectura y ya no se dice que hay más por ver', () => {
    expect(oportunidadesParaMostrar(lista(100), true)).toEqual({
      visibles: lista(100),
      recortada: false,
    })
  })

  it('no toca la lista que recibe', () => {
    const original = lista(12)
    oportunidadesParaMostrar(original, false).visibles.push(99)
    expect(original).toHaveLength(12)
  })
})
