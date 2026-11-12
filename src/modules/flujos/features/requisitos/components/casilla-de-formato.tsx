'use client'

import { Checkbox } from '@/shared/ui/checkbox'

type Props = {
  id: string
  etiqueta: string
  marcada: boolean
  deshabilitada?: boolean
  invalida?: boolean
  alCambiar: (marcada: boolean) => void
}

// Una casilla de formato con su etiqueta (clic en el texto también marca); 44 px de alto en el celular. Es propia del área: otra área no se importa.
export function CasillaDeFormato({
  id,
  etiqueta,
  marcada,
  deshabilitada,
  invalida,
  alCambiar,
}: Props) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-11 items-center gap-2 text-(length:--text-sm) md:min-h-0"
    >
      <Checkbox
        id={id}
        checked={marcada}
        disabled={deshabilitada}
        aria-invalid={invalida ? true : undefined}
        onCheckedChange={alCambiar}
      />
      {etiqueta}
    </label>
  )
}
