// `redondear(x, n)` es `round(x::float8::numeric, n)::float8` de Postgres, bit a bit:
// 1. el cast a numeric toma 15 cifras significativas (`%.15g` de glibc: mitad al par sobre el valor exacto del doble);
// 2. `round(numeric, n)` redondea mitad lejos de cero, como ROUND del Excel;
// 3. el `::float8` lee el decimal con strtod, como `Number(texto)`.
// Así 2,675 da 2,68 aunque en binario sea 2,67499…, y −2,5 da −3. `toExponential(14)` no sirve para el paso 1: en un
// empate exacto redondea para arriba y glibc al par (100000000,0078125 con n = 6 da …813 contra …812).

const CIFRAS = 15
const MINIMO = 10n ** 14n
const TOPE = 10n ** 15n

export function redondear(x: number, n: number): number {
  if (x === 0 || !Number.isFinite(x)) return x === 0 ? 0 : x
  const { digitos, exponente } = quinceCifras(Math.abs(x))
  const sobran = -exponente - n
  const r =
    sobran > 0
      ? Number(`${mitadLejosDeCero(digitos, sobran)}e${-n}`)
      : Number(`${digitos}e${exponente}`)
  if (r === 0) return 0
  return x < 0 ? -r : r
}

// Corta las últimas `sobran` cifras; la mitad sube (sobre el valor absoluto: lejos de cero).
function mitadLejosDeCero(digitos: bigint, sobran: number): bigint {
  const divisor = 10n ** BigInt(sobran)
  const q = digitos / divisor
  return (digitos % divisor) * 2n >= divisor ? q + 1n : q
}

// |x| = digitos × 10^exponente, con 15 cifras y mitad al par sobre el valor exacto.
function quinceCifras(a: number): { digitos: bigint; exponente: number } {
  const { num, den } = exacto(a)
  let e = Math.floor(Math.log10(a)) - (CIFRAS - 1)
  let q = alPar(num, den, e)
  if (q >= TOPE) {
    e += 1
    q = alPar(num, den, e)
  } else if (q < MINIMO) {
    e -= 1
    q = alPar(num, den, e)
  }
  // Redondear puede cruzar la potencia de 10 (999,99999999999999 → 1000,00000000000).
  if (q >= TOPE) {
    e += 1
    q = alPar(num, den, e)
  }
  return { digitos: q, exponente: e }
}

// num / den × 10^(−e), redondeado al entero más cercano y, en el empate, al par.
function alPar(num: bigint, den: bigint, e: number): bigint {
  const [n, d] = e >= 0 ? [num, den * 10n ** BigInt(e)] : [num * 10n ** BigInt(-e), den]
  const q = n / d
  const resto = (n % d) * 2n
  return resto > d || (resto === d && q % 2n === 1n) ? q + 1n : q
}

// El valor exacto de un doble positivo como fracción: la mantisa por una potencia de 2.
function exacto(a: number): { num: bigint; den: bigint } {
  const vista = new DataView(new ArrayBuffer(8))
  vista.setFloat64(0, a)
  const bits = vista.getBigUint64(0)
  const exponente = Number((bits >> 52n) & 0x7ffn)
  const fraccion = bits & 0xfffffffffffffn
  const mantisa = exponente === 0 ? fraccion : fraccion | (1n << 52n)
  const e2 = (exponente === 0 ? 1 : exponente) - 1075
  return e2 >= 0
    ? { num: mantisa << BigInt(e2), den: 1n }
    : { num: mantisa, den: 1n << BigInt(-e2) }
}
