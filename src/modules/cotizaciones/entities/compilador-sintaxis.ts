// El parser del compilador de fórmulas como texto (docs/COTIZADOR.md › «Fórmulas como texto (4.07)»): precedencia usual, todo
// asociativo a la izquierda. Es una máquina de dos pilas (operandos y operadores) con una pila de marcos para los paréntesis y las
// llamadas a una función: nada recursivo, así que ni diez mil paréntesis ni treinta mil operadores revientan la pila. Una cadena
// `a+b+c` (`-`, `*`) se aplana al reducir en UN nodo, en el orden del texto; un paréntesis o una función corta el aplanado.
import {
  error,
  esError,
  faltaUnValor,
  funcionDesconocida,
  type Arbol,
  type ErrorCrudo,
  type Marco,
  type Numero,
} from './compilador-arbol'
import {
  contar,
  enToken,
  mirar,
  textoDe,
  tomar,
  type Estado,
  type Manejador,
} from './compilador-estado'
import { cerrarFuncion, FUNCIONES } from './compilador-funciones'
import { crearLexico, T, valorDeNumero, type Token } from './compilador-lexico'
import { resolverNombre, type Nombres } from './compilador-nombres'
import { PRECEDENCIA, reducir } from './compilador-reducir'
import type { Medidor } from './medidor'
import { MAXIMO_DE_PROFUNDIDAD } from './motivos-del-compilador'

export type ResultadoDeSintaxis = { ok: true; raiz: Arbol } | { ok: false; error: ErrorCrudo }

// --- los tokens -------------------------------------------------------------------------------------

function empujarNumero(
  e: Estado,
  t: Token,
  desde: number,
  negativo: boolean,
): ErrorCrudo | undefined {
  const v = valorDeNumero(e.lex.texto, t.desde, t.hasta, false)
  if (v === null)
    return error('numero_fuera_de_rango', desde, t.hasta, {
      texto: textoDe(e, { desde, hasta: t.hasta }),
    })
  const valor = negativo ? -v : v
  const n: Numero = {
    k: 'num',
    valor: valor === 0 ? 0 : valor,
    pct: false,
    comoPct: false,
    negativo,
    numDesde: t.desde,
    numHasta: t.hasta,
    paren: false,
    desde,
    hasta: t.hasta,
  }
  e.operandos.push(n)
  e.esperaValor = false
  e.ultimaNum = true
  return undefined
}

function numero(e: Estado, t: Token): ErrorCrudo | undefined {
  if (!e.esperaValor) return enToken(t, 'falta_un_operador')
  return empujarNumero(e, t, t.desde, false)
}

// El signo menos sólo se pega a un número: «-5», «a - -5». No hay negación de un nombre ni de un paréntesis.
function menosUnario(e: Estado, t: Token): ErrorCrudo | undefined {
  if (t.t === T.MENOS) {
    const sig = mirar(e)
    if (sig.t === T.NUM && sig.desde === t.hasta) {
      tomar(e)
      return empujarNumero(e, sig, t.desde, true)
    }
  }
  return enToken(t, 'operador_suelto', { texto: textoDe(e, t) })
}

function operador(e: Estado, t: Token): ErrorCrudo | undefined {
  if (e.esperaValor) return menosUnario(e, t)
  const simbolo = textoDe(e, t)
  const r = reducir(e, PRECEDENCIA[simbolo] ?? 0)
  if (r !== undefined) return r
  e.operadores.push({ op: simbolo, desde: t.desde, hasta: t.hasta })
  e.esperaValor = true
  return undefined
}

function abrirMarco(e: Estado, abre: Token, extra: Partial<Marco>): ErrorCrudo | undefined {
  if (e.marcos.length >= MAXIMO_DE_PROFUNDIDAD) {
    return enToken(abre, 'demasiado_profundo', { n: MAXIMO_DE_PROFUNDIDAD })
  }
  e.marcos.push({
    tipo: 'grupo',
    abre,
    args: [],
    baseOperadores: e.operadores.length,
    baseOperandos: e.operandos.length,
    ...extra,
  })
  e.esperaValor = true
  return undefined
}

function abre(e: Estado, t: Token): ErrorCrudo | undefined {
  if (!e.esperaValor) return enToken(t, 'falta_un_operador')
  return abrirMarco(e, t, {})
}

function abrirFuncion(e: Estado, nombre: Token): ErrorCrudo | undefined {
  const paren = tomar(e)
  const mayusculas = textoDe(e, nombre).toUpperCase()
  if (mayusculas === 'HOY') return enToken(nombre, 'hoy_no_soportado')
  const spec = FUNCIONES.get(mayusculas)
  if (spec === undefined) return funcionDesconocida(nombre, textoDe(e, nombre))
  return abrirMarco(e, paren, {
    tipo: 'funcion',
    nombre: mayusculas,
    nombreRango: { desde: nombre.desde, hasta: nombre.hasta },
    spec,
  })
}

// Qué pide la posición del argumento donde estamos: sólo cuenta si todavía no se leyó nada de él.
function pideEsteArgumento(e: Estado): string | undefined {
  const marco = e.marcos[e.marcos.length - 1]
  if (marco?.spec === undefined) return undefined
  if (e.operandos.length !== marco.baseOperandos || e.operadores.length !== marco.baseOperadores)
    return undefined
  // Un argumento de más no se resuelve: la cuenta de argumentos es el error que importa.
  return marco.spec.args[marco.args.length] ?? 'clave'
}

function nombre(e: Estado, t: Token): ErrorCrudo | undefined {
  if (!e.esperaValor) return enToken(t, 'falta_un_operador')
  if (mirar(e).t === T.ABRE) return abrirFuncion(e, t)
  const texto = textoDe(e, t)
  const pide = pideEsteArgumento(e)
  e.esperaValor = false
  if (pide === 'grupo' || pide === 'clave') {
    e.operandos.push({ k: 'clave', texto, paren: false, desde: t.desde, hasta: t.hasta })
    return undefined
  }
  const r = resolverNombre(e.nombres, texto, pide === 'bandera')
  if ('codigo' in r) return enToken(t, r.codigo, r.datos)
  e.operandos.push({ k: 'ref', nodo: r.nodo, paren: false, desde: t.desde, hasta: t.hasta })
  return undefined
}

function cierra(e: Estado, t: Token): ErrorCrudo | undefined {
  const marco = e.marcos[e.marcos.length - 1]
  if (marco === undefined) return enToken(t, 'parentesis_de_mas')
  if (e.esperaValor) return faltaUnValor(t)
  const r = reducir(e, 0)
  if (r !== undefined) return r
  const arg = e.operandos.pop()
  e.marcos.pop()
  e.esperaValor = false
  if (arg === undefined) return faltaUnValor(t)
  if (marco.tipo === 'grupo') {
    arg.paren = true
    arg.desde = marco.abre.desde
    arg.hasta = t.hasta
    e.operandos.push(arg)
    return undefined
  }
  marco.args.push(arg)
  const f = cerrarFuncion(marco, t, e.nombres, contar(e))
  if (esError(f)) return f
  e.operandos.push(f)
  return undefined
}

function puntoYComa(e: Estado, t: Token): ErrorCrudo | undefined {
  const marco = e.marcos[e.marcos.length - 1]
  if (marco?.tipo !== 'funcion') return enToken(t, 'separador_fuera_de_funcion')
  if (e.esperaValor) return faltaUnValor(t)
  const r = reducir(e, 0)
  if (r !== undefined) return r
  const arg = e.operandos.pop()
  if (arg !== undefined) marco.args.push(arg)
  e.esperaValor = true
  return undefined
}

function porciento(e: Estado, t: Token): ErrorCrudo | undefined {
  const ultimo = e.operandos[e.operandos.length - 1]
  if (e.esperaValor || !e.numPrevio || ultimo?.k !== 'num')
    return enToken(t, 'porcentaje_sin_numero')
  // Correr el punto a la izquierda achica el número: si el texto cupo, esto también.
  const v = valorDeNumero(e.lex.texto, ultimo.numDesde, ultimo.numHasta, true) ?? 0
  const valor = ultimo.negativo ? -v : v
  ultimo.valor = valor === 0 ? 0 : valor
  ultimo.pct = true
  ultimo.hasta = t.hasta
  e.ultimaNum = false
  return undefined
}

const MANEJADORES = new Map<number, Manejador>([
  [T.NUM, numero],
  [T.NOMBRE, nombre],
  [T.MAS, operador],
  [T.MENOS, operador],
  [T.POR, operador],
  [T.ENTRE, operador],
  [T.ABRE, abre],
  [T.CIERRA, cierra],
  [T.PUNTO_Y_COMA, puntoYComa],
  [T.PORCIENTO, porciento],
  [T.COMA, (_e, t) => enToken(t, 'coma')],
  [
    T.ERROR,
    (e, t) => (t.codigo === undefined ? undefined : enToken(t, t.codigo, { texto: textoDe(e, t) })),
  ],
])

// --- el final ---------------------------------------------------------------------------------------

function alFinal(e: Estado): ResultadoDeSintaxis {
  const fallo = (x: ErrorCrudo): ResultadoDeSintaxis => ({ ok: false, error: x })
  const marco = e.marcos[e.marcos.length - 1]
  const ultimo = e.ultimo
  if (!e.esperaValor) {
    if (marco !== undefined) return fallo(enToken(marco.abre, 'parentesis_sin_cerrar'))
    const r = reducir(e, 0)
    if (r !== undefined) return fallo(r)
    const raiz = e.operandos[0]
    if (raiz !== undefined) return { ok: true, raiz }
  }
  // Falta algo al final: el texto está vacío, o termina en un «(», un «;» o un operador.
  if (ultimo === undefined) return fallo(error('texto_vacio', 0, e.lex.texto.length))
  if (ultimo.t === T.ABRE && marco !== undefined) {
    return fallo(enToken(marco.abre, 'parentesis_sin_cerrar'))
  }
  if (ultimo.t === T.PUNTO_Y_COMA) return fallo(faltaUnValor(ultimo))
  return fallo(enToken(ultimo, 'operador_suelto', { texto: textoDe(e, ultimo) }))
}

export function analizar(texto: string, nombres: Nombres, m: Medidor): ResultadoDeSintaxis {
  const e: Estado = {
    lex: crearLexico(texto, m),
    nombres,
    m,
    operandos: [],
    operadores: [],
    marcos: [],
    esperaValor: true,
    ultimaNum: false,
    numPrevio: false,
    ultimo: undefined,
    pendiente: undefined,
    terminos: 0,
  }
  for (;;) {
    const t = tomar(e)
    if (t.t === T.FIN) return alFinal(e)
    e.numPrevio = e.ultimaNum
    e.ultimaNum = false
    m.visitas += 1
    const r = MANEJADORES.get(t.t)?.(e, t)
    if (r !== undefined) return { ok: false, error: r }
  }
}
