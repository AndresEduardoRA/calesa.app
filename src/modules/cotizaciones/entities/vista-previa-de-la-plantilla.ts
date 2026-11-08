// El hueco de la vista previa del editor de la plantilla (4.19-4): lo que `plantilla` le da al componente que llena el área `tarjeta` (`pantallas/tarjeta-plantilla.ts`).
// Dos áreas no se importan: este tipo, sin código, es lo único que comparten. La lectura es plana y sin `Map` porque cruza props de la página al editor (cliente).

// Cada grupo dibuja a lo sumo estas filas: con 500 miembros en un grupo la vista previa no pasa de unos 150 nodos de DOM.
export const FILAS_POR_GRUPO_EN_LA_VISTA_PREVIA = 4

export type LecturaParaLaVistaPrevia = {
  readonly logo: boolean
  readonly nota: string | null
  readonly columnas: {
    readonly leyenda: boolean
    readonly tipoDeCambio: boolean
    readonly plazo: boolean
  }
  readonly total: { readonly etiqueta: string; readonly leyenda: string | null }
  readonly grupos: readonly {
    readonly id: string
    readonly etiqueta: string
    readonly plazo: string | null
    readonly tono: string | null
    // La etiqueta del nodo que da el tipo de cambio del bucket del grupo; nula sin bucket o sin nodo.
    readonly tipoDeCambio: string | null
    readonly filas: readonly {
      readonly nodo: string
      readonly etiqueta: string
      readonly leyenda: string | null
    }[]
    // Cuántas filas quedaron fuera por el tope.
    readonly filasDeMas: number
  }[]
  readonly aparte: readonly { readonly nodo: string; readonly etiqueta: string }[]
  // Sólo los tonos que usan los grupos (claro y oscuro, como texto: `<EstiloDeTonos>` descarta lo inválido).
  readonly tonos: readonly {
    readonly clave: string
    readonly claro: { readonly fondo: string; readonly borde: string; readonly tinta: string }
    readonly oscuro: { readonly fondo: string; readonly borde: string; readonly tinta: string }
  }[]
}

export type PropsDeLaVistaPreviaDeLaPlantilla = { readonly lectura: LecturaParaLaVistaPrevia }
