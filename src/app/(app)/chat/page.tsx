import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import { leerAjustes } from '@/modules/empresa'
import { puede, requerirSesion } from '@/modules/equipo'
import {
  abrirConversacionCon,
  idDeConversacionEnLaUrl,
  idDeUsuarioEnLaUrl,
  leerConversacion,
  leerPaginaDeConversaciones,
} from '@/modules/chat'
import { ListaDeConversaciones, ZonaDelHilo } from '@/modules/chat/pantallas/chat'
import { ZONA_POR_DEFECTO } from '@/shared/lib/fechas'
import { TAMANO_DE_VER_MAS } from '@/shared/lib/paginacion'
import { redirigir } from '@/shared/lib/navegacion'
import { unParametro } from '@/shared/lib/rutas'
import { Aviso } from '@/shared/ui/aviso'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EsqueletoDeChat } from './esqueleto-de-chat'

export const metadata: Metadata = { title: 'Chat' }

async function Conversaciones({ parametros }: { parametros: PageProps<'/chat'>['searchParams'] }) {
  await connection()
  const [sesion, pedidos] = await Promise.all([requerirSesion(), parametros])
  if (!puede(sesion.permisos, 'chat.participar')) {
    return (
      <EstadoSinPermiso descripcion="No tienes permiso para usar el chat. Pídeselo a quien administra los roles." />
    )
  }
  // `?con=<persona>` (el enlace «Escribirle por chat» de leads): se resuelve antes de leer nada. Con éxito, a la directa; si la base lo
  // niega, lo dice arriba y la pantalla de siempre queda debajo. `redirigir` corta la ejecución: va fuera de todo `try`.
  const con = idDeUsuarioEnLaUrl(unParametro(pedidos['con']))
  let sinAbrir: string | null = null
  if (con === sesion.usuarioId) {
    sinAbrir = 'Elige a otra persona del equipo.'
  } else if (con) {
    const abierta = await abrirConversacionCon(con)
    if (abierta.ok) redirigir(`/chat?c=${abierta.data.id}`)
    sinAbrir = abierta.error
  }
  // Una `?c=` ilegible es como no tener selección.
  const abierta = idDeConversacionEnLaUrl(unParametro(pedidos['c']))
  const [lista, conversacion, ajustes] = await Promise.all([
    leerPaginaDeConversaciones({ tamano: TAMANO_DE_VER_MAS }),
    abierta ? leerConversacion(sesion.usuarioId, abierta) : null,
    leerAjustes(),
  ])
  const zona = (ajustes.ok ? ajustes.data.ajustes.zonaHoraria : null) ?? ZONA_POR_DEFECTO
  // En escritorio, las dos columnas; en el celular, una sola pantalla: con `?c=` el hilo, sin ella la lista.
  const pantalla = (
    <div className="grid h-[calc(100dvh-var(--topbar)-2rem)] overflow-hidden rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) md:h-[calc(100dvh-var(--topbar)-3rem)] md:grid-cols-[22rem_1fr]">
      <aside
        className={`min-h-0 flex-col border-r border-(--color-line) md:flex ${abierta ? 'hidden' : 'flex'}`}
      >
        <ListaDeConversaciones
          usuarioId={sesion.usuarioId}
          inicial={lista}
          abierta={abierta}
          zona={zona}
          puedeGlobal={puede(sesion.permisos, 'chat.global')}
        />
      </aside>
      <div className={`min-h-0 flex-col md:flex ${abierta ? 'flex' : 'hidden'}`}>
        <ZonaDelHilo
          key={abierta ?? 'ninguna'}
          idSolicitado={abierta}
          lectura={conversacion}
          usuarioId={sesion.usuarioId}
          zona={zona}
          puedeModerar={puede(sesion.permisos, 'chat.moderar')}
          puedeAsignar={puede(sesion.permisos, 'agenda.tareas.asignar')}
          puedePublicar={puede(sesion.permisos, 'agenda.eventos.publicar')}
        />
      </div>
    </div>
  )
  if (!sinAbrir) return pantalla
  return (
    <div className="flex flex-col gap-3">
      <Aviso tono="peligro">{sinAbrir}</Aviso>
      {pantalla}
    </div>
  )
}

// El chat interno: mis conversaciones a la izquierda y el hilo abierto (`?c=<conversación>`) a la derecha; en el celular, dos
// pantallas. Sin `chat.participar` la pantalla lo dice y no lee nada de la base.
export default function PaginaDeChat({ searchParams }: PageProps<'/chat'>) {
  return (
    <Suspense fallback={<EsqueletoDeChat />}>
      <Conversaciones parametros={searchParams} />
    </Suspense>
  )
}
