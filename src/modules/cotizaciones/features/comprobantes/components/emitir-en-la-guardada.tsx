import { Suspense } from 'react'
import { leerComprobantesDeLaCotizacion } from '../../../areas/comprobantes/composicion'
import { puedeEmitirComprobante } from '../../../entities/comprobantes/acceso'
import { vigenteDe } from '../../../entities/comprobantes/comprobante'
import type { PropsDeUnHuecoDeLaGuardada } from '../../hoja/components/huecos'
import { BotonEmitirComprobante } from './boton-emitir-comprobante'

// «Emitir comprobante» en la cabecera de la guardada (hueco `Acciones`, 4.26-2). Quién lo ve se decide aquí, en el servidor, tras `<Suspense>` (no retrasa la
// hoja): una final activa sin vigente, con la clave. Al navegador llegan el id, el número y la versión, sin los permisos. Si la lectura falla no dibuja nada.
export function EmitirEnLaGuardada(props: PropsDeUnHuecoDeLaGuardada) {
  if (props.cotizacion.clase !== 'final') {
    return null
  }
  return (
    <Suspense fallback={null}>
      <Emitir {...props} />
    </Suspense>
  )
}

async function Emitir({ cotizacion, permisos }: PropsDeUnHuecoDeLaGuardada) {
  const lectura = await leerComprobantesDeLaCotizacion(cotizacion.id)
  if (
    !lectura.ok ||
    !puedeEmitirComprobante(
      { clase: cotizacion.clase, estado: lectura.data.estado },
      permisos,
      vigenteDe(lectura.data.filas),
    )
  ) {
    return null
  }
  return (
    <BotonEmitirComprobante
      cotizacionId={cotizacion.id}
      numero={cotizacion.numero}
      actualizadoEn={cotizacion.actualizadoEn}
    />
  )
}
