// El corpus de paridad del contraste AA: lo que `contraste()` y `CONTRASTE_AA` de `src/shared/lib/color.ts` dicen de cada par, para que
// `_color_contraste()` de la base (`tonos.sql`) diga lo mismo. Y la semilla de tonos, calculada con los tokens de `design/tokens.css`.
import { CONTRASTE_AA, contraste } from '@/shared/lib/color'
import { COLOR_SUPERFICIE_OSCURA, COLOR_TINTA } from '@/shared/config/app'

export const SEMILLA = 20261024
export const TINTA_OSCURA = '#f2f4f8'

export type Par = { a: string; b: string; razon: number; aa: boolean }
export type TonoSembrado = {
  clave: string
  nombre: string
  claro: { fondo: string; borde: string; tinta: string }
  oscuro: { fondo: string; borde: string; tinta: string }
}

const hex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`
const canales = (h: string) =>
  [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16)) as [number, number, number]

// Un rgba sobre la superficie oscura, a hex (Math.round: el borde de «naranja» cae justo en medio).
function componer(rgb: [number, number, number], alfa: number): string {
  const [r, g, b] = canales(COLOR_SUPERFICIE_OSCURA)
  return hex(r + (rgb[0] - r) * alfa, g + (rgb[1] - g) * alfa, b + (rgb[2] - b) * alfa)
}

export const TONOS_SEMBRADOS: TonoSembrado[] = [
  {
    clave: 'amarillo',
    nombre: 'Amarillo',
    claro: { fondo: '#fff7d6', borde: '#e9d27a', tinta: COLOR_TINTA },
    oscuro: {
      fondo: componer([233, 210, 122], 0.16),
      borde: componer([233, 210, 122], 0.45),
      tinta: TINTA_OSCURA,
    },
  },
  {
    clave: 'verde',
    nombre: 'Verde',
    claro: { fondo: '#e6f6ee', borde: '#8fd3b0', tinta: COLOR_TINTA },
    oscuro: {
      fondo: componer([143, 211, 176], 0.14),
      borde: componer([143, 211, 176], 0.45),
      tinta: TINTA_OSCURA,
    },
  },
  {
    clave: 'naranja',
    nombre: 'Naranja',
    claro: { fondo: '#ffe9d6', borde: '#f0b27a', tinta: COLOR_TINTA },
    oscuro: {
      fondo: componer([240, 178, 122], 0.16),
      borde: componer([240, 178, 122], 0.5),
      tinta: TINTA_OSCURA,
    },
  },
]

function generador(semilla: number) {
  let s = semilla >>> 0
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32
}

function par(a: string, b: string): Par {
  const razon = contraste(a, b)
  return { a, b, razon, aa: razon >= CONTRASTE_AA }
}

export function generarCorpus(): { semilla: number; pares: Par[]; tonos: TonoSembrado[] } {
  const pares: Par[] = []
  for (const t of TONOS_SEMBRADOS) {
    pares.push(par(t.claro.tinta, t.claro.fondo), par(t.oscuro.tinta, t.oscuro.fondo))
  }
  pares.push(
    par('#000000', '#ffffff'),
    par('#ffffff', '#ffffff'),
    par('#3b5bdb', '#3b5bdb'),
    par('#3B5BDB', '#FFFFFF'),
    par('#767676', '#ffffff'),
    par('#777777', '#ffffff'),
    par('#1b2130', '#f6f7f9'),
    par('#f2f4f8', '#1d2330'),
  )
  const azar = generador(SEMILLA)
  const color = () => hex(azar() * 255, azar() * 255, azar() * 255)
  // Unos 40 pares a menos de 0,01 del umbral: un gris cerca de #777 con cada canal perturbado, contra blanco o contra un gris claro.
  const fondos = ['#ffffff', '#fafafa', '#f6f7f9']
  for (let intento = 0; pares.length < 60 && intento < 400000; intento++) {
    const base = 0x6a + Math.floor(azar() * 24)
    const c = hex(
      base + Math.floor(azar() * 7) - 3,
      base + Math.floor(azar() * 7) - 3,
      base + Math.floor(azar() * 7) - 3,
    )
    const f = fondos[intento % fondos.length] as string
    if (Math.abs(contraste(c, f) - CONTRASTE_AA) < 0.01) pares.push(par(c, f))
  }
  while (pares.length < 360) pares.push(par(color(), color()))
  return { semilla: SEMILLA, pares, tonos: TONOS_SEMBRADOS }
}

export const corpusComoTexto = () => `${JSON.stringify(generarCorpus(), null, 1)}\n`
