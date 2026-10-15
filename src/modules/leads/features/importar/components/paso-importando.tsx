'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { formatearNumero } from '@/shared/lib/formato'
import { useRegional } from '@/shared/ui/regional'
import type { useImportacion } from '../hooks/use-importacion'

type Props = {
  importacion: Pick<
    ReturnType<typeof useImportacion>,
    | 'fase'
    | 'resumen'
    | 'lotesHechos'
    | 'totalDeLotes'
    | 'enLinea'
    | 'error'
    | 'cancelar'
    | 'reanudar'
  >
  // Cuántas filas válidas lleva la importación entera.
  validas: number
}

// El cuarto paso: la barra de avance. Se puede cancelar entre lotes; si se corta la red se reanuda sola
// o con «Reintentar», y lo que ya entró no se duplica.
export function PasoImportando({ importacion, validas }: Props) {
  const { fase, resumen, lotesHechos, totalDeLotes, enLinea, error } = importacion
  const { locale } = useRegional()
  const hechas = validas - resumen.pendientes
  const porcentaje = validas === 0 ? 0 : Math.round((hechas / validas) * 100)
  const numero = (n: number) => formatearNumero(n, { locale })
  const cerrando = fase === 'importando' && resumen.pendientes === 0
  return (
    <div className="grid gap-4" aria-live="polite">
      <div
        role="progressbar"
        aria-label="Avance de la importación"
        aria-valuemin={0}
        aria-valuemax={validas}
        aria-valuenow={hechas}
        className="h-3 overflow-hidden rounded-full bg-(--color-line)"
      >
        <div
          className="h-full rounded-full bg-(--color-primario) transition-[width]"
          style={{ width: `${String(porcentaje)}%` }}
        />
      </div>
      <p className="text-(length:--text-sm) tabular-nums">
        {cerrando
          ? 'Cerrando la importación…'
          : `${numero(hechas)} de ${numero(validas)} filas · lote ${numero(Math.min(lotesHechos + 1, totalDeLotes))} de ${numero(totalDeLotes)}`}
      </p>
      {fase === 'pausada' ? (
        <Aviso tono="aviso">
          {enLinea
            ? 'No pudimos llegar al servidor. Reintenta: lo que ya entró no se duplica.'
            : 'No hay conexión. Cuando vuelva seguimos solos; lo que ya entró no se duplica.'}
        </Aviso>
      ) : null}
      {fase === 'fallida' ? (
        <Aviso tono="peligro">{error?.mensaje ?? 'No pudimos seguir con la importación.'}</Aviso>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        {fase === 'pausada' ? (
          <Button type="button" className="h-11 md:h-9" onClick={importacion.reanudar}>
            Reintentar
          </Button>
        ) : null}
        {fase === 'importando' && !cerrando ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 md:h-9"
            onClick={importacion.cancelar}
          >
            Cancelar
          </Button>
        ) : null}
      </div>
    </div>
  )
}
