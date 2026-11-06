'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { fechaRelativa } from '@/shared/lib/fechas'
import { Aviso } from '@/shared/ui/aviso'
import { Confirmar } from '@/shared/ui/confirmar'
import { useRegional } from '@/shared/ui/regional'
import { avisarExito } from '@/shared/ui/toasts'
import { descripcionDelDescarte, tituloDelDescarte } from '../../../entities/formula/descarte'
import type { BorradorDelOrigen, ConAutor } from '../../../entities/formula/versiones'
import { descartarBorrador } from '../actions/descartar-borrador'
import { useDescarteDelBorrador } from '../hooks/use-descarte-del-borrador'

type Props = {
  abierto: boolean
  alCerrar: () => void
  origenId: string
  // El que se descarta: se fija al abrir (mientras se cierra tras descartar, el texto no cambia).
  borrador: Pick<ConAutor<BorradorDelOrigen>, 'autor' | 'actualizadoEn'>
}

const MENSAJE_DE_VALIDACION = 'No pudimos leer el pedido. Recarga y vuelve a intentar.'

// «Descartar el borrador de <autor>» (`?panel=descartar-borrador`, 4.20-2c): lo irreversible se confirma nombrando el borrador. Lo que no entró queda dentro del
// diálogo, que no se cierra; entró: «Se descartó el borrador.» y la pestaña se vuelve a leer sin él.
export function DescartarBorrador({ abierto, alCerrar, origenId, borrador }: Props) {
  const { zonaHoraria } = useRegional()
  const descartar = useAction(descartarBorrador)
  const { enCurso, aviso, confirmar } = useDescarteDelBorrador({
    pedir: () => enviarAccion(descartar.executeAsync({ origenId }), MENSAJE_DE_VALIDACION),
    alDescartar: () => {
      avisarExito('Se descartó el borrador.')
      alCerrar()
    },
  })
  return (
    <Confirmar
      abierto={abierto}
      alCerrar={alCerrar}
      alConfirmar={confirmar}
      titulo={tituloDelDescarte(borrador.autor)}
      descripcion={descripcionDelDescarte(
        fechaRelativa(borrador.actualizadoEn, { zona: zonaHoraria }),
      )}
      etiquetaConfirmar="Descartar borrador"
      enCurso={enCurso}
    >
      {aviso ? <Aviso tono="peligro">{aviso}</Aviso> : null}
    </Confirmar>
  )
}
