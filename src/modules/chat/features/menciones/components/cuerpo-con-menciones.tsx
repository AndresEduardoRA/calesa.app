'use client'

import { partirCuerpo, type Referencia } from '../../../entities/menciones'
import type { Mensaje } from '../../../entities/mensajes'
import { ELIMINADO, referenciaDeFicha } from '../../../entities/referencias'
import type { ContextoDeMenciones } from '../contexto-de-menciones'
import { ChipDeMencion } from './chip-de-mencion'

// La ficha de tarea o de evento la dibuja el 7.10-3: mientras tanto sólo dice qué es.
const NOMBRE_DE_FICHA = { tarea: 'Tarea', evento: 'Evento' } as const

function FichaDelMensaje({
  mensaje,
  menciones,
}: {
  mensaje: Mensaje
  menciones: ContextoDeMenciones
}) {
  const ficha = mensaje.ficha
  if (ficha === null) {
    return null
  }
  if (ficha.tipo === 'tarea' || ficha.tipo === 'evento') {
    return (
      <p className="text-(--color-ink-soft)">
        {NOMBRE_DE_FICHA[ficha.tipo]} · {ficha.id === null ? 'Eliminada' : 'Cargando…'}
      </p>
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
// vehículo o cotización se dibuja como una mención.
export function CuerpoConMenciones({
  mensaje,
  menciones,
}: {
  mensaje: Mensaje
  menciones: ContextoDeMenciones
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
      <FichaDelMensaje mensaje={mensaje} menciones={menciones} />
    </>
  )
}
