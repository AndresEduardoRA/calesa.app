'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { avisarExito } from '@/shared/ui/toasts'
import { notaDeRevertir, type VersionParaRevertir } from '../../../entities/formula/reversion'
import { revertirVersion } from '../actions/revertir-version'
import { useFormularioDePublicacion } from '../hooks/use-formulario-de-publicacion'
import { CampoDeNota, ID_DE_LA_NOTA } from './campo-de-nota'

type Props = {
  abierto: boolean
  alCerrar: () => void
  origenId: string
  // A cuál se revierte: se fija al abrir.
  version: VersionParaRevertir
  // La publicada que la pestaña leyó: tras «Recargar» llega la nueva y se puede volver a enviar.
  publicadaId: string
}

const MENSAJE_DE_VALIDACION = 'Revisa la nota.'

// «Revertir a la versión N» (`?panel=revertir-formula&version=<id>`): la nota viene escrita y «Revertir» publica la N+1 como copia de esa versión, con su diseño. El
// conflicto (otra persona publicó) es el mensaje de la base, tal cual; «Recargar» trae la publicada nueva y conserva la nota. Quien lo monta le da una `key` por apertura.
export function ModalDeRevertir({ abierto, alCerrar, origenId, version, publicadaId }: Props) {
  const revertir = useAction(revertirVersion)
  const formulario = useFormularioDePublicacion({
    abierto,
    notaInicial: notaDeRevertir(version.version),
    esperada: publicadaId,
    pedir: (nota) =>
      enviarAccion(
        revertir.executeAsync({
          origenId,
          versionId: version.id,
          nota,
          publicadaEsperada: publicadaId,
        }),
        MENSAJE_DE_VALIDACION,
      ),
    alGuardar: () => {
      avisarExito(`Se publicó una copia de la versión ${String(version.version)}.`)
      alCerrar()
    },
  })
  const n = String(version.version)
  return (
    <ModalDeFormulario
      id="revertir-formula"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={`Revertir a la versión ${n}`}
      descripcion={`Se publica una versión nueva, copia de la ${n} con su diseño, y con ella se cotiza desde ahora. El borrador no cambia.`}
      focoInicial={() => document.getElementById(ID_DE_LA_NOTA)}
      formulario={formulario}
      detalleDelConflicto="No se publicó nada. La nota que escribiste sigue acá."
      guardar={{ etiqueta: 'Revertir', enCurso: 'Revirtiendo…' }}
    >
      <CampoDeNota formulario={formulario} />
    </ModalDeFormulario>
  )
}
