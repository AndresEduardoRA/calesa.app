import { EditorDeCampos, leerLayout, type OrigenConUso } from '@/modules/origenes'
import { datosO } from '@/shared/lib/errores'

type Props = { origen: OrigenConUso; puedeGestionar: boolean }

// La pestaña «Campos»: el layout del origen, con sus campos desactivados al final.
export async function SeccionCampos({ origen, puedeGestionar }: Props) {
  const { campos } = datosO(await leerLayout(origen.id, { conUso: false }))
  return (
    <EditorDeCampos
      origenId={origen.id}
      tipoDeOrigen={origen.tipo}
      campos={campos}
      puedeGestionar={puedeGestionar}
    />
  )
}
