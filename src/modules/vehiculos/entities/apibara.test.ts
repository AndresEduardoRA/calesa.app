import { describe, expect, it } from 'vitest'
import {
  CODIGOS_DE_APIBARA,
  HOSTS_DE_FOTO,
  MAXIMO_DE_LINEAS,
  esCodigoDeApibara,
  esFotoPermitida,
  falloDeApibara,
  interpretarLinea,
  lineasDe,
  mensajeDeApibara,
  pideRevisarIntegracion,
  sePuedeReintentar,
} from './apibara'

describe('interpretarLinea', () => {
  it('reconoce un enlace de Copart o de IAAI y su plataforma', () => {
    expect(interpretarLinea('https://www.copart.com/lot/58540656/clean-title-2024-ford')).toEqual({
      ok: true,
      texto: 'https://www.copart.com/lot/58540656/clean-title-2024-ford',
      entrada: {
        tipo: 'enlace',
        valor: 'https://www.copart.com/lot/58540656/clean-title-2024-ford',
        plataforma: 'copart',
      },
    })
    const iaai = interpretarLinea('  https://ca.iaai.com/VehicleDetail/45312823~US  ')
    expect(iaai.ok && iaai.entrada).toMatchObject({ tipo: 'enlace', plataforma: 'iaai' })
  })

  it('rechaza un enlace de otro sitio, también uno que sólo se le parece', () => {
    for (const enlace of [
      'https://www.example.com/lot/1',
      'https://copart.com.atacante.example/lot/1',
      'https://notcopart.com/lot/1',
      'ftp://www.copart.com/lot/1',
    ]) {
      const linea = interpretarLinea(enlace)
      expect(linea.ok, enlace).toBe(false)
    }
    const linea = interpretarLinea('https://www.example.com/lot/1')
    expect(!linea.ok && linea.motivo).toBe('Ese enlace no es de Copart ni de IAAI.')
  })

  it('reconoce un VIN (en mayúsculas) y un número de lote', () => {
    const vin = interpretarLinea('3fmcr9b64rre04601')
    expect(vin.ok && vin.entrada).toEqual({ tipo: 'vin', valor: '3FMCR9B64RRE04601' })
    const lote = interpretarLinea('58540656')
    expect(lote.ok && lote.entrada).toEqual({ tipo: 'lote', valor: '58540656' })
  })

  it('no toma por VIN algo con I, O o Q, ni por lote algo demasiado corto o largo', () => {
    expect(interpretarLinea('3FMCR9B64RRE0460I').ok).toBe(false)
    expect(interpretarLinea('1234').ok).toBe(false)
    expect(interpretarLinea('1234567890123').ok).toBe(false)
    expect(interpretarLinea('hola').ok).toBe(false)
    expect(interpretarLinea('').ok).toBe(false)
  })
})

describe('lineasDe', () => {
  it('parte por renglones, sin vacíos ni repetidos, y respeta el orden', () => {
    expect(
      lineasDe('58540656\r\n\n  3FMCR9B64RRE04601  \n58540656\nhttps://www.copart.com/lot/1\n'),
    ).toEqual(['58540656', '3FMCR9B64RRE04601', 'https://www.copart.com/lot/1'])
    expect(lineasDe('   \n  ')).toEqual([])
    expect(MAXIMO_DE_LINEAS).toBeGreaterThan(1)
  })
})

describe('errores de apibara', () => {
  it('cada código tiene un mensaje con tuteo, sin exclamaciones ni mayúsculas sostenidas', () => {
    for (const codigo of CODIGOS_DE_APIBARA) {
      const mensaje = mensajeDeApibara(codigo)
      expect(mensaje.length, codigo).toBeGreaterThan(10)
      expect(mensaje, codigo).not.toMatch(/[!¡]/)
      expect(mensaje, codigo).not.toMatch(/\b(vos|tenés|podés|usted)\b/i)
    }
  })

  it('la cuota agotada se dice claro y no invita a reintentar', () => {
    expect(mensajeDeApibara('cuota')).toContain('cuota')
    expect(sePuedeReintentar('cuota')).toBe(false)
    expect(sePuedeReintentar('tiempo')).toBe(true)
    expect(sePuedeReintentar('no_encontrado')).toBe(false)
  })

  it('con la clave rechazada o la cuota agotada se lleva a Integraciones', () => {
    expect(pideRevisarIntegracion('clave_invalida')).toBe(true)
    expect(pideRevisarIntegracion('cuota')).toBe(true)
    expect(pideRevisarIntegracion('no_encontrado')).toBe(false)
  })

  it('reconoce los códigos y arma el fallo con su mensaje', () => {
    expect(esCodigoDeApibara('cuota')).toBe(true)
    expect(esCodigoDeApibara('otro')).toBe(false)
    expect(esCodigoDeApibara(429)).toBe(false)
    expect(falloDeApibara('no_encontrado')).toEqual({
      ok: false,
      error: { codigo: 'no_encontrado', mensaje: mensajeDeApibara('no_encontrado') },
    })
  })
})

describe('esFotoPermitida', () => {
  it('sólo las direcciones de las dos plataformas, por https', () => {
    expect(HOSTS_DE_FOTO).toEqual(['cs.copart.com', 'vis.iaai.com'])
    expect(esFotoPermitida('https://cs.copart.com/v1/AUTH_svc.pdoc00001/lpp/0626/a_ful.jpg')).toBe(
      true,
    )
    expect(
      esFotoPermitida('https://vis.iaai.com/resizer?imageKeys=45810749~SID~I1&width=400'),
    ).toBe(true)
    expect(esFotoPermitida('http://cs.copart.com/a.jpg')).toBe(false)
    expect(esFotoPermitida('https://cs.copart.com.atacante.example/a.jpg')).toBe(false)
    expect(esFotoPermitida('https://apibara.tech/api/v1/vehicle-auction/usage')).toBe(false)
    expect(esFotoPermitida('no es una dirección')).toBe(false)
  })
})
