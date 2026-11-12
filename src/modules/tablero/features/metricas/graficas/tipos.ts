// Una serie de una gráfica: su nombre en la leyenda y su forma en singular y plural para el texto de una barra («1 convertido»).
export type Serie = { nombre: string; uno: string; varios: string }

export const CREADOS_Y_CONVERTIDOS: readonly [Serie, Serie] = [
  { nombre: 'Creados', uno: 'creado', varios: 'creados' },
  { nombre: 'Convertidos', uno: 'convertido', varios: 'convertidos' },
]

export const CREADAS_Y_FINALES: readonly [Serie, Serie] = [
  { nombre: 'Creadas', uno: 'creada', varios: 'creadas' },
  { nombre: 'Finales', uno: 'final', varios: 'finales' },
]
