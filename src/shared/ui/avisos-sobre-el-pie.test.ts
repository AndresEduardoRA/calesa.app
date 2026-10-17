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
