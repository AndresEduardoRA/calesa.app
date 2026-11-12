import { leerDeclaracion } from '@/modules/logistica'
import {
  DrawerDeDeclaracion,
  DrawerDeLaDeclaracion,
  ResumenDeLaDeclaracion,
} from '@/modules/logistica/pantallas/aduana'
import { datosO } from '@/shared/lib/errores'
import { EstadoVacio } from '@/shared/ui/estados'
import { CLAVE_DE_DECLARACION } from './clave-de-declaracion'

const NO_ESTA = 'Esta declaración ya no existe o ya no la ves.'

// El resumen de la declaración con ese id, o el estado que toque. La que no existe y la que la persona no ve se muestran igual (la base da el mismo `P0002`); cualquier otro error de
// lectura sube al `error.tsx` de `(app)`, que ofrece «Reintentar».
export async function DeclaracionAbierta({
  id,
  puedeGestionar,
}: {
  id: string
  puedeGestionar: boolean
}) {
  const resultado = await leerDeclaracion(id)
  if (!resultado.ok && resultado.error.codigo === 'no_encontrado') {
    return <EstadoVacio titulo={NO_ESTA} />
  }
  return <ResumenDeLaDeclaracion declaracion={datosO(resultado)} puedeGestionar={puedeGestionar} />
}

// El formulario de edición de la declaración con ese id. Es un panel propio (no convive con el resumen, D8): lee la declaración para llenar el formulario con su versión; si ya no
// existe, queda el panel del resumen con el aviso.
export async function DeclaracionEnEdicion({ id }: { id: string }) {
  const resultado = await leerDeclaracion(id)
  if (!resultado.ok && resultado.error.codigo === 'no_encontrado') {
    return (
      <DrawerDeLaDeclaracion clave={CLAVE_DE_DECLARACION}>
        <EstadoVacio titulo={NO_ESTA} />
      </DrawerDeLaDeclaracion>
    )
  }
  return <DrawerDeDeclaracion original={datosO(resultado)} />
}
