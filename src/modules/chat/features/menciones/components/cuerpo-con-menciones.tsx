'use client'

import { partirCuerpo, type Referencia } from '../../../entities/menciones'
import type { Mensaje } from '../../../entities/mensajes'
import { ELIMINADO, referenciaDeFicha } from '../../../entities/referencias'
import type { ContextoDeMenciones } from '../contexto-de-menciones'
import type { ContextoDeFichas } from '../../fichas/contexto-de-fichas'
import { FichaDelMensaje as FichaDeTareaOEvento } from '../../fichas/components/ficha-del-mensaje'
import { ChipDeMencion } from './chip-de-mencion'

function FichaDelMensaje({
  mensaje,
  menciones,
  fichas,
  usuarioId,
}: {
  mensaje: Mensaje
  menciones: ContextoDeMenciones
  fichas: ContextoDeFichas
  usuarioId: string
}) {
  const ficha = mensaje.ficha
  if (ficha === null) {
    return null
  }
  if (ficha.tipo === 'tarea' || ficha.tipo === 'evento') {
    return (
      <FichaDeTareaOEvento clase={ficha.tipo} id={ficha.id} usuarioId={usuarioId} fichas={fichas} />
    )
  }
  const referencia = referenciaDeFicha(ficha)
  return (
    <p>
      {referencia === null ? (
        // La FK quedó nula (se purgó): «Eliminado».
        <ChipDeMencion
          referencia={{ clase: ficha.tipo, id: '' }}
          estado={ELIMINADO}
          menciones={menciones}
        />
      ) : (
        <ChipDeMencion
          referencia={referencia}
          estado={menciones.estadoDe(referencia)}
          menciones={menciones}
        />
      )}
    </p>
  )
}

// El cuerpo de un mensaje: el texto va como texto (nunca HTML, con sus saltos de línea) y cada mención, como su chip o su aviso. Una ficha de lead,
// vehículo o cotización se dibuja como una mención; una de tarea o de evento, como su ficha (7.10-3).
export function CuerpoConMenciones({
  mensaje,
  menciones,
  fichas,
  usuarioId,
}: {
  mensaje: Mensaje
  menciones: ContextoDeMenciones
  fichas: ContextoDeFichas
  usuarioId: string
}) {
  const trozos = mensaje.cuerpo === null ? [] : partirCuerpo(mensaje.cuerpo)
  return (
    <>
      {mensaje.cuerpo === null && mensaje.ficha !== null ? null : (
        <p className="whitespace-pre-wrap">
          {trozos.map((trozo, i) => {
            if (trozo.tipo === 'texto') {
              return trozo.texto
            }
            const referencia: Referencia = { clase: trozo.clase, id: trozo.id }
            return (
              <ChipDeMencion
                key={`${String(i)}:${trozo.token}`}
                referencia={referencia}
                estado={menciones.estadoDe(referencia)}
                menciones={menciones}
              />
            )
          })}
        </p>
      )}
      <FichaDelMensaje
        mensaje={mensaje}
        menciones={menciones}
        fichas={fichas}
        usuarioId={usuarioId}
      />
    </>
  )
}
