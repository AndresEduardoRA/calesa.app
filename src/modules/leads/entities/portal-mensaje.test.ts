import { describe, expect, it } from 'vitest'
import {
  MENSAJE_DE_FABRICA,
  aplicarMensaje,
  avisoDelPortalAlTransferir,
  codigoDictado,
  nombreDeQuien,
  textoParaWhatsApp,
  validarMensajeDelPortal,
} from './portal-mensaje'

describe('codigoDictado', () => {
  it('cada símbolo con su nombre, y el guion', () => {
    expect(codigoDictado('MII-4F2K9')).toBe('eme, i, i, guion, cuatro, efe, dos, ka, nueve')
  })
  it('be y ve se distinguen; en minúsculas también', () => {
    expect(codigoDictado('bv-w')).toBe('be larga, ve corta, guion, doble ve')
  })
  it('todo el alfabeto del código tiene nombre', () => {
    for (const simbolo of '23456789ABCDEFGHJKLMNPQRSTUVWXYZIO') {
      expect(codigoDictado(simbolo)).not.toBe(simbolo)
    }
  })
})

describe('textoParaWhatsApp', () => {
  const datos = {
    cliente: 'Ana Rojas',
    empresa: 'Importadora Sol',
    codigo: 'IMP-4F2K9',
    clave: 'K7M2P9QX3A',
    plantilla: null,
  }
  it('con la dirección configurada lleva el enlace', () => {
    expect(textoParaWhatsApp({ ...datos, direccion: 'https://sol.bo' })).toBe(
      [
        'Hola, Ana Rojas.',
        'Ya tienes acceso a tu seguimiento en Importadora Sol.',
        'Para ver cómo va tu compra, entra en https://sol.bo con estos datos:',
        'Código: IMP-4F2K9',
        'Clave temporal: K7M2P9QX3A',
        'Al entrar te pediremos que cambies la clave.',
      ].join('\n'),
    )
  })
  it('sin dirección no inventa una: nombra la web de la empresa', () => {
    const texto = textoParaWhatsApp({ ...datos, direccion: null })
    expect(texto).toContain('entra en la web de Importadora Sol con estos datos:')
    expect(texto).not.toMatch(/https?:/)
  })
  it('un lead sin nombre saluda sin nombre', () => {
    expect(textoParaWhatsApp({ ...datos, cliente: '  ', direccion: null })).toMatch(/^Hola\.\n/)
  })
})

describe('textoParaWhatsApp con el mensaje de la empresa', () => {
  const datos = {
    cliente: 'Ana Rojas',
    empresa: 'Importadora Sol',
    codigo: 'IMP-4F2K9',
    clave: 'K7M2P9QX3A',
    direccion: null,
  }
  it('aplica la plantilla en vez del de fábrica', () => {
    expect(
      textoParaWhatsApp({
        ...datos,
        plantilla: 'Hola {cliente}: {codigo} / {clave} en {direccion}.',
      }),
    ).toBe('Hola Ana Rojas: IMP-4F2K9 / K7M2P9QX3A en la web de Importadora Sol.')
  })
  it('el de fábrica con variables, aplicado, es el mismo texto que sin plantilla (con un cliente con nombre)', () => {
    for (const direccion of [null, 'https://sol.bo']) {
      expect(aplicarMensaje(MENSAJE_DE_FABRICA, { ...datos, direccion })).toBe(
        textoParaWhatsApp({ ...datos, direccion, plantilla: null }),
      )
    }
  })
})

describe('aplicarMensaje', () => {
  const datos = {
    cliente: '  Ana Rojas ',
    empresa: 'Importadora Sol',
    codigo: 'IMP-4F2K9',
    clave: 'K7M2P9QX3A',
    direccion: 'https://sol.bo',
  }
  it('cada variable por su valor, también repetida', () => {
    expect(aplicarMensaje('{cliente}|{empresa}|{codigo}|{clave}|{direccion}|{codigo}', datos)).toBe(
      'Ana Rojas|Importadora Sol|IMP-4F2K9|K7M2P9QX3A|https://sol.bo|IMP-4F2K9',
    )
  })
  it('sin dirección, {direccion} nombra la web de la empresa', () => {
    expect(aplicarMensaje('en {direccion}', { ...datos, direccion: null })).toBe(
      'en la web de Importadora Sol',
    )
  })
  it('una sola pasada: un nombre con {clave} o $& sale literal', () => {
    expect(aplicarMensaje('{cliente} {clave}', { ...datos, cliente: '{clave}' })).toBe(
      '{clave} K7M2P9QX3A',
    )
    expect(aplicarMensaje('Hola {cliente}', { ...datos, cliente: "$& $' $1" })).toBe(
      "Hola $& $' $1",
    )
  })
  it('un cliente sin nombre queda vacío; lo que no es variable queda literal', () => {
    expect(aplicarMensaje('Hola {cliente}. {otra}', { ...datos, cliente: '   ' })).toBe(
      'Hola . {otra}',
    )
  })
})

describe('validarMensajeDelPortal, espejo de _portal_mensaje_normalizar', () => {
  const BUENO = 'Entra con {codigo} y {clave}.'
  const NO_ES = (x: string) =>
    `{${x}} no es una variable del mensaje. Usa {cliente}, {empresa}, {codigo}, {clave} o {direccion}.`
  const FALTA =
    'El mensaje tiene que llevar {codigo} y {clave}: sin ellos el cliente no puede entrar.'
  const LARGO = 'El mensaje lleva hasta 1000 caracteres.'

  it('en blanco es nulo: vuelve el de fábrica', () => {
    expect(validarMensajeDelPortal('')).toEqual({ ok: true, texto: null })
    expect(validarMensajeDelPortal(' \n\t\r\n ')).toEqual({ ok: true, texto: null })
  })
  it('\\r\\n pasa a \\n y se recortan los bordes; un espacio duro en el borde se queda (como btrim)', () => {
    expect(validarMensajeDelPortal(`  \r\nHola\r\n${BUENO}\n\t`)).toEqual({
      ok: true,
      texto: `Hola\n${BUENO}`,
    })
    expect(validarMensajeDelPortal(`\u00a0${BUENO}`)).toEqual({ ok: true, texto: `\u00a0${BUENO}` })
  })
  it('el largo se cuenta en caracteres, no en unidades de UTF-16', () => {
    const relleno = (n: number) => '😀'.repeat(n - BUENO.length)
    expect(validarMensajeDelPortal(BUENO + relleno(1000))).toMatchObject({ ok: true })
    expect(validarMensajeDelPortal(BUENO + relleno(1001))).toEqual({ ok: false, motivo: LARGO })
  })
  it('toda {…} que no es una variable se rechaza, con su nombre', () => {
    for (const x of ['telefono', 'Codigo', ' codigo ', '', 'co\ndigo', 'código']) {
      expect(validarMensajeDelPortal(`${BUENO} {${x}}`)).toEqual({ ok: false, motivo: NO_ES(x) })
    }
  })
  it('sin {codigo} o sin {clave} no pasa', () => {
    expect(validarMensajeDelPortal('Tu clave: {clave}')).toEqual({ ok: false, motivo: FALTA })
    expect(validarMensajeDelPortal('Tu código: {codigo}')).toEqual({ ok: false, motivo: FALTA })
  })
  it('el orden: el largo antes que la variable, la variable antes que la que falta', () => {
    expect(validarMensajeDelPortal(`{x}${'a'.repeat(1001)}`)).toEqual({ ok: false, motivo: LARGO })
    expect(validarMensajeDelPortal('{x}')).toEqual({ ok: false, motivo: NO_ES('x') })
  })
  it('el de fábrica pasa', () => {
    expect(validarMensajeDelPortal(MENSAJE_DE_FABRICA)).toEqual({
      ok: true,
      texto: MENSAJE_DE_FABRICA,
    })
  })
})

describe('nombreDeQuien', () => {
  it('el nombre; si se dio de baja, lo dice; si la cuenta ya no existe, sin nombre', () => {
    expect(nombreDeQuien({ nombre: 'Rosa Mamani', deBaja: false })).toBe('Rosa Mamani')
    expect(nombreDeQuien({ nombre: 'Rosa Mamani', deBaja: true })).toBe(
      'Rosa Mamani (ya no está en el equipo)',
    )
    expect(nombreDeQuien(null)).toBe('alguien que ya no está en el equipo')
  })
})

describe('avisoDelPortalAlTransferir', () => {
  it('nombra a quien lo recibe en cuanto se elige', () => {
    expect(avisoDelPortalAlTransferir('Ana Rojas', null)).toBe(
      'Ana Rojas tiene acceso al portal: verá como su asesor a quien se lo pases.',
    )
    expect(avisoDelPortalAlTransferir('Ana Rojas', 'Juan Pérez')).toBe(
      'Ana Rojas tiene acceso al portal: desde ahora verá a Juan Pérez como su asesor.',
    )
  })
})
