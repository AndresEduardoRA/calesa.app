'use client'

import { formatearFechaHora } from '@/shared/lib/fechas'
import { Badge } from '@/shared/ui/badge'
import { useRegional } from '@/shared/ui/regional'
import {
  estadoVisible,
  ETIQUETA_DE_ESTADO,
  fraseDelAvance,
  TONO_DE_ESTADO,
  type ResumenDeImportacion,
} from '../../../entities/resumen-de-importacion'
import { BotonDeRechazadas } from './boton-de-rechazadas'

type Props = { resumen: ResumenDeImportacion; ahora: number; todas: boolean }

function queSeImporto(r: ResumenDeImportacion): string {
  if (r.entidad === 'leads') return 'Leads'
  return r.origen ? `Vehículos · ${r.origen}` : 'Vehículos'
}

// Una importación de la lista: cuándo, qué, de quién y para quién, su estado y su avance. Sin el archivo de la persona: las rechazadas salen
// con fila, resultado, campo y motivo (D54).
export function FilaDeImportacion({ resumen, ahora, todas }: Props) {
  const { locale, zonaHoraria } = useRegional()
  const estado = estadoVisible(resumen, ahora)
  const quien = [
    todas && resumen.quien ? `De ${resumen.quien}` : null,
    resumen.destino ? `para ${resumen.destino}` : null,
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <li className="grid min-w-0 gap-2 rounded-lg border border-(--color-line) p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{queSeImporto(resumen)}</span>
        <Badge variant={TONO_DE_ESTADO[estado]}>{ETIQUETA_DE_ESTADO[estado]}</Badge>
      </div>
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        <time dateTime={resumen.creadoEn}>
          {formatearFechaHora(resumen.creadoEn, { zona: zonaHoraria })}
        </time>
        {quien ? ` · ${quien}` : null}
      </p>
      <p className="text-(length:--text-sm) break-words">
        {fraseDelAvance(resumen, ahora, locale)}
      </p>
      <BotonDeRechazadas resumen={resumen} ahora={ahora} archivo={null} />
    </li>
  )
}
