// Por qué se rechaza una fórmula. El código es el contrato con `validar_formula()` de la base (4.05-4) y con el
// juego de `casos-de-formula.json`; el texto es de cada lado. `donde` es el id del nodo, el grupo o la clave
// donde se rompe, para que la base lo ponga en `hint` y el editor lo señale.

export const REGLAS_DE_FORMULA = [
  'forma',
  'nodo_duplicado',
  'referencia_inexistente',
  'ciclo',
  'referencia_hacia_adelante',
  'referencia_de_tipo',
  'total_unico',
  'total_fijo',
  'total_no_es_monto',
  'constante_sin_valor',
  'param_sin_constante',
  'par_mal_tipado',
  'pct_compartido',
  'tipo_de_cambio_repetido',
  'tipo_de_cambio_inexistente',
  'bucket_inexistente',
  'total_sin_tipo_de_cambio',
  'grupos_sin_total_en',
  'grupo_duplicado',
  'grupo_inexistente',
  'grupo_vacio',
  'bucket_con_grupos',
  'miembro_no_es_monto',
  'miembro_con_salida',
  'doble_conteo',
  'opcion_repetida',
  'opcion_clave_repetida',
  'opcion_por_defecto_inexistente',
  'solo_en_sin_opcion',
  'solo_en_opcion_inexistente',
] as const

export type ReglaDeFormula = (typeof REGLAS_DE_FORMULA)[number]

// Lo que cada mensaje puede nombrar.
export type DatosDeRechazo = {
  donde?: string
  ref?: string
  otro?: string
  grupo?: string
  bucket?: string
  clave?: string
  campo?: string
  esperado?: string
  n?: number
}

export type RechazoDeFormula = {
  regla: ReglaDeFormula
  mensaje: string
  donde?: string
  // La ruta del dato en la entrada (sólo `forma`), para el editor.
  campo?: string
}

const q = (s: string | undefined) => `«${s ?? '?'}»`

const MENSAJES: Record<ReglaDeFormula, (d: DatosDeRechazo) => string> = {
  forma: (d) => `La fórmula no tiene la forma esperada en ${q(d.campo)}.`,
  nodo_duplicado: (d) => `Hay dos nodos con el id ${q(d.donde)}.`,
  referencia_inexistente: (d) => `${q(d.donde)} usa ${q(d.ref)}, que no es un nodo de la fórmula.`,
  ciclo: (d) => `${q(d.donde)} se usa a sí mismo: sería un ciclo.`,
  referencia_hacia_adelante: (d) =>
    `${q(d.donde)} usa ${q(d.ref)}, que está después en la lista: el orden de la lista es el de evaluación y sólo se usa lo anterior.`,
  referencia_de_tipo: (d) =>
    `${q(d.donde)} usa ${q(d.ref)} como ${d.campo ?? '?'}, y tiene que ser ${d.esperado ?? '?'}.`,
  total_unico: (d) =>
    `La fórmula necesita exactamente un nodo con salida «total» (hay ${d.n ?? 0}).`,
  total_fijo: (d) =>
    `El total ${q(d.donde)} no puede depender de una variante ni de un interruptor, ni sobrescribirse.`,
  total_no_es_monto: (d) =>
    `El total ${q(d.donde)} tiene que dar un monto: un input, una constante, una tabla, un tramo o un cálculo.`,
  constante_sin_valor: (d) => `La constante ${q(d.donde)} no tiene valor en params.`,
  param_sin_constante: (d) => `params.${d.donde ?? '?'} no corresponde a ninguna constante.`,
  par_mal_tipado: (d) =>
    `${q(d.donde)} es un porcentaje de otro monto: tiene que ser un monto y su porcentaje ${q(d.ref)}, tener formato pct.`,
  pct_compartido: (d) =>
    `${q(d.ref)} es el porcentaje de ${q(d.donde)}, que se puede sobrescribir: ningún otro nodo lo puede leer (lo lee ${q(d.otro)}).`,
  tipo_de_cambio_repetido: (d) =>
    `${q(d.otro)} y ${q(d.donde)} son el mismo tipo de cambio (${q(d.clave)}).`,
  tipo_de_cambio_inexistente: (d) =>
    `${d.donde ?? '?'} nombra ${q(d.ref)}, que no es un tipo de cambio de la fórmula.`,
  bucket_inexistente: (d) => `${q(d.donde)} usa el bucket ${q(d.bucket)}, que no está en buckets.`,
  total_sin_tipo_de_cambio: (d) =>
    `Sin grupos, el total ${q(d.donde)} necesita un bucket, o ser una suma de nodos que lo tengan.`,
  grupos_sin_total_en: () =>
    'Con grupos, la fórmula necesita «total_en»: el tipo de cambio que divide el total en Bs.',
  grupo_duplicado: (d) => `Hay dos grupos con el id ${q(d.donde)}.`,
  grupo_inexistente: (d) => `${q(d.donde)} está en el grupo ${q(d.grupo)}, que no existe.`,
  grupo_vacio: (d) => `El grupo ${q(d.donde)} no tiene nodos.`,
  bucket_con_grupos: (d) =>
    `${q(d.donde)} declara su bucket, y con grupos el tipo de cambio es del grupo.`,
  miembro_no_es_monto: (d) =>
    `${q(d.donde)} está en el grupo ${q(d.grupo)} y no es un monto: un miembro es un input, una constante, una tabla, un tramo o un cálculo, con formato usd o moneda.`,
  miembro_con_salida: (d) => `${q(d.donde)} es una salida y no puede sumar al grupo ${q(d.grupo)}.`,
  doble_conteo: (d) =>
    `${q(d.donde)} está en el grupo ${q(d.grupo)} y suma ${q(d.ref)}, que ya cuenta en un grupo: se contaría dos veces.`,
  opcion_repetida: (d) =>
    `La fórmula tiene dos variantes (${q(d.otro)} y ${q(d.donde)}): va una sola.`,
  opcion_clave_repetida: (d) => `La variante ${q(d.donde)} repite la opción ${q(d.clave)}.`,
  opcion_por_defecto_inexistente: (d) =>
    `La opción por defecto ${q(d.clave)} no es una opción de ${q(d.donde)}.`,
  solo_en_sin_opcion: (d) =>
    `${q(d.donde)} dice en qué variantes vale, y la fórmula no tiene variante.`,
  solo_en_opcion_inexistente: (d) =>
    `${q(d.donde)} nombra la opción ${q(d.clave)}, que la variante no tiene.`,
}

export function rechazoDeFormula(regla: ReglaDeFormula, datos: DatosDeRechazo): RechazoDeFormula {
  return {
    regla,
    mensaje: MENSAJES[regla](datos),
    ...(datos.donde === undefined ? {} : { donde: datos.donde }),
    ...(regla === 'forma' && datos.campo !== undefined ? { campo: datos.campo } : {}),
  }
}
