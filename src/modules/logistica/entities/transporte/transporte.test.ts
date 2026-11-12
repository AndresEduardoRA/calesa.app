import { describe, expect, it } from 'vitest'
import {
  cambiosDeTransporte,
  campoDelRechazo,
  normalizarCampo,
  porCampoDe,
  transporteDesde,
  validarTransporte,
  valoresDeTransporte,
  VALORES_VACIOS_DE_TRANSPORTE as VACIO,
  type ValoresDeTransporte,
} from './transporte'

const con = (parte: Partial<ValoresDeTransporte>): ValoresDeTransporte => ({ ...VACIO, ...parte })

describe('normalizarCampo', () => {
  it('contenedor y booking: mayúsculas y sin ningún espacio, como la base', () => {
    expect(normalizarCampo('contenedor', ' ecmu 123 ')).toBe('ECMU123')
    expect(normalizarCampo('booking', '   ')).toBeNull()
    expect(normalizarCampo('notas', '  hola ')).toBe('hola')
  })
})

describe('validarTransporte', () => {
  it('acepta un contenedor en minúsculas y lo da por bueno al normalizar', () => {
    expect(validarTransporte(VACIO, con({ contenedor: 'ecmu123' }))).toEqual({})
  })

  it('rechaza un contenedor de 41 caracteres y un booking con #', () => {
    const e = validarTransporte(VACIO, con({ contenedor: 'A'.repeat(41), booking: 'BK#1' }))
    expect(e.contenedor).toBe(
      'El contenedor lleva sólo letras, dígitos, punto, barra o guion (hasta 40).',
    )
    expect(e.booking).toContain('El booking lleva sólo letras')
  })

  it('rechaza notas de 2.001 caracteres y acepta 2.000', () => {
    expect(validarTransporte(VACIO, con({ notas: 'x'.repeat(2001) })).notas).toBe(
      'Las notas llevan hasta 2.000 caracteres.',
    )
    expect(validarTransporte(VACIO, con({ notas: 'x'.repeat(2000) }))).toEqual({})
  })

  it('ETA y arribo antes del zarpe, cada uno junto a su campo', () => {
    const e = validarTransporte(
      VACIO,
      con({ zarpe: '2026-12-01', eta: '2026-11-01', arribo: '2026-11-30' }),
    )
    expect(e.eta).toBe('La ETA no puede ser antes del zarpe.')
    expect(e.arribo).toBe('El arribo no puede ser antes del zarpe.')
  })

  it('la ETA igual al zarpe vale y las fechas vacías valen', () => {
    expect(validarTransporte(VACIO, con({ zarpe: '2026-12-01', eta: '2026-12-01' }))).toEqual({})
    expect(validarTransporte(VACIO, con({ eta: '2026-12-01' }))).toEqual({})
  })

  it('no reclama lo que no se tocó: lo guardado se conserva aunque hoy no pasara', () => {
    const guardado = con({ contenedor: 'MAL#1', zarpe: '2026-12-01', eta: '2026-11-01' })
    expect(validarTransporte(guardado, { ...guardado })).toEqual({})
  })
})

describe('cambiosDeTransporte', () => {
  it('manda sólo lo tocado que difiere, con la clave de la base', () => {
    const antes = con({ contenedor: 'ECMU1', eta: '2026-12-10' })
    const c = cambiosDeTransporte(antes, { ...antes, eta: '2026-12-15', booking: 'bk 9' })
    expect(c).toEqual({ eta_el: '2026-12-15', booking: 'BK9' })
  })

  it('vaciar un dato manda null', () => {
    const antes = con({ contenedor: 'ECMU1', naviera: 'x' })
    expect(cambiosDeTransporte(antes, { ...antes, contenedor: '', naviera: '' })).toEqual({
      contenedor: null,
      naviera_id: null,
    })
  })

  it('devuelve null sin cambios, también si sólo cambió la forma (espacios, mayúsculas)', () => {
    const antes = con({ contenedor: 'ECMU1', notas: 'a' })
    expect(cambiosDeTransporte(antes, { ...antes, contenedor: 'ecmu1 ', notas: ' a' })).toBeNull()
    expect(cambiosDeTransporte(VACIO, VACIO)).toBeNull()
  })
})

describe('porCampoDe', () => {
  it('el hint nombra el campo del formulario', () => {
    expect(porCampoDe('eta_el', 'La ETA no puede ser antes del zarpe.')).toEqual({
      eta: 'La ETA no puede ser antes del zarpe.',
    })
    expect(porCampoDe('puerto_destino_id', 'm')).toEqual({ puertoDestino: 'm' })
    expect(
      porCampoDe('contenedor', 'La fase «Puerto» exige contenedor: no se puede vaciar.'),
    ).toEqual({ contenedor: 'La fase «Puerto» exige contenedor: no se puede vaciar.' })
  })

  it('un hint que no es un campo (transporte apagado) o ausente no da campo', () => {
    expect(porCampoDe('transporte', 'apagado')).toBeUndefined()
    expect(porCampoDe(null, 'x')).toBeUndefined()
    expect(campoDelRechazo('otra')).toBeNull()
  })
})

describe('transporteDesde y valoresDeTransporte', () => {
  const fila = {
    id: '00000000-0000-4000-8000-000000000001',
    naviera_id: null,
    puerto_origen_id: null,
    puerto_destino_id: null,
    contenedor: 'ECMU1',
    booking: null,
    zarpe_el: '2026-12-01',
    eta_el: null,
    arribo_el: null,
    notas: null,
    actualizado_en: '2026-11-12T10:00:00.000Z',
  }

  it('lee la fila y la vuelve valores del formulario; sin fila, todo vacío', () => {
    const t = transporteDesde(fila)
    expect(t?.contenedor).toBe('ECMU1')
    expect(valoresDeTransporte(t)).toEqual(con({ contenedor: 'ECMU1', zarpe: '2026-12-01' }))
    expect(valoresDeTransporte(null)).toEqual(VACIO)
  })

  it('rechaza una fila con otra forma', () => {
    expect(transporteDesde({ ...fila, zarpe_el: '12/01' })).toBeNull()
  })
})
