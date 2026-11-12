import { describe, expect, it } from 'vitest'
import { agruparTablero, tableroDesde, type FilaDelTablero } from './tablero'

const FILA = {
  usuario_id: '11111111-1111-4111-8111-111111111111',
  nombre: 'Vera',
  en_la_rueda: true,
  cuenta_activa: true,
  falta_whatsapp: false,
  disponible: true,
  prioridad: 0,
  orden: 0,
  max_abiertas: null,
  cupo: 3,
  abiertas: 1,
  asignadas_total: 3,
  contactadas_total: 2,
  vencidas_total: 1,
  tasa_contacto_pct: 66.7,
  ultima_asignacion_en: '2026-11-12T16:06:19.123456+00:00',
}

function fila(nombre: string, enLaRueda: boolean, cuentaActiva: boolean): FilaDelTablero {
  const leida = tableroDesde({ filas: [FILA], hay_mas: false })?.filas[0]
  if (!leida) {
    throw new Error('la fila base no se lee')
  }
  return { ...leida, nombre, enLaRueda, cuentaActiva }
}

describe('agruparTablero: en qué grupo cae cada habilitada', () => {
  it('T1 · en la rueda, aparte por rol o aparte por cuenta; una fila cae en un solo grupo', () => {
    const enLaRueda = fila('En la rueda', true, true)
    const sinRol = fila('Sin rol', false, true)
    const bloqueada = fila('Bloqueada', false, false)
    const bloqueadaConRol = fila('Bloqueada con rol', true, false)
    const grupos = agruparTablero([enLaRueda, sinRol, bloqueada, bloqueadaConRol])
    expect(grupos.rueda).toEqual([enLaRueda])
    expect(grupos.porRol).toEqual([sinRol])
    expect(grupos.porCuenta).toEqual([bloqueada, bloqueadaConRol])
  })
})

describe('tableroDesde', () => {
  it('lee la respuesta de la RPC', () => {
    expect(tableroDesde({ filas: [FILA], hay_mas: true })).toEqual({
      filas: [
        {
          usuarioId: FILA.usuario_id,
          nombre: 'Vera',
          enLaRueda: true,
          cuentaActiva: true,
          faltaWhatsapp: false,
          disponible: true,
          prioridad: 0,
          orden: 0,
          maxAbiertas: null,
          cupo: 3,
          abiertas: 1,
          asignadasTotal: 3,
          contactadasTotal: 2,
          vencidasTotal: 1,
          tasaContactoPct: 66.7,
          ultimaAsignacionEn: FILA.ultima_asignacion_en,
        },
      ],
      hayMas: true,
    })
  })

  it('T2 · una clave que falta o un id que no es guid → null', () => {
    const { en_la_rueda: _quitada, ...sinRueda } = FILA
    expect(tableroDesde({ filas: [sinRueda], hay_mas: false })).toBeNull()
    expect(tableroDesde({ filas: [{ ...FILA, usuario_id: 'vera' }], hay_mas: false })).toBeNull()
    expect(tableroDesde(null)).toBeNull()
  })
})
