'use client'

import { Button } from '@/shared/ui/button'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'

type Props = {
  paginas: readonly { indice: number; etiqueta: string }[]
  pagina: number
  alElegir: (pagina: number) => void
}

// Las páginas del editor de tablas (4.23-3, C7): 100 filas a la vez de lo que está en memoria, sin decir un total. Con una sola página, nada.
export function PaginasDelEditor({ paginas, pagina, alElegir }: Props) {
  if (paginas.length <= 1) return null
  return (
    <nav aria-label="Páginas de la tabla" className="flex flex-wrap items-end gap-2">
      <div className="w-48 max-w-full">
        <CampoSeleccion
          nombre="pagina-de-la-tabla"
          etiqueta="Filas"
          opciones={paginas.map((p) => ({ valor: String(p.indice), etiqueta: p.etiqueta }))}
          value={String(pagina)}
          onChange={(evento) => {
            alElegir(Number(evento.target.value))
          }}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 md:min-h-9"
        disabled={pagina === 0}
        onClick={() => {
          alElegir(pagina - 1)
        }}
      >
        Anterior
      </Button>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 md:min-h-9"
        disabled={pagina >= paginas.length - 1}
        onClick={() => {
          alElegir(pagina + 1)
        }}
      >
        Siguiente
      </Button>
    </nav>
  )
}
