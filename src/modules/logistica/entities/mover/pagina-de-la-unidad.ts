// Lo que devuelve la lectura de una lista de una unidad (notas, historial) y lo que se le pide (6.04-2). Sólo tipos.
export type PaginaDeLaUnidad<Fila> = {
  filas: Fila[]
  // El cursor de la página siguiente; nulo si no hay más hacia atrás.
  siguiente: string | null
}

export type PedidoDeLaLista = {
  unidadId: string
  // El cursor `(creado_en, id)` de la última fila ya leída; nulo = la primera página.
  cursor: string | null
  // «Ir a una fecha»: el instante exclusivo (`hastaDeUnDia()`); nulo = desde lo más reciente.
  hasta: string | null
}
