'use client'

import { formatearFechaHora } from '@/shared/lib/fechas'
import { formatearNumero } from '@/shared/lib/formato'
import { Badge } from '@/shared/ui/badge'
import { useRegional } from '@/shared/ui/regional'
import type { ImportacionReciente } from '../../../entities/importacion/deshacer'
import { DeshacerImportacion } from './deshacer-importacion'

const ESTADO: Record<
  ImportacionReciente['estado'],
  { texto: string; variante: 'default' | 'secondary' | 'outline' }
> = {
  terminada: { texto: 'Terminada', variante: 'secondary' },
  abierta: { texto: 'Sin terminar', variante: 'outline' },
  deshecha: { texto: 'Deshecha', variante: 'default' },
}

type Props = { importacion: ImportacionReciente; ahora: string; zona: string }

// Una importación reciente: cuándo, cuánto entró y su «Deshacer» (o lo que hizo, si ya se deshizo).
export function FilaDeImportacionReciente({ importacion, ahora, zona }: Props) {
  const { locale } = useRegional()
  const numero = (n: number) => formatearNumero(n, { locale })
  const estado = ESTADO[importacion.estado]
  const conteos = [
    `${numero(importacion.creadas)} importados`,
    importacion.yaExistian === null ? null : `${numero(importacion.yaExistian)} ya existían`,
    importacion.rechazadas === null ? null : `${numero(importacion.rechazadas)} rechazados`,
  ].filter((x) => x !== null)
  return (
    <li className="grid gap-2 border-b border-(--color-line) py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{formatearFechaHora(importacion.fecha, { zona })}</span>
        <Badge variant={estado.variante}>{estado.texto}</Badge>
      </div>
      <p className="text-(length:--text-sm) text-(--color-ink-soft) tabular-nums">
        {conteos.join(' · ')}
      </p>
      <DeshacerImportacion
        importacionId={importacion.id}
        intactos={importacion.intactos ?? 0}
        creadas={importacion.creadas}
        venceEn={importacion.venceEn}
        ahora={ahora}
        resultado={importacion.resultado}
        superficie="recientes"
      />
    </li>
  )
}
