'use client'

import { Button } from '@/shared/ui/button'
import { avisarExito } from '@/shared/ui/toasts'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { filasParaPublicar } from '../../../entities/tablas/edicion'
import type { PublicacionDeTabla } from '../../../entities/tablas/publicacion'
import type { TablaDeReferencia } from '../../../entities/tablas/lectura'
import { formatearNumero } from '@/shared/lib/formato'
import { destinoDeCamino } from '../../../entities/tablas/vista-del-editor'
import type { BorradorDeTablaEnUso } from '../hooks/use-borrador-de-tabla'
import type { FilasDeTabla } from '../hooks/use-filas-de-tabla'
import { ModalDePublicarTablaDiferido } from './diferidos'

type Props = {
  tabla: TablaDeReferencia
  edicion: FilasDeTabla
  borrador: BorradorDeTablaEnUso
}

export const PANEL_PUBLICAR_TABLA = 'publicar-tabla'
const SIN_CAMBIOS = 'No hay cambios por publicar.'
const CON_ERROR = 'Corrige la celda marcada para publicar.'

const avisoDePublicada = (nombre: string, { version, formulas }: PublicacionDeTabla) =>
  `Publicaste la versión ${formatearNumero(version, { decimales: 0 })} de «${nombre}».${
    formulas.length > 0 ? ' Las fórmulas que la usan pasaron a su versión siguiente.' : ''
  }`

// «Publicar» del editor de tablas (4.23-3, C9): apagado sin cambios o con una celda marcada; abre `?panel=publicar-tabla`. Entró: se cierra, se avisa y la ruta
// revalidada vuelve a montar el editor con la versión nueva.
export function PublicarTabla({ tabla, edicion, borrador }: Props) {
  const panel = usePanelPorUrl(PANEL_PUBLICAR_TABLA)
  const montado = useAbiertoAlgunaVez(panel.abierto)
  const { estado, cambios, error } = edicion
  const bloqueo = !cambios
    ? { mensaje: SIN_CAMBIOS, conCelda: false }
    : error
      ? { mensaje: CON_ERROR, conCelda: error.conCelda }
      : null
  return (
    <>
      {cambios && error ? (
        <p className="text-(length:--text-sm) text-(--color-peligro-ink)">{CON_ERROR}</p>
      ) : null}
      <Button
        type="button"
        className="min-h-11 md:min-h-9"
        disabled={bloqueo !== null}
        onClick={() => {
          panel.abrir()
        }}
      >
        Publicar
      </Button>
      {montado ? (
        <ModalDePublicarTablaDiferido
          abierto={panel.abierto}
          alCerrar={panel.cerrar}
          tabla={tabla}
          filas={filasParaPublicar(estado.filas)}
          bloqueo={bloqueo}
          alEnviar={borrador.pausar}
          alNoEntrar={borrador.reanudar}
          alPublicar={(publicacion) => {
            panel.cerrar()
            avisarExito(avisoDePublicada(tabla.nombre, publicacion))
          }}
          alIrALaCelda={(rechazo) => {
            panel.cerrar()
            const destino = rechazo
              ? destinoDeCamino(tabla.columnas, estado, rechazo)
              : edicion.error
            if (destino) edicion.irA(destino)
          }}
        />
      ) : null}
    </>
  )
}
