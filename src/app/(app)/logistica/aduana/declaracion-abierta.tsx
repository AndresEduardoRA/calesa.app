import { leerDeclaracion } from '@/modules/logistica'
import { ResumenDeLaDeclaracion } from '@/modules/logistica/pantallas/aduana'
import { datosO } from '@/shared/lib/errores'
import { EstadoVacio } from '@/shared/ui/estados'

// El resumen de la declaración con ese id, o el estado que toque. La que no existe y la que la persona no ve se muestran igual (la base da el mismo `P0002`); cualquier otro error de lectura
// sube al `error.tsx` de `(app)`, que ofrece «Reintentar».
export async function DeclaracionAbierta({ id }: { id: string }) {
  const resultado = await leerDeclaracion(id)
  if (!resultado.ok && resultado.error.codigo === 'no_encontrado') {
    return <EstadoVacio titulo="Esta declaración ya no existe o ya no la ves." />
  }
  return <ResumenDeLaDeclaracion declaracion={datosO(resultado)} />
}
