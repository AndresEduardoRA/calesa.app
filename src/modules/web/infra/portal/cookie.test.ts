// @vitest-environment node
import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { DURACION_DE_LA_SESION_S, type SesionDelPortal } from '../../entities/portal/sesion'
import { firmarSesion, leerSesion } from './cookie'

const SECRETO = 'un-secreto-de-prueba-de-al-menos-32-caracteres'
const AHORA = new Date('2026-11-12T14:00:00.000Z')
const SESION: SesionDelPortal = {
  lead_id: '0b6f8f8e-6f6a-4c1e-9d3e-0a6e2c5b7f10',
  otorgado_en: '2026-11-12T14:07:32.123456+00:00',
}
const BASE64URL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

// Arma un valor con la firma correcta para cualquier cuerpo: así se prueba la validación del cuerpo y no la firma.
function firmadoA(cuerpo: string, secreto = SECRETO): string {
  const c = Buffer.from(cuerpo).toString('base64url')
  return `${c}.${createHmac('sha256', secreto).update(c).digest('base64url')}`
}

describe('la cookie del portal', () => {
  it('K1 · ida y vuelta: lead_id y otorgado_en vuelven idénticos, con microsegundos y offset', () => {
    const valor = firmarSesion(SESION, SECRETO, AHORA)
    expect(leerSesion(valor, SECRETO, AHORA)).toEqual(SESION)
    expect(leerSesion(valor, SECRETO, AHORA)?.otorgado_en).toBe('2026-11-12T14:07:32.123456+00:00')
  })

  it('K2 · vence a los 7 días: un segundo antes vale, en el borde y después no', () => {
    const valor = firmarSesion(SESION, SECRETO, AHORA)
    const despues = (s: number) => new Date(AHORA.getTime() + s * 1000)
    expect(leerSesion(valor, SECRETO, despues(DURACION_DE_LA_SESION_S - 1))).toEqual(SESION)
    expect(leerSesion(valor, SECRETO, despues(DURACION_DE_LA_SESION_S))).toBeNull()
    expect(leerSesion(valor, SECRETO, despues(DURACION_DE_LA_SESION_S + 3600))).toBeNull()
  })

  it('K3 · cambiar cualquier carácter del valor la invalida (incluido el último de la firma)', () => {
    const valor = firmarSesion(SESION, SECRETO, AHORA)
    for (let i = 0; i < valor.length; i++) {
      const actual = valor[i]
      if (actual === '.') continue
      for (const otro of BASE64URL) {
        if (otro === actual) continue
        const cambiado = valor.slice(0, i) + otro + valor.slice(i + 1)
        expect(leerSesion(cambiado, SECRETO, AHORA), `posición ${i}: ${otro}`).toBeNull()
      }
    }
  })

  it('K4 · otro secreto no la lee; un secreto corto no firma ni lee', () => {
    const valor = firmarSesion(SESION, SECRETO, AHORA)
    expect(leerSesion(valor, `${SECRETO}-otro`, AHORA)).toBeNull()
    expect(() => firmarSesion(SESION, 'corto', AHORA)).toThrow()
    expect(leerSesion(valor, 'corto', AHORA)).toBeNull()
  })

  it('K5 · lo que no es una cookie bien formada da null', () => {
    const e = Math.floor(AHORA.getTime() / 1000) + 3600
    const valor = firmarSesion(SESION, SECRETO, AHORA)
    const [cuerpo = '', firma = ''] = valor.split('.')
    const basura: (string | null | undefined)[] = [
      undefined,
      null,
      '',
      'sinpunto',
      `${valor}.extra`,
      `.${firma}`,
      `${cuerpo}.`,
      `${cuerpo}.${firma}${'A'.repeat(1100)}`,
      // Mismo largo en caracteres, no ASCII: no puede lanzar.
      `${cuerpo}.é${firma.slice(1)}`,
      `${cuerpo} .${firma}`,
      firmadoA('{no es json'),
      firmadoA(JSON.stringify({ l: 'no-es-guid', o: SESION.otorgado_en, e })),
      firmadoA(JSON.stringify({ l: SESION.lead_id, o: 'ayer', e })),
      firmadoA(JSON.stringify({ l: SESION.lead_id, o: SESION.otorgado_en })),
      firmadoA(JSON.stringify({ l: SESION.lead_id, o: SESION.otorgado_en, e, x: 1 })),
      firmadoA(JSON.stringify([SESION.lead_id, SESION.otorgado_en, e])),
    ]
    for (const b of basura) {
      expect(leerSesion(b, SECRETO, AHORA), String(b).slice(0, 40)).toBeNull()
    }
    // El ayudante firma igual que la cookie: un cuerpo válido armado a mano sí se lee.
    const aMano = firmadoA(JSON.stringify({ l: SESION.lead_id, o: SESION.otorgado_en, e }))
    expect(leerSesion(aMano, SECRETO, AHORA)).toEqual(SESION)
  })
})
