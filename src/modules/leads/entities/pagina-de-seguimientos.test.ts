import { describe, expect, it } from 'vitest'
import {
  conLoPuestoMientras,
  cursorDeUnaFecha,
  ponerEnLaVentana,
  type VentanaDeSeguimientos,
} from './pagina-de-seguimientos'
import type { Seguimiento } from './seguimiento'
import { SIN_VEHICULO } from './vehiculo-de-nota'

// Un seguimiento por minuto, más recientes primero: `de(0)` es el más nuevo.
const de = (n: number, cambios: Partial<Seguimiento> = {}): Seguimiento => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  leadId: 'l',
  tipoId: 't',
  tipoNombre: 'Llamada',
  tipoIcono: null,
  titulo: `#${String(n)}`,
  detalleDoc: null,
  detalleTexto: null,
  visibilidad: 'privado',
  ocurridoEn: new Date(Date.UTC(2026, 9, 15, 12, 60 - n)).toISOString(),
  actualizadoEn: '2026-10-15T14:00:00+00:00',
  eliminado: false,
  autorId: 'yo',
  autorNombre: null,
  esMio: true,
  ...SIN_VEHICULO,
  ...cambios,
})

const rango = (desde: number, hasta: number) =>
  Array.from({ length: hasta - desde }, (_, i) => de(desde + i))
const ids = (lista: readonly Seguimiento[]) => lista.map((s) => s.titulo)

describe('ponerEnLaVentana', () => {
  const ventana: VentanaDeSeguimientos = { lista: rango(0, 10), hayMas: true, desde: null }

  it('uno nuevo va arriba; uno editado queda en su lugar con lo nuevo', () => {
    const nuevo = de(-1)
    expect(ids(ponerEnLaVentana(ventana, nuevo)).slice(0, 2)).toEqual(['#-1', '#0'])
    const editado = ponerEnLaVentana(ventana, de(4, { titulo: 'Cambiado' }))
    expect(editado).toHaveLength(10)
    expect(editado[4]?.titulo).toBe('Cambiado')
  })

  it('uno eliminado sale', () => {
    expect(ids(ponerEnLaVentana(ventana, de(4, { eliminado: true })))).not.toContain('#4')
  })

  it('uno más viejo que lo cargado, con más por cargar, no entra (correría el cursor)', () => {
    expect(ponerEnLaVentana(ventana, de(30))).toHaveLength(10)
    // Y si se movió de adentro hacia más atrás, sale de la ventana.
    const movido = de(4, { ocurridoEn: de(30).ocurridoEn })
    expect(ids(ponerEnLaVentana(ventana, movido))).not.toContain('#4')
    // Sin más por cargar, la lista es todo: entra al final.
    expect(ids(ponerEnLaVentana({ ...ventana, hayMas: false }, de(30))).at(-1)).toBe('#30')
  })

  it('en una ventana que empieza en una fecha, lo más nuevo que ella no entra', () => {
    const vieja: VentanaDeSeguimientos = { lista: rango(20, 30), hayMas: true, desde: '2026-10-15' }
    expect(ponerEnLaVentana(vieja, de(-1))).toHaveLength(10)
    expect(ponerEnLaVentana(vieja, de(25, { titulo: 'Cambiado' }))[5]?.titulo).toBe('Cambiado')
  })
})

describe('conLoPuestoMientras', () => {
  it('lo anotado, editado y eliminado mientras se releía no vuelve a su versión vieja', () => {
    const llego: VentanaDeSeguimientos = { lista: rango(0, 20), hayMas: true, desde: null }
    const lista = conLoPuestoMientras(llego, [
      de(-1, { titulo: 'Anotado' }),
      de(3, { titulo: 'Editado' }),
      de(5, { eliminado: true }),
      de(40, { titulo: 'Fuera' }),
    ])
    expect(lista[0]?.titulo).toBe('Anotado')
    expect(lista.find((s) => s.id === de(3).id)?.titulo).toBe('Editado')
    expect(lista.some((s) => s.id === de(5).id)).toBe(false)
    expect(lista.some((s) => s.titulo === 'Fuera')).toBe(false)
    expect(lista).toHaveLength(20)
  })

  it('sin nada puesto, es lo que llegó', () => {
    const llego: VentanaDeSeguimientos = { lista: rango(0, 3), hayMas: false, desde: null }
    expect(conLoPuestoMientras(llego, [])).toEqual(llego.lista)
  })
})

describe('cursorDeUnaFecha', () => {
  it('incluye todo ese día en la zona de la empresa: el inicio del día siguiente y el id más alto', () => {
    expect(cursorDeUnaFecha('2025-03-03', 'America/La_Paz')).toEqual({
      antesEn: '2025-03-04T04:00:00.000Z',
      antesId: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
    })
  })

  it('lo que no es una fecha no da cursor', () => {
    expect(cursorDeUnaFecha('', 'America/La_Paz')).toBeNull()
    expect(cursorDeUnaFecha('2025-13-40', 'America/La_Paz')).toBeNull()
    expect(cursorDeUnaFecha('ayer', 'America/La_Paz')).toBeNull()
  })
})
