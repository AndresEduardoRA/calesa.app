// Por qué no compila un texto (docs/COTIZADOR.md › «Fórmulas como texto (4.07)»). El código es el contrato con el editor (4.21);
// el mensaje habla con tuteo. Cada error trae su tramo del texto: dónde empieza (UTF-16, como un <textarea>), cuánto mide y su
// línea y columna (desde 1; las líneas se parten en «\n»).
import type { Medidor } from './medidor'

export const CODIGOS_DE_COMPILACION = [
  'texto_vacio',
  'caracter_invalido',
  'coma',
  'separador_fuera_de_funcion',
  'numero_mal_escrito',
  'numero_fuera_de_rango',
  'parentesis_sin_cerrar',
  'parentesis_de_mas',
  'operador_suelto',
  'falta_un_valor',
  'falta_un_operador',
  'porcentaje_sin_numero',
  'demasiado_profundo',
  'nombre_desconocido',
  'referencia_a1',
  'referencia_hacia_adelante',
  'ciclo',
  'grupo_sin_suma',
  'variante_en_calculo',
  'funcion_desconocida',
  'hoy_no_soportado',
  'cantidad_de_argumentos',
  'argumento_invalido',
  'no_es_bandera',
  'grupo_inexistente',
  'grupo_vacio',
  'auxiliar_ocupado',
  'demasiados_terminos',
] as const

export type CodigoDeCompilacion = (typeof CODIGOS_DE_COMPILACION)[number]

// Lo que cada mensaje puede nombrar.
export type DatosDeError = {
  texto?: string
  nombre?: string
  cantidad?: number
  esperado?: string
  n?: number
}

export type Tramo = { desde: number; largo: number; linea: number; columna: number }

export type ErrorDeCompilacion = {
  codigo: CodigoDeCompilacion
  mensaje: string
  tramo: Tramo
}

export const MAXIMO_DE_PROFUNDIDAD = 64
export const MAXIMO_DE_TERMINOS = 100_000

const q = (s: string | undefined) => `«${s ?? '?'}»`

const MENSAJES: Record<CodigoDeCompilacion, (d: DatosDeError) => string> = {
  texto_vacio: () => 'Escribe la fórmula: ahora no hay nada que calcular.',
  caracter_invalido: (d) =>
    `No entiendo ${q(d.texto)}. Usa números, nombres, + - * / ( ) % y ; entre los argumentos.`,
  coma: () =>
    'Separa los argumentos con punto y coma (;), no con coma. Los decimales llevan punto.',
  separador_fuera_de_funcion: () =>
    'El punto y coma (;) solo separa los argumentos de una función.',
  numero_mal_escrito: (d) => `${q(d.texto)} no es un número: escríbelo como 12, 0.5 o 1e3.`,
  numero_fuera_de_rango: (d) => `${q(d.texto)} es demasiado grande.`,
  parentesis_sin_cerrar: () => 'Falta cerrar este paréntesis.',
  parentesis_de_mas: () => 'Este paréntesis cierra uno que no abriste.',
  operador_suelto: (d) =>
    d.texto === '-'
      ? 'Aquí falta un valor. El signo menos solo va pegado a un número (-5); para restar un nombre, escribe 0 - nombre.'
      : `El operador ${q(d.texto)} necesita un valor antes y otro después.`,
  falta_un_valor: () => 'Falta un valor aquí.',
  falta_un_operador: () => 'Falta un operador (+ - * /) entre estos dos valores.',
  porcentaje_sin_numero: () => 'El % va pegado a un número, como 4%.',
  demasiado_profundo: (d) =>
    `Hay demasiados paréntesis anidados: el máximo es ${String(d.n ?? 0)}.`,
  nombre_desconocido: (d) => `${q(d.nombre)} no es ningún nodo de la fórmula.`,
  referencia_a1: (d) =>
    `${q(d.nombre)} parece una celda de hoja de cálculo (A1). Aquí se usan los nombres de los nodos.`,
  referencia_hacia_adelante: (d) =>
    `${q(d.nombre)} está más abajo en la lista: solo puedes usar lo que está antes de esta fila.`,
  ciclo: (d) => `${q(d.nombre)} es esta misma fila: no puede usarse a sí misma.`,
  grupo_sin_suma: (d) =>
    `${q(d.nombre)} es un grupo: para sumarlo escribe SUMA(${d.nombre ?? '?'}).`,
  variante_en_calculo: (d) =>
    `${q(d.nombre)} es la variante: se nombra en «solo en» de una fila, no en un cálculo.`,
  funcion_desconocida: (d) =>
    `${q(d.nombre)} no es una función. Puedes usar SUMA, SI, REDONDEAR, PORCENTAJE_DE y DEPRECIAR.`,
  hoy_no_soportado: () =>
    'HOY() todavía no existe: una fórmula no puede depender de la fecha de hoy.',
  cantidad_de_argumentos: (d) =>
    `${d.nombre ?? '?'} lleva ${String(d.cantidad ?? 0)} argumento${d.cantidad === 1 ? '' : 's'}, separados con punto y coma (;).`,
  argumento_invalido: (d) => `Aquí va ${d.esperado ?? 'otro valor'}.`,
  no_es_bandera: (d) => `${q(d.nombre)} no es una bandera: SI necesita un interruptor.`,
  grupo_inexistente: (d) => `El grupo ${q(d.nombre)} no existe.`,
  grupo_vacio: (d) => `El grupo ${q(d.nombre)} no tiene filas antes de esta.`,
  auxiliar_ocupado: (d) =>
    `La fila intermedia ${q(d.nombre)} ya existe: renombra esa fila o escribe la fórmula más corta.`,
  demasiados_terminos: () => 'La fórmula es demasiado grande: usa menos términos.',
}

export const mensajeDe = (codigo: CodigoDeCompilacion, datos: DatosDeError): string =>
  MENSAJES[codigo](datos)

// Dónde empieza cada línea (la primera, en 0). Una pasada.
export function inicioDeLineas(texto: string, m: Medidor): number[] {
  const inicios = [0]
  for (let i = 0; i < texto.length; i += 1) {
    m.visitas += 1
    if (texto.charCodeAt(i) === 10) inicios.push(i + 1)
  }
  return inicios
}

// La línea y la columna (desde 1) de un desplazamiento: búsqueda binaria.
export function tramoDe(
  inicios: readonly number[],
  desde: number,
  hasta: number,
  m: Medidor,
): Tramo {
  let bajo = 0
  let alto = inicios.length - 1
  while (bajo < alto) {
    m.visitas += 1
    const medio = (bajo + alto + 1) >> 1
    if ((inicios[medio] ?? 0) <= desde) bajo = medio
    else alto = medio - 1
  }
  return { desde, largo: hasta - desde, linea: bajo + 1, columna: desde - (inicios[bajo] ?? 0) + 1 }
}
