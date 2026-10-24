// Las funciones del texto (docs/COTIZADOR.md › «Fórmulas como texto (4.07)»): sólo operaciones que el grafo ya tiene. Al cerrarse
// el paréntesis se revisa cada argumento contra lo que su posición pide y se arma la operación.
import {
  error,
  errorEn,
  type Arbol,
  type Calculo,
  type Campos,
  type ErrorCrudo,
  type EspecDeFuncion,
  type Marco,
  type OpDeArbol,
  type Referencia,
} from './compilador-arbol'
import type { Token } from './compilador-lexico'
import { buscar, esta, recorrer } from './medidor'
import type { Nombres } from './compilador-nombres'
import { formatoDe } from './nodos'

export const FUNCIONES: ReadonlyMap<string, EspecDeFuncion> = new Map(
  (
    [
      { nombre: 'SUMA', args: ['grupo'] },
      { nombre: 'SI', args: ['bandera', 'valor'] },
      { nombre: 'REDONDEAR', args: ['valor', 'entero'] },
      { nombre: 'PORCENTAJE_DE', args: ['valor', 'pct'] },
      { nombre: 'DEPRECIAR', args: ['valor', 'clave', 'nodo', 'clave'] },
    ] satisfies EspecDeFuncion[]
  ).map((f) => [f.nombre, f] as const),
)

// Cuenta términos de más; false si pasa el tope.
export type Contar = (n: number) => boolean

const NECESITA: Record<string, string> = {
  grupo: 'el nombre de un grupo',
  bandera: 'el nombre de una bandera',
  nodo: 'el nombre de un nodo',
  clave: 'un id en minúsculas (letras, números y _)',
  entero: 'un número entero de 0 a 6',
  pct: 'un porcentaje: un nodo con formato pct o un número como 4%',
}

// El patrón de un id (`esquemaId`), sin regex: una letra minúscula y hasta 40 más entre a-z, 0-9 y _.
function esIdValido(s: string): boolean {
  if (s.length < 1 || s.length > 41) return false
  for (let i = 0; i < s.length; i += 1) {
    const c = s.charCodeAt(i)
    const minuscula = c >= 97 && c <= 122
    if (i === 0 ? !minuscula : !(minuscula || c === 95 || (c >= 48 && c <= 57))) return false
  }
  return true
}

const invalido = (a: Arbol, tipo: string) =>
  errorEn(a, 'argumento_invalido', { esperado: NECESITA[tipo] })

type Rango = { desde: number; hasta: number }

const calculo = (
  op: OpDeArbol,
  r: Rango,
  hijos: Arbol[],
  extra: { campos?: Campos; pct?: Arbol } = {},
): Calculo => ({
  k: 'calc',
  op,
  hijos,
  campos: extra.campos ?? {},
  deFuncion: true,
  paren: false,
  desde: r.desde,
  hasta: r.hasta,
  ...(extra.pct === undefined ? {} : { pct: extra.pct }),
})

function cerrarSuma(
  arg: Arbol,
  rango: { desde: number; hasta: number },
  nombres: Nombres,
  contar: Contar,
) {
  if (arg.k !== 'clave') return invalido(arg, 'grupo')
  const g = arg.texto
  const dato = { nombre: g }
  if (!esta(nombres.grupos, g, nombres.m)) return errorEn(arg, 'grupo_inexistente', dato)
  if (nombres.destino.grupo === g) return errorEn(arg, 'ciclo', { nombre: nombres.destino.id })
  if (esta(nombres.conMiembrosPosteriores, g, nombres.m))
    return errorEn(arg, 'referencia_hacia_adelante', dato)
  const miembros = buscar(nombres.miembros, g, nombres.m) ?? []
  if (miembros.length === 0) return errorEn(arg, 'grupo_vacio', dato)
  if (!contar(miembros.length)) return errorEn(arg, 'demasiados_terminos')
  const hijos: Referencia[] = []
  for (const nodo of recorrer(miembros, nombres.m)) {
    hijos.push({ k: 'ref', nodo, paren: false, desde: arg.desde, hasta: arg.hasta })
  }
  return calculo('suma', rango, hijos)
}

function cerrarSi(args: Arbol[], rango: { desde: number; hasta: number }) {
  const [b, x] = args
  if (b === undefined || x === undefined) return error('falta_un_valor', rango.desde, rango.hasta)
  if (b.k !== 'ref') return invalido(b, 'bandera')
  if (b.nodo.tipo !== 'bandera') return errorEn(b, 'no_es_bandera', { nombre: b.nodo.id })
  return calculo('si', rango, [x], { campos: { condicion: b.nodo.id } })
}

function cerrarRedondear(args: Arbol[], rango: { desde: number; hasta: number }) {
  const [x, n] = args
  if (x === undefined || n === undefined) return error('falta_un_valor', rango.desde, rango.hasta)
  const entero = n.k === 'num' && !n.pct && !n.negativo && Number.isInteger(n.valor) && n.valor <= 6
  if (n.k !== 'num' || !entero) return invalido(n, 'entero')
  return calculo('redondear', rango, [x], { campos: { n: n.valor } })
}

function cerrarPorcentaje(args: Arbol[], rango: { desde: number; hasta: number }, contar: Contar) {
  const [x, p] = args
  if (x === undefined || p === undefined) return error('falta_un_valor', rango.desde, rango.hasta)
  if (p.k === 'ref') {
    if (formatoDe(p.nodo) !== 'pct') return invalido(p, 'pct')
  } else if (p.k === 'num') p.comoPct = true
  else return invalido(p, 'pct')
  // «a+b+c» sin paréntesis va directo a `de`: Σde × pct es lo mismo que (a+b+c) × pct.
  const cadena = x.k === 'calc' && x.op === 'suma' && !x.paren
  if (!contar(1)) return errorEn(x, 'demasiados_terminos')
  return calculo('porcentaje_de', rango, cadena ? x.hijos : [x], { pct: p })
}

function cerrarDepreciar(args: Arbol[], rango: { desde: number; hasta: number }) {
  const [x, t, s, c] = args
  if (x === undefined || t === undefined || s === undefined || c === undefined) {
    return error('falta_un_valor', rango.desde, rango.hasta)
  }
  if (t.k !== 'clave' || !esIdValido(t.texto)) return invalido(t, 'clave')
  if (s.k !== 'ref') return invalido(s, 'nodo')
  if (c.k !== 'clave' || !esIdValido(c.texto)) return invalido(c, 'clave')
  return calculo('depreciar', rango, [x], {
    campos: { tabla: t.texto, sobre: s.nodo.id, columna: c.texto },
  })
}

// Se cerró el paréntesis de una función: sus argumentos ya están en `marco.args`.
export function cerrarFuncion(
  marco: Marco,
  cierre: Token,
  nombres: Nombres,
  contar: Contar,
): Arbol | ErrorCrudo {
  const spec = marco.spec
  const nombreRango = marco.nombreRango
  if (spec === undefined || nombreRango === undefined) return error('funcion_desconocida', 0, 0)
  if (marco.args.length !== spec.args.length) {
    return errorEn(nombreRango, 'cantidad_de_argumentos', {
      nombre: spec.nombre,
      cantidad: spec.args.length,
    })
  }
  const rango = { desde: nombreRango.desde, hasta: cierre.hasta }
  return porNombre(spec.nombre, marco.args, rango, { nombres, contar })
}

function porNombre(
  nombre: string,
  args: Arbol[],
  rango: Rango,
  { nombres, contar }: { nombres: Nombres; contar: Contar },
): Arbol | ErrorCrudo {
  const primero = args[0]
  switch (nombre) {
    case 'SUMA':
      return primero === undefined
        ? error('falta_un_valor', rango.desde, rango.hasta)
        : cerrarSuma(primero, rango, nombres, contar)
    case 'SI':
      return cerrarSi(args, rango)
    case 'REDONDEAR':
      return cerrarRedondear(args, rango)
    case 'PORCENTAJE_DE':
      return cerrarPorcentaje(args, rango, contar)
    default:
      return cerrarDepreciar(args, rango)
  }
}
