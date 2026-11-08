'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { avisarExito } from '@/shared/ui/toasts'
import { publicarBorrador } from '../actions/publicar-borrador'
import { useFormularioDePublicacion } from '../hooks/use-formulario-de-publicacion'
import { CampoDeNota, ID_DE_LA_NOTA } from './campo-de-nota'

type Props = {
  abierto: boolean
  alCerrar: () => void
  origen: { id: string; nombre: string }
  // La publicada que la pestaña leyó (nula si el origen no tiene) y la hora del borrador (4.21-3b-1): la base las compara.
  publicadaId: string | null
  borradorActualizadoEn: string | null
  // Ya no se puede publicar (el borrador no está, o se publicó otra después de que empezó).
  noDisponible: string | null
}

const MENSAJE_DE_VALIDACION = 'Revisa la nota.'

// «Publicar el borrador» (`?panel=publicar-formula`): la nota y «Publicar». El contrato del modal (preguntar antes de cerrar con algo escrito, no cerrarse mientras
// publica, el conflicto con «Recargar» que conserva la nota) es de `ModalDeFormulario`; el mensaje del conflicto es el de la base, tal cual. Quien lo monta le da una
// `key` por apertura.
// La versión del formulario es la publicada y la hora del borrador: un conflicto se va cuando «Recargar» trae otra cualquiera. Sin borrador no se manda nada
// (`noDisponible` lo dice).
export function ModalDePublicar(props: Props) {
  const { abierto, alCerrar, origen, publicadaId, borradorActualizadoEn, noDisponible } = props
  const publicar = useAction(publicarBorrador)
  const formulario = useFormularioDePublicacion({
    abierto,
    notaInicial: '',
    esperada: `${publicadaId ?? ''}:${borradorActualizadoEn ?? ''}`,
    pedir: (nota) =>
      enviarAccion(
        publicar.executeAsync({
          origenId: origen.id,
          nota,
          publicadaEsperada: publicadaId,
          actualizadoEsperado: borradorActualizadoEn ?? '',
        }),
        MENSAJE_DE_VALIDACION,
      ),
    alGuardar: () => {
      avisarExito('Se publicó el borrador.')
      alCerrar()
    },
  })
  return (
    <ModalDeFormulario
      id="publicar-formula"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Publicar el borrador"
      descripcion={`Pasa a ser la versión con la que se cotiza en ${origen.nombre}. Las cotizaciones guardadas siguen con la suya.`}
      focoInicial={() => document.getElementById(ID_DE_LA_NOTA)}
      formulario={formulario}
      noDisponible={formulario.guardado ? null : noDisponible}
      detalleDelConflicto="No se publicó nada. La nota que escribiste sigue acá."
      guardar={{ etiqueta: 'Publicar', enCurso: 'Publicando…' }}
    >
      <CampoDeNota formulario={formulario} />
    </ModalDeFormulario>
  )
}
