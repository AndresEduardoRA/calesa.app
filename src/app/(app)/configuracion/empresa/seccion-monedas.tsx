import {
  MonedasYTiposCambio,
  leerAjustes,
  leerHistorial,
  leerMonedasYTiposCambio,
} from '@/modules/empresa'
import { datosO } from '@/shared/lib/errores'

type Props = {
  puedeGestionar: boolean
  // El tipo de cambio de `?tc=`, si hay un panel abierto.
  tipoCambioAbierto: string | undefined
}

// La pestaña «Monedas». Los tipos de cambio los lee cualquiera; el historial y la edición, quien
// tiene `empresa.tipos_cambio.gestionar` (sin él se ve todo deshabilitado, con el motivo).
export async function SeccionMonedas({ puedeGestionar, tipoCambioAbierto }: Props) {
  const [monedasYTipos, paraEditar] = await Promise.all([leerMonedasYTiposCambio(), leerAjustes()])
  const { monedas, tipos } = datosO(monedasYTipos)
  const { ajustes } = datosO(paraEditar)
  // Sólo el de un tipo de cambio que existe: lo que viene en la URL lo puede escribir cualquiera.
  const abierto = tipos.find((tipo) => tipo.id === tipoCambioAbierto)
  const historial = abierto && puedeGestionar ? datosO(await leerHistorial(abierto.id)) : null

  return (
    <MonedasYTiposCambio
      tipos={tipos}
      monedas={monedas}
      monedaBase={ajustes.monedaBase}
      historial={historial}
      puedeGestionar={puedeGestionar}
    />
  )
}
