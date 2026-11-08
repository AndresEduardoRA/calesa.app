import { Suspense } from 'react'
import { Badge } from '@/shared/ui/badge'
import { leerMarcasDeLaCotizacion } from '../../../areas/comentarios/composicion'
import {
  insigniaDeLaCotizacion,
  puedeModerarLaCotizacion,
} from '../../../entities/comentarios/moderacion'
import type { PropsDeUnHuecoDeLaGuardada } from '../../hoja/components/huecos'

// La insignia de la guardada en la cabecera (hueco `Insignias`, 4.27-4): «Inválida» para todos, «Reportada» sólo para quien la puede moderar (P1 a). Se lee en el
// servidor tras `<Suspense>` (no retrasa la hoja) y no lleva JS de cliente. Si la lectura falla no dibuja nada: nunca un estado inventado.
export function InsigniaDeLaGuardada(props: PropsDeUnHuecoDeLaGuardada) {
  return (
    <Suspense fallback={null}>
      <Insignia {...props} />
    </Suspense>
  )
}

async function Insignia({ cotizacion, permisos }: PropsDeUnHuecoDeLaGuardada) {
  const lectura = await leerMarcasDeLaCotizacion(cotizacion.id)
  if (!lectura.ok) {
    return null
  }
  const insignia = insigniaDeLaCotizacion(
    lectura.data,
    puedeModerarLaCotizacion(cotizacion, permisos),
  )
  return insignia ? (
    <Badge variant={insignia.tono} data-insignia-de-la-guardada="">
      {insignia.texto}
    </Badge>
  ) : null
}
