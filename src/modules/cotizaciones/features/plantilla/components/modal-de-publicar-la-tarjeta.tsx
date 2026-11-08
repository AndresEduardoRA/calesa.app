'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import { avisarExito } from '@/shared/ui/toasts'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { LARGO_MAXIMO_DE_NOTA_DE_PLANTILLA } from '../../../entities/plantilla/escritura-de-la-plantilla'
import {
  descripcionDePublicar,
  noDisponibleAlPublicar,
  tituloDePublicar,
} from '../../../entities/plantilla/publicar-la-plantilla'
import { publicarBorrador } from '../actions/publicar-borrador'
import { useFormularioDePublicacionDeLaTarjeta } from '../hooks/use-formulario-de-publicacion-de-la-tarjeta'
import { CampoConContador } from './campo-con-contador'

type Props = {
  abierto: boolean
  alCerrar: () => void
  origen: { id: string; nombre: string }
  // El `actualizadoEn` del borrador que la pestaña leyó ahora (nulo: ya no está). La base lo compara.
  esperada: string | null
}

const MENSAJE_DE_VALIDACION = 'Revisa la nota.'
const ID_DE_LA_NOTA = 'nota-de-la-version-de-la-tarjeta'

// «Publicar la tarjeta de <Origen>» (`?panel=publicar-tarjeta`, 4.19-3c): la nota de la versión (obligatoria, P4) y «Publicar». El contrato del modal (preguntar antes de
// cerrar con algo escrito, no cerrarse mientras publica, el conflicto con «Recargar» que conserva la nota, el que ya no se puede publicar) es de `ModalDeFormulario`;
// el mensaje del conflicto es el de la base, tal cual, y no dice quién (P1). Quien lo monta le da una `key` por apertura y lo deja **fuera** de la `key` del editor: si no,
// «Recargar» lo remontaría y se perdería la nota.
export function ModalDePublicarLaTarjeta({ abierto, alCerrar, origen, esperada }: Props) {
  const publicar = useAction(publicarBorrador)
  // Tras «Recargar» sin borrador, la descripción sigue nombrando el último que tuvo.
  const nombrada = useUltimo(esperada)
  const formulario = useFormularioDePublicacionDeLaTarjeta({
    abierto,
    esperada,
    pedir: (nota, laEsperada) =>
      enviarAccion(
        publicar.executeAsync({ origenId: origen.id, esperada: laEsperada, nota }),
        MENSAJE_DE_VALIDACION,
      ),
    alGuardar: () => {
      avisarExito('Se publicó la tarjeta.')
      alCerrar()
    },
  })
  return (
    <ModalDeFormulario
      id="publicar-tarjeta"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={tituloDePublicar(origen.nombre)}
      descripcion={
        nombrada === null
          ? undefined
          : descripcionDePublicar(origen.nombre, formatearFechaHora(nombrada))
      }
      focoInicial={() => document.getElementById(ID_DE_LA_NOTA)}
      formulario={formulario}
      noDisponible={formulario.guardado ? null : noDisponibleAlPublicar(esperada)}
      detalleDelConflicto="No se publicó nada. La nota que escribiste sigue aquí."
      guardar={{ etiqueta: 'Publicar', enCurso: 'Publicando…' }}
    >
      <CampoConContador
        nombre={ID_DE_LA_NOTA}
        donde="nota"
        etiqueta="Nota de la versión"
        valor={formulario.nota}
        tope={LARGO_MAXIMO_DE_NOTA_DE_PLANTILLA}
        multilinea
        motivo={formulario.motivoDeNota ?? undefined}
        alCambiar={formulario.escribir}
      />
    </ModalDeFormulario>
  )
}
