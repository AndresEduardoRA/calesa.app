import { Suspense } from 'react'
import { leerMarcasDeLaCotizacion } from '../../../areas/comentarios/composicion'
import {
  accionesDeModerar,
  puedeModerarLaCotizacion,
} from '../../../entities/comentarios/moderacion'
import type { PropsDeUnHuecoDeLaGuardada } from '../../hoja/components/huecos'
import { BotonFavorita } from './boton-favorita'
import { BotonesDeMarcas } from './botones-de-marcas'

// «Favorita», «Reportar…» y, para quien modera, sus acciones, en la cabecera de la guardada (hueco `Acciones`, 4.27-4). Quién ve qué se decide aquí, en el servidor:
// al navegador llegan sólo el id, la versión, la marca propia y las acciones ya calculadas, sin los permisos (el JS en frío de `/cotizaciones/[id]` está cerca del
// tope). La lectura es la misma de la insignia (`cache`), tras `<Suspense>`; si falla, no se dibuja nada.
export function MarcasDeLaGuardada(props: PropsDeUnHuecoDeLaGuardada) {
  return (
    <Suspense fallback={null}>
      <Marcas {...props} />
    </Suspense>
  )
}

async function Marcas({ cotizacion, permisos }: PropsDeUnHuecoDeLaGuardada) {
  const lectura = await leerMarcasDeLaCotizacion(cotizacion.id)
  if (!lectura.ok) {
    return null
  }
  const marcas = lectura.data
  const acciones = puedeModerarLaCotizacion(cotizacion, permisos) ? accionesDeModerar(marcas) : []
  return (
    <>
      <BotonFavorita cotizacionId={cotizacion.id} favorita={marcas.favorita} />
      <BotonesDeMarcas
        cotizacionId={cotizacion.id}
        numero={cotizacion.numero}
        actualizadoEn={cotizacion.actualizadoEn}
        miMotivo={marcas.miMotivo}
        acciones={acciones}
      />
    </>
  )
}
