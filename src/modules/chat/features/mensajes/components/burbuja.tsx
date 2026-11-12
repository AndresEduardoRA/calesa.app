'use client'

import { formatearHora } from '@/shared/lib/fechas'
import { Button } from '@/shared/ui/button'
import { cn } from 'cn'
import type { Mensaje } from '../../../entities/mensajes'
import { CuerpoConMenciones } from '../../menciones/components/cuerpo-con-menciones'
import type { AccionesDelMensaje } from '../acciones-del-hilo'
import { CitaEnLaBurbuja } from './cita-de-respuesta'
import { EditarEnLinea } from './editar-en-linea'
import { MenuDelMensaje } from './menu-del-mensaje'

type Props = {
  mensaje: Mensaje
  propio: boolean
  // En un grupo o en el canal del equipo se dice quién escribió; en una directa se sabe.
  mostrarAutor: boolean
  zona: string
  alReintentar: (id: string) => void
  acciones: AccionesDelMensaje
}

// «editado» y la hora; mientras se envía, «Enviando…»; si no llegó, la hora no se dice (el aviso de abajo).
function PieDeLaBurbuja({ mensaje, zona }: { mensaje: Mensaje; zona: string }) {
  return (
    <p className="mt-1 flex flex-wrap items-center justify-end gap-x-2 text-(length:--text-xs) text-(--color-ink-soft)">
      {mensaje.editadoEn && mensaje.eliminadoEn === null ? <span>editado</span> : null}
      {mensaje.estado === 'enviando' ? <span>Enviando…</span> : null}
      {mensaje.estado === 'enviado' ? (
        <span>{formatearHora(mensaje.creadoEn, { zona })}</span>
      ) : null}
    </p>
  )
}

function AvisoDeFallo({
  mensaje,
  alReintentar,
}: {
  mensaje: Mensaje
  alReintentar: (id: string) => void
}) {
  return (
    <div className="mt-1 flex flex-wrap items-center justify-end gap-2 text-(length:--text-xs) text-(--color-peligro-ink)">
      {mensaje.motivoDelFallo ? <span>{mensaje.motivoDelFallo}</span> : null}
      <Button
        type="button"
        variant="outline"
        className="min-h-11 md:min-h-8"
        onClick={() => {
          alReintentar(mensaje.id)
        }}
      >
        No enviado · Reintentar
      </Button>
    </div>
  )
}

// Lo de adentro: la cita si responde a otro, y el texto (o «Mensaje eliminado», o el editor si es el que se está editando).
function TextoDeLaBurbuja({
  mensaje,
  acciones,
}: {
  mensaje: Mensaje
  acciones: AccionesDelMensaje
}) {
  if (mensaje.eliminadoEn !== null) {
    return <p className="text-(--color-ink-soft) italic">Mensaje eliminado</p>
  }
  return (
    <>
      {mensaje.respondeAId !== null ? <CitaEnLaBurbuja cita={mensaje.responde} /> : null}
      {acciones.editandoId === mensaje.id ? (
        <EditarEnLinea mensaje={mensaje} acciones={acciones} />
      ) : (
        <CuerpoConMenciones
          mensaje={mensaje}
          menciones={acciones.menciones}
          fichas={acciones.fichas}
          usuarioId={acciones.usuarioId}
        />
      )}
    </>
  )
}

// Un mensaje del hilo: el propio a la derecha, el ajeno a la izquierda. El texto es siempre texto (nunca HTML) y respeta los saltos de línea. El
// estado de un envío va en palabras, no sólo en color.
export function Burbuja({ mensaje, propio, mostrarAutor, zona, alReintentar, acciones }: Props) {
  const menu = <MenuDelMensaje mensaje={mensaje} acciones={acciones} />
  return (
    <li className={cn('flex min-w-0 flex-col', propio ? 'items-end' : 'items-start')}>
      <div className="flex w-full min-w-0 items-start gap-1">
        {propio ? <div className="ml-auto">{menu}</div> : null}
        <div
          className={cn(
            'max-w-[85%] min-w-0 rounded-(--radius-card) px-3 py-2 text-(length:--text-base) break-words',
            propio
              ? 'bg-(--color-primario-soft) text-(--color-ink)'
              : 'bg-(--color-surface-3) text-(--color-ink)',
          )}
        >
          {mostrarAutor && !propio ? (
            <p className="text-(length:--text-xs) font-semibold text-(--color-ink-soft)">
              {mensaje.autorNombre ?? 'Alguien del equipo'}
            </p>
          ) : null}
          <TextoDeLaBurbuja mensaje={mensaje} acciones={acciones} />
          <PieDeLaBurbuja mensaje={mensaje} zona={zona} />
        </div>
        {propio ? null : menu}
      </div>
      {mensaje.estado === 'fallido' ? (
        <AvisoDeFallo mensaje={mensaje} alReintentar={alReintentar} />
      ) : null}
    </li>
  )
}
