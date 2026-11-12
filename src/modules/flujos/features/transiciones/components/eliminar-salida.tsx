'use client'

import { Confirmar } from '@/shared/ui/confirmar'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // La descripción de la que se quita, «Embarcar» a «Embarcado» (la última que se vio, mientras el diálogo se va).
  accion: string | null
  destino: string | null
  enCurso: boolean
  // Confirmado: quita y dice si pudo (si no, el aviso ya salió).
  alQuitar: () => Promise<boolean>
  // A dónde vuelve el foco al cerrar: el «Quitar» de esa fila, que sigue ahí si no se quitó.
  focoAlCerrar: () => HTMLElement | boolean
}

// «Quitar» una salida (`?eliminar=salida&salida=<id>`): lo irreversible pide confirmar nombrando la salida. Quitarla no mueve a nadie: las unidades que ya
// están en la fase de destino se quedan donde están.
export function EliminarSalida({
  abierto,
  alCerrar,
  accion,
  destino,
  enCurso,
  alQuitar,
  focoAlCerrar,
}: Props) {
  return (
    <Confirmar
      abierto={abierto}
      alCerrar={alCerrar}
      alConfirmar={async () => {
        await alQuitar()
        alCerrar()
      }}
      titulo={
        accion !== null && destino !== null
          ? `Quitar la salida «${accion}» a «${destino}»`
          : 'Quitar la salida'
      }
      descripcion={
        destino === null
          ? 'Desde esta fase ya no se podrá mover ahí. Las unidades que ya están ahí no se mueven.'
          : `Desde esta fase ya no se podrá mover a «${destino}». Las unidades que ya están ahí no se mueven.`
      }
      etiquetaConfirmar="Quitar salida"
      enCurso={enCurso}
      focoAlCerrar={focoAlCerrar}
    />
  )
}
