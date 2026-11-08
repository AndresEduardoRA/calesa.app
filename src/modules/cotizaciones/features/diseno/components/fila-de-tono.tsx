import { Button } from '@/shared/ui/button'
import { TEMAS_DE_UN_TONO, type Tono } from '../../../entities/diseno/tonos'
import { MuestraDeTono } from './muestra-de-tono'

type Props = {
  tono: Tono
  alEditar: (id: string) => void
  alPedirEliminar: (id: string) => void
}

const BOTON = 'h-11 md:h-8'

// Un tono del catálogo: su nombre, su clave en texto suave (la nombran los grupos de una fórmula y no cambia), sus dos muestras y «Editar» y «Eliminar» con el nombre
// en el `aria-label`. Al 200 % la fila se apila (`flex-wrap` sobre una base en rem).
export function FilaDeTono({ tono, alEditar, alPedirEliminar }: Props) {
  return (
    <li
      data-tono={tono.clave}
      className="rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-3"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="grid min-w-0 flex-1 basis-48 gap-0.5">
          <span className="truncate font-medium text-(--color-ink)" title={tono.nombre}>
            {tono.nombre}
          </span>
          <span className="truncate text-(length:--text-sm) text-(--color-ink-faint)">
            {tono.clave}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {TEMAS_DE_UN_TONO.map((tema) => (
            <MuestraDeTono key={tema} tema={tema} colores={tono.colores[tema]} />
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className={BOTON}
            data-editar-tono={tono.id}
            aria-label={`Editar «${tono.nombre}»`}
            onClick={() => {
              alEditar(tono.id)
            }}
          >
            Editar
          </Button>
          <Button
            variant="outline"
            className={BOTON}
            data-eliminar-tono={tono.id}
            aria-label={`Eliminar «${tono.nombre}»`}
            onClick={() => {
              alPedirEliminar(tono.id)
            }}
          >
            Eliminar
          </Button>
        </div>
      </div>
    </li>
  )
}
