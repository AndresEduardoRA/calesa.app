import { describe, expect, it } from 'vitest'
import {
  agruparPorDia,
  diasDelRango,
  diasDeLaSemana,
  encabezadoDelDia,
  leerClases,
  leerFecha,
  leerVista,
  moverFecha,
  numeroDelDia,
  rangoDe,
  semanasDelMes,
  tituloDelRango,
  VISTAS,
} from './calendario'
import { DIAS_MAXIMOS_DEL_RANGO } from './visibilidad'

const LA_PAZ = 'America/La_Paz'
const MADRID = 'Europe/Madrid'

describe('semanasDelMes', () => {
  it('noviembre de 2026 (empieza en domingo) son 6 semanas, del lunes 26 de oct al domingo 6 de dic', () => {
    const filas = semanasDelMes('2026-11-15')
    expect(filas).toHaveLength(6)
    expect(filas[0]?.[0]).toEqual({ dia: '2026-10-26', delMes: false })
    expect(filas[0]?.[6]).toEqual({ dia: '2026-11-01', delMes: true })
    expect(filas.at(-1)?.[6]).toEqual({ dia: '2026-12-06', delMes: false })
    expect(filas.flat()).toHaveLength(42)
  })

  it('febrero de 2027 (empieza en lunes y tiene 28 días) son 4 semanas exactas', () => {
    const filas = semanasDelMes('2027-02-10')
    expect(filas).toHaveLength(4)
    expect(filas.flat().every((celda) => celda.delMes)).toBe(true)
  })

  it('cada fila es de siete días seguidos y empieza en lunes', () => {
    for (const fila of semanasDelMes('2026-03-01')) {
      expect(fila).toHaveLength(7)
      expect(new Date(`${fila[0]?.dia}T00:00:00Z`).getUTCDay()).toBe(1)
    }
  })

  it('diasDeLaSemana da de lunes a domingo', () => {
    expect(diasDeLaSemana('2026-11-11')).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ])
    expect(diasDeLaSemana('2026-11-15')[0]).toBe('2026-11-09')
  })
})

describe('los cortes de día son los de la zona de la empresa', () => {
  it('el rango del día 10 de nov en La Paz es [04:00Z, 04:00Z del día siguiente)', () => {
    expect(rangoDe('dia', '2026-11-10', LA_PAZ)).toEqual({
      desde: '2026-11-10T04:00:00.000Z',
      hasta: '2026-11-11T04:00:00.000Z',
    })
  })

  it('un evento a las 02:00Z del 11 cae el 10 en La Paz y el 11 en UTC', () => {
    const evento = { id: 'a', iniciaEn: '2026-11-11T02:00:00Z' }
    const enLaPaz = agruparPorDia([evento], (e) => e.iniciaEn, LA_PAZ)
    const enUtc = agruparPorDia([evento], (e) => e.iniciaEn, 'UTC')
    expect([...enLaPaz.keys()]).toEqual(['2026-11-10'])
    expect([...enUtc.keys()]).toEqual(['2026-11-11'])
  })

  it('el 25 de oct de 2026 en Madrid (fin del horario de verano) dura 25 horas, no 24', () => {
    const { desde, hasta } = rangoDe('dia', '2026-10-25', MADRID)
    expect((Date.parse(hasta) - Date.parse(desde)) / 3_600_000).toBe(25)
  })

  it('la semana es la unión de sus siete días', () => {
    const semana = rangoDe('semana', '2026-11-11', LA_PAZ)
    expect(semana.desde).toBe('2026-11-09T04:00:00.000Z')
    expect(semana.hasta).toBe('2026-11-16T04:00:00.000Z')
  })

  it('el rango del mes es el de su grilla (de los días de los meses vecinos también)', () => {
    const mes = rangoDe('mes', '2026-11-15', LA_PAZ)
    expect(mes.desde).toBe('2026-10-26T04:00:00.000Z')
    expect(mes.hasta).toBe('2026-12-07T04:00:00.000Z')
  })

  it('ninguna vista pasa de los 45 días de la base, en 24 meses', () => {
    for (let mes = 0; mes < 24; mes += 1) {
      const fecha = new Date(Date.UTC(2026, mes, 15)).toISOString().slice(0, 10)
      for (const zona of [LA_PAZ, MADRID]) {
        const { desde, hasta } = rangoDe('mes', fecha, zona)
        const dias = (Date.parse(hasta) - Date.parse(desde)) / 86_400_000
        expect(dias).toBeLessThanOrEqual(DIAS_MAXIMOS_DEL_RANGO)
        expect(diasDelRango('mes', fecha)).toBeLessThanOrEqual(42)
      }
    }
  })
})

describe('agruparPorDia', () => {
  it('ordena cada día por instante y, en empate, por id', () => {
    const items = [
      { id: 'c', en: '2026-11-10T15:00:00Z' },
      { id: 'b', en: '2026-11-10T14:00:00Z' },
      { id: 'a', en: '2026-11-10T14:00:00Z' },
      { id: 'd', en: '2026-11-12T14:00:00Z' },
    ]
    const porDia = agruparPorDia(items, (item) => item.en, LA_PAZ)
    expect(porDia.get('2026-11-10')?.map((item) => item.id)).toEqual(['a', 'b', 'c'])
    expect(porDia.get('2026-11-12')?.map((item) => item.id)).toEqual(['d'])
  })
})

describe('leerFecha, leerVista y leerClases', () => {
  it('leerFecha rechaza los días que no existen', () => {
    expect(leerFecha('2026-11-10', '2026-01-01')).toBe('2026-11-10')
    expect(leerFecha('2026-02-30', '2026-01-01')).toBe('2026-01-01')
    expect(leerFecha('2026-13-01', '2026-01-01')).toBe('2026-01-01')
    expect(leerFecha('mañana', '2026-01-01')).toBe('2026-01-01')
    expect(leerFecha(null, '2026-01-01')).toBe('2026-01-01')
    expect(leerFecha('2028-02-29', '2026-01-01')).toBe('2028-02-29')
  })

  it('leerVista deja pasar sólo las vistas', () => {
    for (const vista of VISTAS) {
      expect(leerVista(vista, 'mes')).toBe(vista)
    }
    expect(leerVista('año', 'dia')).toBe('dia')
    expect(leerVista(undefined, 'semana')).toBe('semana')
  })

  it('leerClases: vacío o ausente es todas; lo desconocido se ignora', () => {
    expect(leerClases(undefined)).toEqual(['evento', 'tarea', 'recordatorio', 'subasta'])
    expect(leerClases('')).toEqual(['evento', 'tarea', 'recordatorio', 'subasta'])
    expect(leerClases('tarea,evento')).toEqual(['evento', 'tarea'])
    expect(leerClases('tarea,xyz')).toEqual(['tarea'])
    expect(leerClases('xyz')).toEqual(['evento', 'tarea', 'recordatorio', 'subasta'])
  })
})

describe('moverFecha', () => {
  it('el mes salta al día 1 para no pasar de enero 31 a marzo', () => {
    expect(moverFecha('mes', '2026-01-31', 1)).toBe('2026-02-01')
    expect(moverFecha('mes', '2026-01-15', -1)).toBe('2025-12-01')
    expect(moverFecha('mes', '2026-12-10', 1)).toBe('2027-01-01')
  })

  it('la semana mueve 7 días y el día, uno', () => {
    expect(moverFecha('semana', '2026-11-10', 1)).toBe('2026-11-17')
    expect(moverFecha('semana', '2026-11-03', -1)).toBe('2026-10-27')
    expect(moverFecha('dia', '2026-12-31', 1)).toBe('2027-01-01')
  })
})

describe('los textos', () => {
  it('el título del rango sale en español, sin meses escritos en el código', () => {
    expect(tituloDelRango('mes', '2026-11-10')).toBe('noviembre de 2026')
    expect(tituloDelRango('semana', '2026-11-11')).toBe('9 – 15 nov 2026')
    expect(tituloDelRango('semana', '2026-10-28')).toBe('26 oct – 1 nov 2026')
    expect(tituloDelRango('semana', '2026-12-31')).toBe('28 dic 2026 – 3 ene 2027')
    expect(tituloDelRango('dia', '2026-11-10')).toBe('martes 10 nov 2026')
  })

  it('el encabezado y el número del día', () => {
    expect(encabezadoDelDia('2026-11-10')).toBe('martes 10 nov')
    expect(numeroDelDia('2026-11-05')).toBe('5')
  })
})
