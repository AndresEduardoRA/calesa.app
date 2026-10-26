import { ACCIONES, BOTON_DE_ACCION, CABECERA, ETIQUETA, PUNTO } from './clases'
import { IconoDeXCell, ID_DE_RESTABLECER } from './simbolos-de-xcell'

// Las acciones se recorren con las flechas desde el valor (no son paradas de Tab): ayuda y ⚙ del prompt 2 + ↺.
export const PARADA_DE_RESTABLECER = 12
export const PARADA_DE_ACCIONES_DESDE = 10

type Props = {
  idDeLaEtiqueta: string
  label: string
  sugerido: boolean
  // `null` = sin ↺; si no, lo que dice («Volver al valor por defecto» o «Volver al sugerido»).
  restablecer: string | null
  alRestablecer: () => void
}

// Arriba de la celda: el punto de lo sugerido, la etiqueta (que se parte) y la ranura de las acciones, que siempre existe para que el
// prompt 2 sume la ayuda y el ⚙ sin mover el resto.
export function CabeceraDeXCell(props: Props) {
  const { idDeLaEtiqueta, label, sugerido, restablecer, alRestablecer } = props
  return (
    <div className={CABECERA}>
      {sugerido ? (
        <>
          <span aria-hidden title="Sugerido" className={PUNTO} />
          <span className="sr-only">Sugerido</span>
        </>
      ) : null}
      <span id={idDeLaEtiqueta} className={ETIQUETA}>
        {label}
      </span>
      <span className={ACCIONES}>
        {restablecer === null ? null : (
          <button
            type="button"
            tabIndex={-1}
            data-parada={PARADA_DE_RESTABLECER}
            className={BOTON_DE_ACCION}
            aria-label={`${restablecer} de ${label}`}
            title={restablecer}
            onClick={alRestablecer}
          >
            <IconoDeXCell id={ID_DE_RESTABLECER} />
          </button>
        )}
      </span>
    </div>
  )
}
