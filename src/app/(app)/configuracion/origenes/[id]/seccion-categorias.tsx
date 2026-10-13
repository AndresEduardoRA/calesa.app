import { ArbolDeCategorias, leerLayout, type OrigenConUso } from '@/modules/origenes'
import { datosO } from '@/shared/lib/errores'

type Props = { origen: OrigenConUso; puedeGestionar: boolean }

// La pestaña «Categorías». Contar vehículos por categoría pide `origenes.gestionar`: sin él la
// lista no muestra números en vez de mostrar ceros.
export async function SeccionCategorias({ origen, puedeGestionar }: Props) {
  const { categorias } = datosO(await leerLayout(origen.id, { conUso: puedeGestionar }))
  return (
    <ArbolDeCategorias
      origenId={origen.id}
      sustantivo={origen.sustantivo}
      categorias={categorias}
      puedeGestionar={puedeGestionar}
    />
  )
}
