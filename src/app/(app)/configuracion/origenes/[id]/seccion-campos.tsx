import { leerDatosNuevosDeApibara, leerLayout, type OrigenConUso } from '@/modules/origenes'
import { DatosNuevosDeApibara, EditorDeCampos } from '@/modules/origenes/pantallas/origen'
import { datosO } from '@/shared/lib/errores'

type Props = { origen: OrigenConUso; puedeGestionar: boolean }

// La pestaña «Campos»: el layout del origen, con sus campos desactivados al final. En un origen de
// subasta, quien gestiona ve además lo que apibara trajo y el origen todavía no tiene como campo.
export async function SeccionCampos({ origen, puedeGestionar }: Props) {
  const [layout, nuevos] = await Promise.all([
    leerLayout(origen.id, { conUso: false }),
    origen.tipo === 'subasta' && puedeGestionar ? leerDatosNuevosDeApibara(origen.id) : null,
  ])
  const { campos } = datosO(layout)
  // Si no se pudo averiguar, el editor sigue: es un aviso, no la pantalla.
  const datosNuevos = nuevos?.ok ? nuevos.data : []
  return (
    <div className="grid gap-4">
      {datosNuevos.length > 0 ? (
        <DatosNuevosDeApibara origenId={origen.id} datos={datosNuevos} />
      ) : null}
      <EditorDeCampos
        origenId={origen.id}
        tipoDeOrigen={origen.tipo}
        campos={campos}
        puedeGestionar={puedeGestionar}
      />
    </div>
  )
}
