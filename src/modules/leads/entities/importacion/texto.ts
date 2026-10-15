// Cómo se comparan y se limpian los textos de un archivo importado. Sin I/O.

// Para emparejar columnas y opciones: sin tildes, sin mayúsculas y con los signos como espacios.
export function comparable(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

// La exportación antepone un apóstrofo a una celda que empieza por un carácter de fórmula (`=`, `+`,
// `-`, `@`, tabulación, retorno): al volver a importar, ese apóstrofo no es parte del dato.
const APOSTROFO_DE_FORMULA = /^'(?=[=+\-@\t\r])/

export function sinApostrofoDeFormula(texto: string): string {
  return texto.replace(APOSTROFO_DE_FORMULA, '')
}

// Un número que Excel convirtió a notación científica (`5.917E+10`): el teléfono se perdió.
const NOTACION_CIENTIFICA = /^[+-]?\d+([.,]\d+)?e[+-]?\d+$/i

export function esNotacionCientifica(texto: string): boolean {
  return NOTACION_CIENTIFICA.test(texto.trim())
}
