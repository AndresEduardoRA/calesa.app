'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { fechaRelativa } from '@/shared/lib/fechas'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
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
// diálogo, que no se cierra; entró: «Se descartó el borrador.» y la pestaña se vuelve a leer sin él. Manda la hora del borrador que nombra (4.21-3b-1): si otra persona
// lo guardó, el texto de la base con «Recargar», que trae el de ahora (el diálogo pasa a nombrarlo).
export function DescartarBorrador({ abierto, alCerrar, origenId, borrador }: Props) {
  const { zonaHoraria } = useRegional()
  const router = useRouter()
  const [recargando, recargarPagina] = useTransition()
  const descartar = useAction(descartarBorrador)
  const { enCurso, aviso, conflicto, confirmar } = useDescarteDelBorrador({
    version: borrador.actualizadoEn,
    pedir: () =>
      enviarAccion(
        descartar.executeAsync({ origenId, actualizadoEsperado: borrador.actualizadoEn }),
        MENSAJE_DE_VALIDACION,
      ),
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
      {conflicto ? (
        <Aviso tono="peligro">
          <span className="grid gap-2">
            <span>{conflicto}</span>
            <span>
              <Button
                type="button"
                variant="outline"
                className="min-h-11 md:min-h-9"
                disabled={recargando}
                onClick={() => {
                  recargarPagina(() => {
                    router.refresh()
                  })
                }}
              >
                {recargando ? 'Recargando…' : 'Recargar'}
              </Button>
            </span>
          </span>
        </Aviso>
      ) : null}
    </Confirmar>
  )
}
