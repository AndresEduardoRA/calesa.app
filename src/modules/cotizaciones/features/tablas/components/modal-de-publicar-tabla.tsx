'use client'

import { useAction } from 'next-safe-action/hooks'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { ModalDeFormulario } from '@/shared/ui/modal-de-formulario'
import type { PublicacionDeTabla } from '../../../entities/tablas/publicacion'
import { publicarTabla } from '../actions/publicar-tabla'
import { usePublicacionDeTabla, type CeldaRechazada } from '../hooks/use-publicacion-de-tabla'
import { CampoDeNotaDeTabla, ID_DE_LA_NOTA_DE_TABLA } from './campo-de-nota-de-tabla'

type Props = {
  abierto: boolean
  alCerrar: () => void
  tabla: { id: string; origenId: string | null; nombre: string; version: number }
  // La tabla entera en su orden (`filasParaPublicar()`).
  filas: Record<string, number | string | boolean>[]
  // Sin cambios o con una celda sin leer: no se manda nada.
  bloqueo: { mensaje: string; conCelda: boolean } | null
  // Antes de mandar y si no entró: el borrador deja de guardarse mientras se publica.
  alEnviar: () => void
  alNoEntrar: () => void
  alPublicar: (publicacion: PublicacionDeTabla) => void
  // Cierra el modal y lleva a la celda (la del primer error o la que la base rechazó).
  alIrALaCelda: (rechazo: CeldaRechazada | null) => void
}

const MENSAJE_DE_VALIDACION = 'Revisa la nota.'

function IrALaCelda({ mensaje, alIr }: { mensaje: string; alIr: (() => void) | null }) {
  return (
    <Aviso tono="peligro">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="min-w-0 break-words">{mensaje}</span>
        {alIr ? (
          <Button type="button" variant="outline" className="min-h-11 md:min-h-8" onClick={alIr}>
            Ir a la celda
          </Button>
        ) : null}
      </div>
    </Aviso>
  )
}

// «Publicar <nombre>» (`?panel=publicar-tabla`, 4.23-3, C9): la nota y «Publicar». Manda la tabla entera con la versión que se leyó; el PT409 y el 22023 de una celda llegan
// con el mensaje de la base tal cual. El contrato del modal (no cerrarse mientras publica, preguntar al cerrar con algo escrito, el conflicto con «Recargar») es de
// `ModalDeFormulario`.
export function ModalDePublicarTabla(props: Props) {
  const { abierto, alCerrar, tabla, filas, bloqueo } = props
  const publicar = useAction(publicarTabla)
  const formulario = usePublicacionDeTabla({
    abierto,
    version: tabla.version,
    bloqueo: bloqueo?.mensaje ?? null,
    pedir: async (nota) => {
      props.alEnviar()
      const envio = await enviarAccion(
        publicar.executeAsync({
          tablaId: tabla.id,
          origenId: tabla.origenId,
          filas,
          nota,
          versionEsperada: tabla.version,
        }),
        MENSAJE_DE_VALIDACION,
      )
      if (!envio.ok) props.alNoEntrar()
      return envio
    },
    alPublicar: props.alPublicar,
    alRecargar: alCerrar,
  })
  const { celda } = formulario
  return (
    <ModalDeFormulario
      id="publicar-tabla"
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={`Publicar ${tabla.nombre}`}
      descripcion="Las fórmulas publicadas que la usan pasan a su versión siguiente con estas filas; lo guardado de cada cotización no cambia."
      focoInicial={() => document.getElementById(ID_DE_LA_NOTA_DE_TABLA)}
      formulario={formulario}
      detalleDelConflicto="Al recargar se abre la versión nueva; tus cambios no vuelven."
      guardar={{ etiqueta: 'Publicar', enCurso: 'Publicando…' }}
    >
      {bloqueo && !formulario.guardado ? (
        <IrALaCelda
          mensaje={bloqueo.mensaje}
          alIr={bloqueo.conCelda ? () => props.alIrALaCelda(null) : null}
        />
      ) : null}
      {celda ? <IrALaCelda mensaje={celda.mensaje} alIr={() => props.alIrALaCelda(celda)} /> : null}
      <CampoDeNotaDeTabla formulario={formulario} />
    </ModalDeFormulario>
  )
}
