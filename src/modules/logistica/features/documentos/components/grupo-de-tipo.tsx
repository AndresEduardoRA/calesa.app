'use client'

import { Badge } from '@/shared/ui/badge'
import type { GrupoDeTipo } from '../../../entities/documentos/agrupar'
import type { DocumentoDeLaUnidad } from '../../../entities/documentos/documento'
import type { ContextoDeLaFila } from './contexto-de-la-fila'
import { FilaDeDocumento } from './fila-de-documento'

type Props = {
  grupo: GrupoDeTipo
  contexto: ContextoDeLaFila
  nombres: Readonly<Record<string, string>>
  hoy: string
}

// Un tipo de documento y lo suyo: si lo pide una fase («Lo pide «X»», «Obligatorio», «N de M aprobados») y sus documentos. Un tipo pedido sin documentos lo dice. La cuenta
// de aprobados la hizo `agruparPorTipo`: acá sólo se dibuja.
export function GrupoDeTipoDeDocumento({ grupo, contexto, nombres, hoy }: Props) {
  const { resumen, pedidoPor } = grupo
  const obligatorio = pedidoPor.some((r) => r.bloqueante)
  return (
    <section className="grid gap-2" aria-label={grupo.nombre} data-tipo-de-documento={grupo.nombre}>
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <h4 className="min-w-0 font-medium break-words">{grupo.nombre}</h4>
        {obligatorio ? <Badge variant="secondary">Obligatorio</Badge> : null}
        {resumen ? (
          <span className="text-(length:--text-sm) text-(--color-ink-soft)">
            {resumen.aprobados} de {resumen.minimo} aprobados
            {resumen.cumple ? ' · Cumple' : ''}
          </span>
        ) : null}
      </div>
      {pedidoPor.length > 0 ? (
        <p className="text-(length:--text-sm) break-words text-(--color-ink-soft)">
          {pedidoPor.map((r) => `Lo pide «${r.faseNombre}»`).join(' · ')}
        </p>
      ) : null}
      {grupo.documentos.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">Aún no hay ninguno.</p>
      ) : (
        <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {grupo.documentos.map((d: DocumentoDeLaUnidad) => (
            <FilaDeDocumento
              key={d.id}
              documento={d}
              tipo={grupo.tipo}
              contexto={contexto}
              nombres={nombres}
              hoy={hoy}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
