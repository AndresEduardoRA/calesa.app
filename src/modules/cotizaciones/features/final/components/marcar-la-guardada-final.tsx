import { motivoParaNoMarcar, puedeMarcarLaFinal } from '../../../entities/final/acceso'
import type { PropsDeUnHuecoDeLaGuardada } from '../../hoja/components/huecos'
import { BotonMarcarFinal } from './boton-marcar-final'

// «Marcar final» en la cabecera de la guardada (4.25-2). Quién lo ve se decide aquí, en el servidor (la página dibuja los huecos): al navegador llegan sólo el
// id, el número y el motivo para no marcar, sin los permisos ni `permisos.ts` (el JS en frío de `/cotizaciones/[id]` está al tope).
export function MarcarLaGuardadaFinal({
  cotizacion,
  puedeGuardar,
  permisos,
}: PropsDeUnHuecoDeLaGuardada) {
  if (!puedeMarcarLaFinal(cotizacion, permisos)) {
    return null
  }
  return (
    <BotonMarcarFinal
      id={cotizacion.id}
      numero={cotizacion.numero}
      motivo={motivoParaNoMarcar(cotizacion, puedeGuardar)}
    />
  )
}
