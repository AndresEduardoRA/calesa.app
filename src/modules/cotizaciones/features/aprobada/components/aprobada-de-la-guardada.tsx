import { Suspense } from 'react'
import { leerMarcaDeLaGuardada } from '../../../areas/aprobada/composicion'
import { motivoParaNoAprobar, puedeAprobar } from '../../../entities/aprobada/acceso'
import type { PropsDeUnHuecoDeLaGuardada } from '../../hoja/components/huecos'
import { BotonAprobar } from './boton-aprobar'
import { InsigniaAprobada } from './insignia-aprobada'

// La insignia «Aprobada» y «Aprobar» en la cabecera de la guardada (hueco `Insignias`). Se lee en el servidor tras `<Suspense>` (no retrasa la hoja): la insignia la ven
// todos los que ven la cotización; el botón, sólo quien aprueba en su origen (`cotizaciones.aprobar`). Al navegador llegan el id, el número, la versión y el motivo para
// no aprobar, sin los permisos. Si la lectura falla no dibuja una marca inventada: quien puede aprobar ve el botón apagado con el motivo.
export function AprobadaDeLaGuardada(props: PropsDeUnHuecoDeLaGuardada) {
  return (
    <Suspense fallback={null}>
      <Marca {...props} />
    </Suspense>
  )
}

async function Marca({ cotizacion, permisos }: PropsDeUnHuecoDeLaGuardada) {
  const lectura = await leerMarcaDeLaGuardada(cotizacion.id)
  const marca = lectura.ok ? lectura.data : null
  if (!puedeAprobar(cotizacion, permisos)) {
    return marca?.aprobada === true ? <InsigniaAprobada /> : null
  }
  return (
    <BotonAprobar
      id={cotizacion.id}
      numero={cotizacion.numero}
      actualizadoEn={cotizacion.actualizadoEn}
      aprobada={marca?.aprobada === true}
      motivo={motivoParaNoAprobar(cotizacion, marca)}
    />
  )
}
