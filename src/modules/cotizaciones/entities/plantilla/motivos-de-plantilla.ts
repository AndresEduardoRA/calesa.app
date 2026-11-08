// Por qué se rechaza una plantilla de la tarjeta. El código es el contrato con `validar_plantilla()` de la base (la regla en `detail`, el donde en `hint`) y
// con el juego `casos-de-plantilla.json`; el mensaje es el mismo `format` de la base (20261106185900_plantilla_validar.sql), con el donde entre comillas latinas.

// En el orden fijo de la base: el primer rechazo manda.
export const REGLAS_DE_PLANTILLA = [
  'forma',
  'grupo_inexistente',
  'grupo_repetido',
  'grupo_faltante',
  'tono_inexistente',
  'nodo_inexistente',
  'nodo_sin_lugar',
  'nodo_restringido',
  'tipo_de_cambio_restringido',
] as const

export type ReglaDePlantilla = (typeof REGLAS_DE_PLANTILLA)[number]

export type RechazoDePlantilla = {
  readonly regla: ReglaDePlantilla
  readonly donde: string
  readonly mensaje: string
}

const MENSAJES: { readonly [R in ReglaDePlantilla]: (x: string) => string } = {
  forma: () => 'La plantilla no tiene la forma esperada.',
  grupo_inexistente: (x) => `El grupo «${x}» no es de la fórmula.`,
  grupo_repetido: (x) => `El grupo «${x}» está dos veces.`,
  grupo_faltante: (x) => `Falta el grupo «${x}»: la tarjeta lleva todos los grupos de la fórmula.`,
  tono_inexistente: (x) => `El grupo «${x}» usa un tono que no está en el catálogo.`,
  nodo_inexistente: (x) => `La plantilla nombra «${x}», que no es un nodo de la fórmula.`,
  nodo_sin_lugar: (x) =>
    `El nodo «${x}» no va en la tarjeta: no es de un grupo, el total ni lo aparte.`,
  nodo_restringido: (x) => `La tarjeta no puede mostrar «${x}»: no es del nivel «todos».`,
  tipo_de_cambio_restringido: (x) =>
    `La tarjeta no puede nombrar el tipo de cambio de «${x}»: no es del nivel «todos».`,
}

export const rechazoDePlantilla = (regla: ReglaDePlantilla, donde: string): RechazoDePlantilla => ({
  regla,
  donde,
  mensaje: MENSAJES[regla](donde),
})
