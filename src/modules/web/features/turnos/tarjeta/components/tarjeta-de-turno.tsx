'use client'

import { Aviso } from '@/shared/ui/aviso'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { CLAVE_DE_TURNO, PANEL_VINCULAR_TURNO } from '../../../../entities/turnos/paneles'
import type { Turno } from '../../../../entities/turnos/turnos'
import { useConfirmarTurno } from '../hooks/use-confirmar-turno'
import { useCuentaRegresiva } from '../hooks/use-cuenta-regresiva'

type Props = {
  turno: Turno
  // La hora del servidor (ISO) con la que se dibuja por primera vez; después el hook sigue el reloj.
  ahora: string
  // «Vincular a lead» sólo si la persona puede ver leads: lo decide quien monta la tarjeta con `puede()`.
  puedeVincular?: boolean
}

// Un turno de la web sin confirmar (8.05-1): el código `#WEB-XXXX`, de dónde vino, el vehículo, cuánto falta (o «Vencido») y dos botones:
// «Contacté» (un toque) y «Vincular a lead» (abre el panel por URL). Sin «Deshacer» ni confirmación: contactar es lo que se espera de quien recibe el turno.
export function TarjetaTurno({ turno, ahora, puedeVincular = true }: Props) {
  const reloj = useCuentaRegresiva(turno.venceEn, ahora)
  const vencido = turno.estado === 'vencida' || reloj.vencido
  const { confirmar, enCurso, error } = useConfirmarTurno(turno.id)
  const panel = usePanelPorUrl(PANEL_VINCULAR_TURNO, [CLAVE_DE_TURNO])
  return (
    <article
      aria-label={`Turno ${turno.codigo}`}
      className="grid min-w-0 gap-2 px-4 py-3"
      data-turno={turno.id}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <strong className="text-(length:--text-sm) break-words text-(--color-ink)">
          {turno.codigo}
        </strong>
        {vencido ? (
          <Badge variant="destructive">Vencido</Badge>
        ) : (
          <span className="text-(length:--text-xs) text-(--color-ink-soft)">{reloj.texto}</span>
        )}
      </div>
      <p className="min-w-0 text-(length:--text-xs) break-words text-(--color-ink-soft)">
        {turno.fuente}
        {turno.titulo ? ` · ${turno.titulo}` : ''}
      </p>
      {error ? <Aviso tono="peligro">{error}</Aviso> : null}
      <div className="flex flex-wrap gap-2">
        <Button className="min-h-11 md:min-h-9" disabled={enCurso} onClick={() => void confirmar()}>
          Contacté
        </Button>
        {puedeVincular ? (
          <Button
            variant="outline"
            className="min-h-11 md:min-h-9"
            disabled={enCurso}
            onClick={() => {
              panel.abrir({ [CLAVE_DE_TURNO]: turno.id })
            }}
          >
            Vincular a lead
          </Button>
        ) : null}
      </div>
    </article>
  )
}
