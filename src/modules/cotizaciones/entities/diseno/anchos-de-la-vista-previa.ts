// Los tres anchos de la vista previa del diseño (4.22-5): el celular, el escritorio y el celular con el texto al doble. Es el valor de `?vista=`.
export const ANCHOS_DE_LA_VISTA_PREVIA = ['412', '1280', '200'] as const
export type AnchoDeLaVistaPrevia = (typeof ANCHOS_DE_LA_VISTA_PREVIA)[number]
export const ANCHO_AL_ABRIR: AnchoDeLaVistaPrevia = '412'
