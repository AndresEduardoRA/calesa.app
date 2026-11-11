import { describe, expect, it } from 'vitest'
import {
  cambiosDeEvento,
  cambiosDeTarea,
  datosDeEventoNuevo,
  datosDeTareaNueva,
  validarEvento,
  validarTarea,
  valoresDeEvento,
  valoresDeTarea,
  valoresInicialesDeEvento,
  valoresInicialesDeTarea,
  type OriginalDeEvento,
  type OriginalDeTarea,
  type ValoresDeEvento,
  type ValoresDeTarea,
} from './edicion'
import { TOPE_DE_DESTINATARIOS } from './visibilidad'

const ZONA = 'America/La_Paz'
// 2026-11-11 10:00 en La Paz (UTC−4) = 14:00Z.
const AHORA = '2026-11-11T14:00:00.000Z'

const persona = (n: number) => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  nombre: `Persona ${n}`,
})

const evento = (cambios: Partial<ValoresDeEvento> = {}): ValoresDeEvento => ({
  titulo: 'Reunión',
  descripcion: '',
  lugar: '',
  iniciaEn: '2026-11-12T09:00',
  terminaEn: '',
  visibilidad: 'privado',
  destinatarios: [],
  ...cambios,
})

const tarea = (cambios: Partial<ValoresDeTarea> = {}): ValoresDeTarea => ({
  titulo: 'Llamar',
  descripcion: '',
  venceEn: '2026-11-12T18:00',
  responsable: null,
  ...cambios,
})

describe('validarEvento', () => {
  it('un evento completo no tiene errores', () => {
    expect(validarEvento(evento(), ZONA)).toEqual({})
  })

  it('el título va de 1 a 120 caracteres tras recortar los espacios', () => {
    expect(validarEvento(evento({ titulo: '   ' }), ZONA).titulo).toBeDefined()
    expect(validarEvento(evento({ titulo: 'a'.repeat(120) }), ZONA).titulo).toBeUndefined()
    expect(validarEvento(evento({ titulo: 'a'.repeat(121) }), ZONA).titulo).toBeDefined()
    expect(validarEvento(evento({ titulo: ` ${'a'.repeat(120)} ` }), ZONA).titulo).toBeUndefined()
  })

  it('la descripción llega a 2.000 y el lugar a 200', () => {
    expect(
      validarEvento(evento({ descripcion: 'a'.repeat(2000) }), ZONA).descripcion,
    ).toBeUndefined()
    expect(validarEvento(evento({ descripcion: 'a'.repeat(2001) }), ZONA).descripcion).toBeDefined()
    expect(validarEvento(evento({ lugar: 'a'.repeat(200) }), ZONA).lugar).toBeUndefined()
    expect(validarEvento(evento({ lugar: 'a'.repeat(201) }), ZONA).lugar).toBeDefined()
  })

  it('el inicio es obligatorio y válido', () => {
    expect(validarEvento(evento({ iniciaEn: '' }), ZONA).inicia_en).toBe('Elige cuándo empieza.')
    expect(validarEvento(evento({ iniciaEn: 'mañana' }), ZONA).inicia_en).toBeDefined()
  })

  it('el fin no puede ser anterior al inicio (igual sí)', () => {
    expect(validarEvento(evento({ terminaEn: '2026-11-12T08:59' }), ZONA).termina_en).toBe(
      'El evento no puede terminar antes de empezar.',
    )
    expect(
      validarEvento(evento({ terminaEn: '2026-11-12T09:00' }), ZONA).termina_en,
    ).toBeUndefined()
  })

  it('«seleccionados» pide de 1 a 50 personas; otra visibilidad no las valida', () => {
    const sin = validarEvento(evento({ visibilidad: 'seleccionados' }), ZONA)
    expect(sin.destinatarios).toBe('Elige al menos una persona.')
    const una = evento({ visibilidad: 'seleccionados', destinatarios: [persona(1)] })
    expect(validarEvento(una, ZONA).destinatarios).toBeUndefined()
    const justas = Array.from({ length: TOPE_DE_DESTINATARIOS }, (_, i) => persona(i + 1))
    expect(
      validarEvento(evento({ visibilidad: 'seleccionados', destinatarios: justas }), ZONA)
        .destinatarios,
    ).toBeUndefined()
    const de_mas = [...justas, persona(99)]
    expect(
      validarEvento(evento({ visibilidad: 'seleccionados', destinatarios: de_mas }), ZONA)
        .destinatarios,
    ).toBe('Puedes elegir hasta 50 personas.')
    expect(validarEvento(evento({ visibilidad: 'publico' }), ZONA).destinatarios).toBeUndefined()
  })
})

describe('validarTarea', () => {
  it('el título y la descripción tienen sus límites', () => {
    expect(validarTarea(tarea({ titulo: '' }), ZONA, AHORA).titulo).toBeDefined()
    expect(validarTarea(tarea({ titulo: 'a'.repeat(121) }), ZONA, AHORA).titulo).toBeDefined()
    expect(
      validarTarea(tarea({ descripcion: 'a'.repeat(2001) }), ZONA, AHORA).descripcion,
    ).toBeDefined()
    expect(validarTarea(tarea(), ZONA, AHORA)).toEqual({})
  })

  it('el vencimiento es obligatorio y no puede estar en el pasado', () => {
    expect(validarTarea(tarea({ venceEn: '' }), ZONA, AHORA).vence_en).toBe('Elige cuándo vence.')
    // 09:59 en La Paz ya pasó (son las 10:00).
    expect(validarTarea(tarea({ venceEn: '2026-11-11T09:59' }), ZONA, AHORA).vence_en).toBe(
      'El vencimiento no puede quedar en el pasado.',
    )
    expect(
      validarTarea(tarea({ venceEn: '2026-11-11T10:01' }), ZONA, AHORA).vence_en,
    ).toBeUndefined()
  })

  it('un vencimiento que ya estaba guardado no se vuelve a exigir hacia adelante', () => {
    const guardado = '2026-11-10T22:00:00.000Z'
    const v = tarea({ venceEn: '2026-11-10T18:00' })
    expect(validarTarea(v, ZONA, AHORA).vence_en).toBeDefined()
    expect(validarTarea(v, ZONA, AHORA, guardado).vence_en).toBeUndefined()
  })
})

describe('valores iniciales', () => {
  it('el evento empieza a las 09:00 del día de la vista, o de hoy si ese día ya pasó', () => {
    expect(valoresInicialesDeEvento('2026-11-20', '2026-11-11').iniciaEn).toBe('2026-11-20T09:00')
    expect(valoresInicialesDeEvento('2026-11-01', '2026-11-11').iniciaEn).toBe('2026-11-11T09:00')
    expect(valoresInicialesDeEvento('2026-11-20', '2026-11-11')).toMatchObject({
      visibilidad: 'privado',
      destinatarios: [],
      terminaEn: '',
    })
  })

  it('la tarea vence a las 18:00 y salta a mañana si esa hora ya pasó', () => {
    expect(valoresInicialesDeTarea('2026-11-11', '2026-11-11', ZONA, AHORA).venceEn).toBe(
      '2026-11-11T18:00',
    )
    // Son las 19:00 en La Paz (23:00Z): las 18:00 de hoy ya pasaron.
    expect(
      valoresInicialesDeTarea('2026-11-11', '2026-11-11', ZONA, '2026-11-11T23:00:00.000Z').venceEn,
    ).toBe('2026-11-12T18:00')
    expect(valoresInicialesDeTarea('2026-11-01', '2026-11-11', ZONA, AHORA).venceEn).toBe(
      '2026-11-11T18:00',
    )
    expect(valoresInicialesDeTarea('2026-11-15', '2026-11-11', ZONA, AHORA).venceEn).toBe(
      '2026-11-15T18:00',
    )
  })
})

const guardadoDeEvento: OriginalDeEvento = {
  titulo: 'Reunión',
  descripcion: null,
  lugar: null,
  iniciaEn: '2026-11-12T13:00:00+00:00',
  terminaEn: null,
  visibilidad: 'privado',
  destinatarios: [],
}

describe('de lo guardado al formulario y de vuelta', () => {
  it('valoresDeEvento lleva los instantes a la hora de la empresa', () => {
    expect(valoresDeEvento(guardadoDeEvento, ZONA)).toEqual(evento())
  })

  it('09:00 en La Paz son las 13:00Z al crear', () => {
    expect(datosDeEventoNuevo(evento(), ZONA)).toEqual({
      titulo: 'Reunión',
      inicia_en: '2026-11-12T13:00:00.000Z',
      visibilidad: 'privado',
    })
  })

  it('al crear sólo van las claves con valor', () => {
    const datos = datosDeEventoNuevo(
      evento({ descripcion: ' algo ', lugar: 'Sala', terminaEn: '2026-11-12T10:30' }),
      ZONA,
    )
    expect(datos).toEqual({
      titulo: 'Reunión',
      descripcion: 'algo',
      lugar: 'Sala',
      inicia_en: '2026-11-12T13:00:00.000Z',
      termina_en: '2026-11-12T14:30:00.000Z',
      visibilidad: 'privado',
    })
  })
})

describe('cambios de un evento', () => {
  it('sin tocar nada no hay cambios', () => {
    const c = cambiosDeEvento(guardadoDeEvento, valoresDeEvento(guardadoDeEvento, ZONA), ZONA)
    expect(c).toEqual({ datos: {}, destinatarios: [], hayCambios: false })
  })

  it('vaciar la descripción manda null, y sólo eso', () => {
    const original = { ...guardadoDeEvento, descripcion: 'algo' }
    const c = cambiosDeEvento(
      original,
      { ...valoresDeEvento(original, ZONA), descripcion: '  ' },
      ZONA,
    )
    expect(c.datos).toEqual({ descripcion: null })
    expect(c.hayCambios).toBe(true)
  })

  it('cambiar la hora manda el ISO UTC; quitar el fin manda null', () => {
    const original = { ...guardadoDeEvento, terminaEn: '2026-11-12T14:00:00+00:00' }
    const base = valoresDeEvento(original, ZONA)
    expect(
      cambiosDeEvento(original, { ...base, iniciaEn: '2026-11-12T10:00' }, ZONA).datos,
    ).toEqual({
      inicia_en: '2026-11-12T14:00:00.000Z',
    })
    expect(cambiosDeEvento(original, { ...base, terminaEn: '' }, ZONA).datos).toEqual({
      termina_en: null,
    })
  })

  it('cambiar sólo los destinatarios cuenta como cambio y viaja la lista', () => {
    const original: OriginalDeEvento = {
      ...guardadoDeEvento,
      visibilidad: 'seleccionados',
      destinatarios: [persona(1)],
    }
    const base = valoresDeEvento(original, ZONA)
    const c = cambiosDeEvento(original, { ...base, destinatarios: [persona(1), persona(2)] }, ZONA)
    expect(c.datos).toEqual({})
    expect(c.destinatarios).toEqual([persona(1).id, persona(2).id])
    expect(c.hayCambios).toBe(true)
  })

  it('un evento que deja de ser «seleccionados» manda la lista vacía', () => {
    const original: OriginalDeEvento = {
      ...guardadoDeEvento,
      visibilidad: 'seleccionados',
      destinatarios: [persona(1)],
    }
    const base = valoresDeEvento(original, ZONA)
    const c = cambiosDeEvento(
      original,
      { ...base, visibilidad: 'publico', destinatarios: [] },
      ZONA,
    )
    expect(c.datos).toEqual({ visibilidad: 'publico' })
    expect(c.destinatarios).toEqual([])
  })

  it('el orden de los destinatarios no es un cambio', () => {
    const original: OriginalDeEvento = {
      ...guardadoDeEvento,
      visibilidad: 'seleccionados',
      destinatarios: [persona(1), persona(2)],
    }
    const base = valoresDeEvento(original, ZONA)
    expect(
      cambiosDeEvento(original, { ...base, destinatarios: [persona(2), persona(1)] }, ZONA)
        .hayCambios,
    ).toBe(false)
  })
})

const guardadaDeTarea: OriginalDeTarea = {
  titulo: 'Llamar',
  descripcion: null,
  venceEn: '2026-11-12T22:00:00+00:00',
  responsable: persona(1),
}

describe('tareas: del formulario a la base', () => {
  it('valoresDeTarea lleva el vencimiento a la hora de la empresa', () => {
    expect(valoresDeTarea(guardadaDeTarea, ZONA)).toEqual(tarea({ responsable: persona(1) }))
  })

  it('al crear va el vencimiento en ISO UTC y el responsable sólo si se eligió', () => {
    expect(datosDeTareaNueva(tarea(), ZONA)).toEqual({
      titulo: 'Llamar',
      vence_en: '2026-11-12T22:00:00.000Z',
    })
    expect(datosDeTareaNueva(tarea({ responsable: persona(2), descripcion: 'x' }), ZONA)).toEqual({
      titulo: 'Llamar',
      descripcion: 'x',
      vence_en: '2026-11-12T22:00:00.000Z',
      responsable_id: persona(2).id,
    })
  })

  it('al guardar nunca va el responsable (la base lo rechaza)', () => {
    const base = valoresDeTarea(guardadaDeTarea, ZONA)
    expect(cambiosDeTarea(guardadaDeTarea, { ...base, responsable: persona(3) }, ZONA)).toEqual({})
    expect(cambiosDeTarea(guardadaDeTarea, { ...base, titulo: 'Llamar hoy' }, ZONA)).toEqual({
      titulo: 'Llamar hoy',
    })
    expect(cambiosDeTarea(guardadaDeTarea, { ...base, venceEn: '2026-11-13T18:00' }, ZONA)).toEqual(
      {
        vence_en: '2026-11-13T22:00:00.000Z',
      },
    )
  })
})
