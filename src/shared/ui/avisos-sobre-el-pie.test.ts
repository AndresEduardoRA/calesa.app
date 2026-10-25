import { describe, expect, it } from 'vitest'
import { avisosAbajo, type CajaDeUnPie } from './avisos-sobre-el-pie'

const ESCRITORIO = { ancho: 1280, alto: 800 }
const CELULAR = { ancho: 412, alto: 915 }

// El pie de un panel pegado al borde de abajo, a la derecha (448 px de ancho), de `alto` px.
const pieDelPanel = (alto: number, ventana = ESCRITORIO): CajaDeUnPie => ({
  top: ventana.alto - alto,
  bottom: ventana.alto,
  left: ventana.ancho - 448,
  right: ventana.ancho,
})

describe('avisosAbajo', () => {
  it('sin ningún pie a la vista, los avisos van donde siempre', () => {
    expect(avisosAbajo(ESCRITORIO, [])).toBeNull()
  })

  it('sube los avisos lo que mide el pie y deja un margen de 16 px', () => {
    expect(avisosAbajo(ESCRITORIO, [pieDelPanel(72)])).toBe(88)
  })

  it('con el texto al 200 % el pie es más alto y los avisos suben más', () => {
    expect(avisosAbajo(ESCRITORIO, [pieDelPanel(160)])).toBe(176)
  })

  it('en el celular, un pie de lado a lado también cuenta', () => {
    expect(avisosAbajo(CELULAR, [pieDelPanel(76, CELULAR)])).toBe(92)
  })

  it('con dos pies que se solapan manda el que está más arriba', () => {
    expect(avisosAbajo(ESCRITORIO, [pieDelPanel(72), pieDelPanel(120)])).toBe(136)
  })

  it('un modal centrado en escritorio no se solapa con los avisos: no se mueven', () => {
    const modal = { top: 500, bottom: 560, left: 350, right: 850 }
    expect(avisosAbajo(ESCRITORIO, [modal])).toBeNull()
  })

  it('un pie a media altura del celular no está en la franja de abajo: no se mueven', () => {
    const modal = { top: 400, bottom: 470, left: 16, right: 396 }
    expect(avisosAbajo(CELULAR, [modal])).toBeNull()
  })

  it('con el texto al 200 % el aviso es más ancho: un pie que antes quedaba fuera de su columna ahora la toca', () => {
    // A 1280 px la columna es de 356 px (de 900 a 1256); al 200 % (1 rem = 32 px) es de 712 px (de 544 a 1256).
    const pieAlCentro = { top: 700, bottom: 800, left: 400, right: 760 }
    expect(avisosAbajo(ESCRITORIO, [pieAlCentro])).toBeNull()
    expect(avisosAbajo({ ...ESCRITORIO, rem: 32 }, [pieAlCentro])).toBe(116)
  })

  it('el aviso no pasa de la pantalla menos 1 rem por lado', () => {
    const ancha = { ancho: 700, alto: 800, rem: 32 }
    // 700 − 64 = 636 de ancho: de 40 a 676.
    const pie = { top: 700, bottom: 800, left: 20, right: 60 }
    expect(avisosAbajo(ancha, [pie])).toBe(116)
    expect(avisosAbajo(ancha, [{ ...pie, left: 5, right: 39 }])).toBeNull()
  })

  it('con la barra lateral a la vista los avisos van sobre ella: el pie de un panel a la derecha no los toca', () => {
    const conBarra = { ...ESCRITORIO, conBarra: true }
    expect(avisosAbajo(conBarra, [pieDelPanel(72)])).toBeNull()
    // La columna va de 24 a 24 + 13,5 rem (240 px al 100 %; 456 al 200 %): un pie que llega hasta ahí sí la toca.
    const pieAncho = { top: 700, bottom: 800, left: 200, right: 700 }
    expect(avisosAbajo(conBarra, [pieAncho])).toBe(116)
    expect(avisosAbajo({ ...conBarra, rem: 32 }, [{ ...pieAncho, left: 440 }])).toBe(116)
    expect(avisosAbajo({ ...conBarra, rem: 32 }, [{ ...pieAncho, left: 460 }])).toBeNull()
  })

  it('por debajo de 768 px no hay barra lateral: la columna es la de siempre', () => {
    const angosta = { ancho: 700, alto: 800, conBarra: true }
    expect(avisosAbajo(angosta, [{ top: 700, bottom: 800, left: 400, right: 700 }])).toBe(116)
  })

  it('un pie fuera de la pantalla (el panel se desplaza) no cuenta', () => {
    const afuera = { top: 900, bottom: 972, left: 832, right: 1280 }
    expect(avisosAbajo(ESCRITORIO, [afuera])).toBeNull()
    expect(avisosAbajo(ESCRITORIO, [afuera, pieDelPanel(72)])).toBe(88)
  })

  it('una medida que no es un número no cuenta', () => {
    expect(
      avisosAbajo(ESCRITORIO, [{ top: Number.NaN, bottom: 800, left: 0, right: 1280 }]),
    ).toBeNull()
  })
})
