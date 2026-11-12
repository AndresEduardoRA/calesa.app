import { describe, expect, it } from 'vitest'
import { cambiosDePolitica } from './politica'

describe('cambiosDePolitica', () => {
  const edicion = {
    colaActiva: true,
    ttlContactoMinutos: 30,
    diasPegajoso: 14,
    maxAbiertasDefault: 5,
    maxIntentos: 3,
  }

  it('manda exactamente las cinco claves de la cola', () => {
    expect(cambiosDePolitica(edicion)).toEqual({
      cola_activa: true,
      ttl_contacto_minutos: 30,
      dias_pegajoso: 14,
      max_abiertas_default: 5,
      max_intentos: 3,
    })
  })

  it('no manda ninguna clave del sitio aunque la entrada traiga de más', () => {
    const conDeMas = { ...edicion, whatsappRespaldo: '+59170000000', nombreSitio: 'x' }
    const cambios = cambiosDePolitica(conDeMas)
    expect(Object.keys(cambios).sort()).toEqual([
      'cola_activa',
      'dias_pegajoso',
      'max_abiertas_default',
      'max_intentos',
      'ttl_contacto_minutos',
    ])
    expect(cambios).not.toHaveProperty('whatsapp_respaldo')
  })
})
