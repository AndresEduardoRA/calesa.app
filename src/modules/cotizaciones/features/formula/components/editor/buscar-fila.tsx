'use client'

import { Input } from '@/shared/ui/input'

// «Buscar fila»: el camino a las filas que el tope de lo dibujado deja fuera (C8 del 3a-1).
export function BuscarFila({
  valor,
  alCambiar,
}: {
  valor: string
  alCambiar: (valor: string) => void
}) {
  return (
    <div className="max-w-sm">
      <label htmlFor="buscar-fila" className="sr-only">
        Buscar fila
      </label>
      <Input
        id="buscar-fila"
        type="search"
        placeholder="Buscar fila por nombre o etiqueta"
        className="min-h-11 md:min-h-9"
        value={valor}
        onChange={(evento) => {
          alCambiar(evento.target.value)
        }}
      />
    </div>
  )
}
