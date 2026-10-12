import type { ReactNode } from 'react'
import { MenuMovil } from './menu-movil'
import { BuscadorPendiente } from './buscador-pendiente'
import { ConmutadorLive } from './conmutador-live'

type Props = {
  nombreEmpresa: string
  // <Marca>, <BarraLateral> y <MenuUsuario> ya armados con los datos de la sesión.
  marca: ReactNode
  navegacion: ReactNode
  menuUsuario: ReactNode
  // El hueco de la barra superior para el tipo de cambio del día (`<TiposCambioVigentes>` de
  // `empresa`). Sin tipos de cambio vigentes no ocupa lugar.
  tipoCambio?: ReactNode
  // Lo que tiene que quedar a la vista en toda pantalla, pegado bajo la barra superior (el banner
  // de la perspectiva «ver como»). Quien lo llena decide si se muestra.
  aviso?: ReactNode
  children: ReactNode
}

// El marco de toda pantalla con sesión: barra lateral, barra superior y el contenido. No sabe de
// permisos ni de ajustes: recibe las piezas ya resueltas.
export function Marco({
  nombreEmpresa,
  marca,
  navegacion,
  menuUsuario,
  tipoCambio,
  aviso,
  children,
}: Props) {
  return (
    <div className="flex min-h-dvh flex-1">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-(--radius-md) bg-(--color-surface) px-3 py-2 text-(--color-ink) shadow-(--shadow-md) focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Saltar al contenido
      </a>

      <aside className="sticky top-0 hidden h-dvh w-(--sidebar) shrink-0 flex-col border-r border-(--color-line) bg-(--color-surface) md:flex">
        <div className="flex h-(--topbar) shrink-0 items-center border-b border-(--color-line) px-4">
          {marca}
        </div>
        <div className="flex-1 overflow-y-auto p-2">{navegacion}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-(--topbar) shrink-0 items-center gap-2 border-b border-(--color-line) bg-(--color-surface) px-2 md:px-5">
          <MenuMovil titulo={nombreEmpresa}>{navegacion}</MenuMovil>
          <BuscadorPendiente />
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {tipoCambio ? <div data-hueco="tipo-cambio">{tipoCambio}</div> : null}
            <ConmutadorLive />
            {menuUsuario}
          </div>
        </header>
        {aviso}
        <main id="contenido" className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
