import { connection } from 'next/server'
import { datosO } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import { leerMiFichaEnLaWeb } from '../../../../areas/turnos/composicion'
import { FichaEnLaWeb } from '../../ficha/components/ficha-en-la-web'
import { EstadoEnLaRueda } from '../../rueda/components/estado-en-la-rueda'

// Lo de la web en Mi perfil (8.05-2): «Turnos de la web» con su interruptor y «Tu ficha en la web». Lee la fila propia de la cola, así que va tras un `<Suspense>` (lo pone la página).
export async function TurnosDelPerfil({
  permisos,
  miraOtroRol,
}: {
  permisos: Permisos
  miraOtroRol: boolean
}) {
  await connection()
  const mia = datosO(await leerMiFichaEnLaWeb())
  return (
    <>
      <EstadoEnLaRueda
        permisos={permisos}
        habilitado={mia?.habilitado ?? false}
        disponible={mia?.disponible ?? false}
        miraOtroRol={miraOtroRol}
      />
      {mia ? <FichaEnLaWeb key={mia.actualizadoEn} ficha={mia} miraOtroRol={miraOtroRol} /> : null}
    </>
  )
}
