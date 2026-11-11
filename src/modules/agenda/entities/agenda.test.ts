import { describe, expect, it } from 'vitest'
import { CLASES_DE_AGENDA, claseDe, entradasDeAgenda, leerAgendaDeRango } from './agenda'

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

const respuesta = {
  eventos: [
    {
      id: ID(1),
      titulo: 'Reunión',
      inicia_en: '2026-11-10T14:00:00+00:00',
      termina_en: null,
      visibilidad: 'seleccionados',
      estado: 'pendiente',
      mio: true,
    },
  ],
  tareas: [
    {
      id: ID(2),
      titulo: 'Llamar',
      vence_en: '2026-11-10T15:00:00+00:00',
      estado: 'completado',
      responsable_id: ID(9),
      mia: false,
    },
  ],
  recordatorios: [{ id: ID(3), titulo: 'Seguimiento', recordar_en: '2026-11-10T16:00:00+00:00' }],
  subastas: [
    {
      vehiculo_id: ID(4),
      titulo: 'Toyota Hilux',
      cierre_subasta_en: '2026-11-10T17:00:00+00:00',
      estado_subasta: 'programada',
      origen_id: ID(5),
    },
  ],
  hay_mas: { eventos: false, tareas: true, recordatorios: false, subastas: false },
  tope: 200,
}

describe('leerAgendaDeRango', () => {
  it('acepta la respuesta con las cuatro clases y la pasa a camelCase', () => {
    const resultado = leerAgendaDeRango(respuesta)
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) {
      return
    }
    expect(resultado.data.eventos[0]).toMatchObject({
      iniciaEn: '2026-11-10T14:00:00+00:00',
      mio: true,
    })
    expect(resultado.data.tareas[0]).toMatchObject({ responsableId: ID(9), mia: false })
    expect(resultado.data.recordatorios[0]?.recordarEn).toBe('2026-11-10T16:00:00+00:00')
    expect(resultado.data.subastas[0]).toMatchObject({ vehiculoId: ID(4), id: ID(4) })
    expect(resultado.data.hayMas).toEqual({
      evento: false,
      tarea: true,
      recordatorio: false,
      subasta: false,
    })
    expect(resultado.data.tope).toBe(200)
  })

  it('un campo faltante falla como valor, no como excepción', () => {
    const { titulo: _titulo, ...sinTitulo } = respuesta.eventos[0]!
    const resultado = leerAgendaDeRango({ ...respuesta, eventos: [sinTitulo] })
    expect(resultado.ok).toBe(false)
    expect(leerAgendaDeRango(null).ok).toBe(false)
  })

  it('un id que no es uuid se rechaza', () => {
    const resultado = leerAgendaDeRango({
      ...respuesta,
      tareas: [{ ...respuesta.tareas[0], id: 'no-es-uuid' }],
    })
    expect(resultado.ok).toBe(false)
  })
})

describe('CLASES_DE_AGENDA', () => {
  it('son cuatro, con nombre y plural en español', () => {
    expect(CLASES_DE_AGENDA.map((clase) => clase.nombre)).toEqual([
      'Evento',
      'Tarea',
      'Recordatorio',
      'Subasta',
    ])
    expect(claseDe('tarea').plural).toBe('tareas')
  })
})

describe('entradasDeAgenda', () => {
  const agenda = () => {
    const resultado = leerAgendaDeRango(respuesta)
    if (!resultado.ok) {
      throw new Error('la respuesta de ejemplo debe parsear')
    }
    return resultado.data
  }
  const todas = ['evento', 'tarea', 'recordatorio', 'subasta'] as const

  it('aplana las cuatro clases; sólo la subasta lleva a un lugar y la tarea completada va hecha', () => {
    const entradas = entradasDeAgenda(agenda(), todas)
    expect(entradas.map((entrada) => entrada.clave)).toEqual(todas)
    expect(entradas.map((entrada) => entrada.ruta)).toEqual([
      null,
      null,
      null,
      `/vehiculos/${ID(4)}`,
    ])
    expect(entradas.find((entrada) => entrada.clave === 'tarea')?.hecha).toBe(true)
    expect(entradas.find((entrada) => entrada.clave === 'evento')?.detalle).toBe('Seleccionados')
  })

  it('con rutaDe, el evento y la tarea llevan a su panel; la subasta conserva su vehículo', () => {
    const rutas = entradasDeAgenda(agenda(), todas, (clave, id) =>
      clave === 'evento' || clave === 'tarea' ? `/agenda?${clave}=${id}` : null,
    ).map((entrada) => entrada.ruta)
    expect(rutas).toEqual([
      `/agenda?evento=${ID(1)}`,
      `/agenda?tarea=${ID(2)}`,
      null,
      `/vehiculos/${ID(4)}`,
    ])
  })

  it('sólo trae las clases pedidas', () => {
    expect(entradasDeAgenda(agenda(), ['tarea']).map((entrada) => entrada.clave)).toEqual(['tarea'])
    expect(entradasDeAgenda(agenda(), [])).toEqual([])
  })
})
