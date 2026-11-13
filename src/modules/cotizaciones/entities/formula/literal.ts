// Escribir un número como lo escribiría una persona en el texto de una fila (4.21-1, C8; docs/COTIZADOR.md › «El editor»): el valor que dejó el ⚙
// vuelve a su lugar en el texto. Puro, sin expresiones regulares. Es la inversa del léxico del compilador (`compilador-lexico.ts`): con `%`, el
// punto se corre dos lugares EN EL TEXTO (como el léxico, nunca `v * 100`, que daría otro doble), y compilar lo escrito da exactamente el mismo doble.
//
// Un negativo no se escribe, por decisión y no porque la gramática no pueda: el menos se pliega al literal (`-3` compila), pero en el tramo
// de `4` de `a-4` daría `a--3` y en `a*4`, `a*-3`, un texto que la persona no escribió. La fila queda «el texto ya no manda» y lo escribe ella.

// `5e-2` → «5%» (con porcentaje) sin perder cifras: los dígitos de `v` son los mismos y sólo cambia dónde va el punto. Nulo si el número
// escrito no cabe en un doble (el compilador lee primero el número SIN el %: `1e310%` es `numero_fuera_de_rango` aunque valga 1e308).
function conPorcentaje(v: number): string | null {
  const [mantisa = '0', exponente = '0'] = v.toExponential().split('e')
  const digitos = mantisa.replace('.', '')
  const e = Number(exponente) + 2
  const largo = digitos.length
  if (!Number.isFinite(Number(`${mantisa}e${String(e)}`))) return null
  if (e >= largo - 1 && e <= 20) return `${digitos}${'0'.repeat(e - (largo - 1))}`
  if (e >= 0 && e < largo - 1) return `${digitos.slice(0, e + 1)}.${digitos.slice(e + 1)}`
  if (e < 0 && e >= -6) return `0.${'0'.repeat(-e - 1)}${digitos}`
  return `${largo > 1 ? `${digitos.slice(0, 1)}.${digitos.slice(1)}` : digitos}e${String(e)}`
}

// Null si no se puede escribir: un negativo, un valor que no es finito o un porcentaje que desborda al escribirlo. `-0` pasa («0»): lo ve la verificación de quien recompila.
export function escribirLiteral(valor: number, porcentaje: boolean): string | null {
  if (!Number.isFinite(valor) || valor < 0) return null
  if (valor === 0) return porcentaje ? '0%' : '0'
  if (!porcentaje) return String(valor)
  const escrito = conPorcentaje(valor)
  return escrito === null ? null : `${escrito}%`
}
