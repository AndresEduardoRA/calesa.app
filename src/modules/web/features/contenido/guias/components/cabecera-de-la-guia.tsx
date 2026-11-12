import { formatearFecha } from '@/shared/lib/fechas'
import type { GuiaCompleta } from '../../../../entities/contenido/guias'
import { EstadoDeLaGuia } from './estado-de-la-guia'

type Props = { guia: GuiaCompleta; ahora: string; zona: string }

// El título de la guía, su estado con palabras y cuándo se guardó por última vez.
export function CabeceraDeLaGuia({ guia, ahora, zona }: Props) {
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-(length:--text-xl) font-semibold break-words text-(--color-ink)">
          {guia.titulo}
        </h1>
        <EstadoDeLaGuia publicadaEn={guia.publicadaEn} ahora={ahora} zona={zona} />
      </div>
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        Actualizada el {formatearFecha(guia.actualizadoEn, { zona })}.
      </p>
    </div>
  )
}
