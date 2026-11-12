import { useId } from 'react'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Checkbox } from '@/shared/ui/checkbox'
import {
  TEXTO_DE_OFERTA_VACIA,
  TOPE_DE_LA_OFERTA,
  elegibles,
  type ElementoDeOferta,
} from '../../../entities/reglas/oferta'

type Props = {
  titulo: string
  catalogo: readonly ElementoDeOferta[]
  hayMas: boolean
  guardados: readonly ElementoDeOferta[]
  marcados: readonly string[]
  // Lo que se dice si el catálogo no tiene nada para ofrecer.
  sinCatalogo: string
  deshabilitado: boolean
  alMarcar: (id: string, marcada: boolean) => void
}

// Un grupo de casillas de la oferta (puertos de origen, de destino o navieras). Sin marcas: «Vacío: se ofrecen todos.». Un guardado que dejó de estar
// activo se ve rotulado «(inactivo)» para poder quitarlo.
export function GrupoDeOferta({
  titulo,
  catalogo,
  hayMas,
  guardados,
  marcados,
  sinCatalogo,
  deshabilitado,
  alMarcar,
}: Props) {
  const id = useId()
  const lista = elegibles(catalogo, guardados)
  return (
    <fieldset className="grid gap-1 border-0 p-0">
      <legend className="mb-1 font-medium text-(--color-ink)">{titulo}</legend>
      {lista.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{sinCatalogo}</p>
      ) : (
        <>
          {lista.map((e) => (
            <label
              key={e.id}
              htmlFor={`${id}-${e.id}`}
              className="flex min-h-11 items-center gap-2 text-(length:--text-sm) md:min-h-0"
            >
              <Checkbox
                id={`${id}-${e.id}`}
                checked={marcados.includes(e.id)}
                disabled={deshabilitado}
                onCheckedChange={(marcada) => alMarcar(e.id, marcada)}
              />
              {e.activo ? e.nombre : `${e.nombre} (inactivo)`}
            </label>
          ))}
          {marcados.length === 0 ? (
            <p className="text-(length:--text-sm) text-(--color-ink-faint)">
              {TEXTO_DE_OFERTA_VACIA}
            </p>
          ) : null}
        </>
      )}
      {hayMas ? <AvisoDeTope texto={`Mostrando los primeros ${TOPE_DE_LA_OFERTA}.`} /> : null}
    </fieldset>
  )
}
