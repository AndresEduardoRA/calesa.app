'use client'

import { useId, useState } from 'react'
import type { BaseDeEnlace } from '../../calendario/enlace-de-panel'
import { ListaDeTareasSinFechaDiferida } from './diferidos'

type Props = { base: BaseDeEnlace }

// «Tareas sin fecha»: una sección plegable bajo el calendario, cerrada al entrar. Se lee al abrirla y, al cerrarla, lo cargado se descarta: reabrirla vuelve a
// leer (así una tarea que se completó o se creó desde un panel no queda vieja). El calendario no dibuja una tarea sin fecha: ésta es su lugar.
export function TareasSinFecha({ base }: Props) {
  const [abierta, setAbierta] = useState(false)
  const id = useId()
  return (
    <section aria-labelledby={`${id}-titulo`} className="grid gap-2">
      <h2 id={`${id}-titulo`} className="text-(length:--text-base) font-semibold">
        <button
          type="button"
          aria-expanded={abierta}
          aria-controls={`${id}-lista`}
          className="inline-flex min-h-11 items-center gap-2 md:min-h-9"
          onClick={() => {
            setAbierta((antes) => !antes)
          }}
        >
          <span aria-hidden="true">{abierta ? '▾' : '▸'}</span>
          Tareas sin fecha
        </button>
      </h2>
      <div id={`${id}-lista`} hidden={!abierta}>
        {abierta ? <ListaDeTareasSinFechaDiferida base={base} /> : null}
      </div>
    </section>
  )
}
