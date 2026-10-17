'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import {
  textoDeFiltroDescartado,
  type FiltroDescartado,
} from '../../../entities/filtros-descartados'

// Una vista guardada o un enlace viejo apuntaba a un campo desactivado o eliminado, o a una
// etiqueta que ya no existe: el filtro no se aplicó y acá se dice cuál (el listado ya sin él).
// «Entendido» quita esos parámetros de la URL (de las etiquetas, deja las que valen).
export function AvisoDeFiltrosDescartados({
  descartados,
}: {
  descartados: readonly FiltroDescartado[]
}) {
  const quitar = Object.fromEntries(
    descartados.flatMap((uno) => uno.parametros).map((parametro) => [parametro, parseAsString]),
  )
  const [, setParametros] = useQueryStates(
    { ...quitar, [CLAVE_DE_CURSOR]: parseAsString },
    { shallow: false },
  )
  if (descartados.length === 0) {
    return null
  }
  return (
    <Aviso tono="aviso">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ul className="grid gap-0.5">
          {descartados.map((uno) => (
            <li key={uno.clave}>{textoDeFiltroDescartado(uno)}</li>
          ))}
        </ul>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            // Un filtro de etiquetas queda con las que sí valen; lo demás se quita.
            const quedan = Object.fromEntries(
              descartados.flatMap((uno) =>
                uno.queda === undefined ? [] : uno.parametros.map((p) => [p, uno.queda ?? null]),
              ),
            )
            void setParametros({
              ...Object.fromEntries(
                [...Object.keys(quitar), CLAVE_DE_CURSOR].map((k) => [k, null]),
              ),
              ...quedan,
            })
          }}
        >
          Entendido
        </Button>
      </div>
    </Aviso>
  )
}
