'use client'

import { useRouter } from 'next/navigation'
import { parseAsStringLiteral, useQueryState } from 'nuqs'
import { EstadoError } from '@/shared/ui/estados'
import { PestanasConDesborde } from '@/shared/ui/pestanas-con-desborde'
import {
  FILTROS_DE_LISTA,
  type FiltroDeLista,
  type PaginaDeNotificaciones,
} from '../../../entities/notificacion'
import type { ErrorApp } from '@/shared/lib/errores'
import { CuerpoDeLaLista } from './cuerpo-de-la-lista'
import type { AccionesPorTipo } from './fila-de-notificacion'

type Props = {
  // El filtro que leyó el servidor (`?ver=`) y su primera página: o el error de leerla.
  ver: FiltroDeLista
  usuarioId: string
  inicial: { ok: true; data: PaginaDeNotificaciones } | { ok: false; error: ErrorApp }
  disponibles: readonly string[]
  acciones?: AccionesPorTipo
}

const PESTANAS = [
  { clave: 'todas', titulo: 'Todas' },
  { clave: 'por-accionar', titulo: 'Por accionar' },
] as const satisfies readonly { clave: FiltroDeLista; titulo: string }[]

// `/notificaciones`: el filtro vive en la URL (`?ver=`, el servidor lee la primera página) y la lista se reinicia al
// cambiarlo. Si la primera lectura falló, «Reintentar» vuelve a pedirla al servidor.
export function ListaDeNotificaciones({ ver, usuarioId, inicial, disponibles, acciones }: Props) {
  const router = useRouter()
  const [, setVer] = useQueryState(
    'ver',
    parseAsStringLiteral(FILTROS_DE_LISTA).withDefault('todas').withOptions({ shallow: false }),
  )

  return (
    <div className="grid min-w-0 gap-4">
      <PestanasConDesborde
        pestanas={PESTANAS}
        valor={ver}
        alElegir={(clave) => {
          void setVer(clave === 'por-accionar' ? 'por-accionar' : null)
        }}
      />
      {inicial.ok ? (
        <CuerpoDeLaLista
          key={ver}
          ver={ver}
          usuarioId={usuarioId}
          inicial={inicial.data}
          disponibles={disponibles}
          acciones={acciones}
          alVerTodas={() => void setVer(null)}
        />
      ) : (
        <EstadoError
          alReintentar={() => {
            router.refresh()
          }}
          descripcion={inicial.error.mensaje}
        />
      )}
    </div>
  )
}
