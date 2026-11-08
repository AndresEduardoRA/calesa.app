'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Confirmar } from '@/shared/ui/confirmar'
import { avisarExito } from '@/shared/ui/toasts'
import {
  descripcionDelDescarte,
  noDisponibleAlDescartar,
  tituloDelDescarte,
} from '../../../entities/plantilla/descartar-la-plantilla'
import { descartarBorrador } from '../actions/descartar-borrador'
import { useDescarteDeLaPlantilla } from '../hooks/use-descarte-de-la-plantilla'

type Props = {
  abierto: boolean
  alCerrar: () => void
  origen: { id: string; nombre: string }
  // El `actualizadoEn` del borrador que la pestaña leyó ahora (nulo: ya no está). La base lo compara.
  esperada: string | null
  // El borrador que se nombra: se fija al abrir (mientras se cierra tras descartar, el texto no cambia).
  nombrado: string
}

const MENSAJE_DE_VALIDACION = 'No pudimos leer el pedido. Recarga y vuelve a intentar.'

// «Descartar el borrador de la tarjeta de <Origen>» (`?panel=descartar-plantilla`, 4.19-3c): lo irreversible se confirma nombrando el borrador y su fecha, sin autor (P1).
// Lo que no entró queda dentro del diálogo, que no se cierra: un PT409 con el mensaje de la base y «Recargar» (se va al llegar el borrador nuevo, y mientras tanto
// «Descartar borrador» está apagado); sin borrador ya, que no hay qué descartar; sin respuesta, que no se sabe si se descartó. Entró: «Se descartó el borrador.» y la
// pestaña se lee de nuevo sin él.
export function DescartarLaPlantilla({ abierto, alCerrar, origen, esperada, nombrado }: Props) {
  const descartar = useAction(descartarBorrador)
  const { enCurso, aviso, conflicto, recargando, descartado, confirmar, recargar } =
    useDescarteDeLaPlantilla({
      esperada,
      pedir: (laEsperada) =>
        enviarAccion(
          descartar.executeAsync({ origenId: origen.id, esperada: laEsperada }),
          MENSAJE_DE_VALIDACION,
        ),
      alDescartar: () => {
        avisarExito('Se descartó el borrador.')
        alCerrar()
      },
    })
  const yaNoEsta = descartado ? null : noDisponibleAlDescartar(esperada)
  return (
    <Confirmar
      abierto={abierto}
      alCerrar={alCerrar}
      alConfirmar={confirmar}
      titulo={tituloDelDescarte(origen.nombre)}
      descripcion={descripcionDelDescarte(formatearFechaHora(nombrado))}
      etiquetaConfirmar="Descartar borrador"
      enCurso={enCurso || recargando}
      deshabilitado={conflicto !== null || yaNoEsta !== null}
    >
      {yaNoEsta ? <Aviso tono="peligro">{yaNoEsta}</Aviso> : null}
      {conflicto && !yaNoEsta ? (
        <AvisoDeConflicto
          mensaje={conflicto}
          alRecargar={recargar}
          enCurso={recargando}
          detalle="No se descartó nada. Recarga para ver el borrador que quedó."
        />
      ) : null}
      {aviso ? <Aviso tono="peligro">{aviso}</Aviso> : null}
    </Confirmar>
  )
}
