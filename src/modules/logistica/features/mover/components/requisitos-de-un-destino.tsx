import {
  anclaDeRequisito,
  detalleDeRequisito,
  etiquetaDeRequisito,
  type RequisitoVista,
} from '@/modules/flujos/client'
import { AtajoDeRequisito } from './atajo-de-requisito'

// Lo que la fase de destino pide, requisito por requisito. El estado se dice con texto («Cumplido» / «Falta»), no sólo con un color o un icono; cada falta obligatoria con atajo lleva a donde se cumple.
export function RequisitosDeUnDestino({ requisitos }: { requisitos: readonly RequisitoVista[] }) {
  if (requisitos.length === 0) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">No pide nada para entrar.</p>
    )
  }
  return (
    <ul className="grid gap-2" aria-label="Lo que pide esta fase">
      {requisitos.map((r) => {
        const ancla = !r.cumplido && r.bloqueante ? anclaDeRequisito(r) : null
        const detalle = detalleDeRequisito(r)
        return (
          <li
            key={r.requisitoId}
            className="flex flex-wrap items-center gap-x-2 gap-y-1 text-(length:--text-sm)"
            data-requisito={r.cumplido ? 'cumplido' : 'falta'}
          >
            <span
              className={
                r.cumplido
                  ? 'font-medium text-(--color-positivo-ink)'
                  : 'font-medium text-(--color-peligro-ink)'
              }
            >
              {r.cumplido ? 'Cumplido' : 'Falta'}
            </span>
            <span className="min-w-0 break-words text-(--color-ink)">{etiquetaDeRequisito(r)}</span>
            {detalle ? <span className="text-(--color-ink-soft)">{detalle}</span> : null}
            <span className="text-(--color-ink-faint)">
              {r.bloqueante ? 'Obligatorio' : 'Informativo'}
            </span>
            {ancla ? <AtajoDeRequisito ancla={ancla} /> : null}
          </li>
        )
      })}
    </ul>
  )
}
