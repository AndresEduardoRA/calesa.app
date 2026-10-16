'use client'

import { HistoryIcon } from 'lucide-react'
import { EstadoVacio } from '@/shared/ui/estados'
import type { ImportacionReciente } from '../../../entities/importacion/deshacer'
import { FilaDeImportacionReciente } from './fila-de-importacion-reciente'

type Props = {
  recientes: ImportacionReciente[]
  // El instante del servidor al dibujar: el mismo al hidratar.
  ahora: string
  zona: string
}

// «Tus importaciones recientes» (`/leads/importar`): las propias de las últimas 24 h, cada una con su
// «Deshacer». Sirve aunque se haya cerrado la pestaña a mitad de una importación.
export function ImportacionesRecientes({ recientes, ahora, zona }: Props) {
  return (
    <section aria-labelledby="importaciones-recientes" className="grid max-w-3xl gap-2">
      <h2 id="importaciones-recientes" className="text-(length:--text-lg) font-semibold">
        Tus importaciones recientes
      </h2>
      {recientes.length === 0 ? (
        <EstadoVacio
          compacto
          Icono={HistoryIcon}
          titulo="No importaste nada en las últimas 24 horas"
          descripcion="Cada importación aparece acá y la puedes deshacer durante 24 horas."
        />
      ) : (
        <ul className="rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) px-4">
          {recientes.map((importacion) => (
            <FilaDeImportacionReciente
              key={importacion.id}
              importacion={importacion}
              ahora={ahora}
              zona={zona}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
