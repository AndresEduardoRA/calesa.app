'use client'

import { Button } from '@/shared/ui/button'
import type { FiltroDeLista, PaginaDeNotificaciones } from '../../../entities/notificacion'
import { useAbrirAviso } from '../hooks/use-abrir-aviso'
import { useListaDeNotificaciones } from '../hooks/use-lista-de-notificaciones'
import { PieDeLaLista } from './pie-de-la-lista'
import { VacioDeLaLista } from './vacio-de-la-lista'
import { FilaDeNotificacion, type AccionesPorTipo } from './fila-de-notificacion'

type Props = {
  ver: FiltroDeLista
  usuarioId: string
  inicial: PaginaDeNotificaciones
  disponibles: readonly string[]
  acciones?: AccionesPorTipo
  alVerTodas: () => void
}

// Las filas de `/notificaciones` de un filtro, con «Marcar todas como leídas» y «Ver más» por cursor hasta el tope.
// La pantalla lo monta con `key={ver}`: cambiar de filtro empieza de cero con la página que leyó el servidor.
export function CuerpoDeLaLista({
  ver,
  usuarioId,
  inicial,
  disponibles,
  acciones,
  alVerTodas,
}: Props) {
  const lista = useListaDeNotificaciones({ ver, usuarioId, inicial })
  const { leidasAqui, abrir } = useAbrirAviso()

  if (lista.filas.length === 0) {
    return <VacioDeLaLista ver={ver} alVerTodas={alVerTodas} />
  }

  return (
    <div className="grid min-w-0 gap-3">
      {lista.hayNoLeidas ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Button
            variant="outline"
            className="h-11 md:h-9"
            disabled={lista.marcando}
            onClick={() => void lista.marcarTodas()}
          >
            {lista.marcando ? 'Marcando…' : 'Marcar todas como leídas'}
          </Button>
        </div>
      ) : null}
      {lista.quedanSinMarcar ? (
        <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
          Quedan más sin marcar. Vuelve a pulsar «Marcar todas como leídas».
        </p>
      ) : null}
      <ul className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-0.5 rounded-(--radius-card) border border-(--color-border) bg-(--color-surface) p-1">
        {lista.filas.map((aviso) => (
          <FilaDeNotificacion
            key={aviso.id}
            aviso={aviso}
            disponibles={disponibles}
            acciones={acciones}
            leidaAqui={leidasAqui.has(aviso.id)}
            alAbrir={abrir}
          />
        ))}
      </ul>
      <PieDeLaLista
        filas={lista.filas.length}
        hayMas={lista.hayMas}
        cargandoMas={lista.cargandoMas}
        error={lista.errorAlCargarMas}
        verMas={() => void lista.verMas()}
      />
    </div>
  )
}
