'use client'

import { Aviso } from './aviso'
import { Button, buttonVariants } from './button'

type Props = {
  // Lo dice la base: «Rosa Mamani cambió este vehículo hace 3 min.»
  mensaje: string
  // Dónde ver cómo quedó. Se abre en otra pestaña: lo escrito acá no se pierde.
  hrefVer?: string
  // Toma la versión nueva. Por defecto lo que la persona había escrito se descarta.
  alRecargar: () => void
  enCurso?: boolean
  // Lo que pasa al recargar, si no es lo de siempre (un campo suelto que conserva lo tipeado).
  detalle?: string
}

// Otra persona guardó lo mismo mientras se editaba (`PT409`). Va dentro del formulario, no en un
// toast: la persona decide con lo suyo todavía a la vista. «Ver» no pierde nada; «Recargar» sí, y
// lo dice (docs/UX.md › Conflictos).
export function AvisoDeConflicto({
  mensaje,
  hrefVer,
  alRecargar,
  enCurso = false,
  detalle = 'No se guardó nada. Recargar trae su versión y descarta lo que escribiste.',
}: Props) {
  return (
    <Aviso tono="aviso">
      <p className="font-medium">{mensaje}</p>
      <p>{detalle}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {hrefVer ? (
          <a
            href={hrefVer}
            target="_blank"
            rel="noreferrer"
            className={buttonVariants({
              variant: 'outline',
              size: 'sm',
              className: 'min-h-11 md:min-h-7',
            })}
          >
            Ver cómo quedó
          </a>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          className="min-h-11 md:min-h-7"
          onClick={alRecargar}
          disabled={enCurso}
        >
          Recargar
        </Button>
      </div>
    </Aviso>
  )
}
