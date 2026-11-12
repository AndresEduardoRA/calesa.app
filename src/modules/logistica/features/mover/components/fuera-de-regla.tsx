'use client'

import { anclaDeRequisito, faltaDeRequisito, type RequisitoVista } from '@/modules/flujos/client'
import { Aviso } from '@/shared/ui/aviso'
import { AtajoDeRequisito } from './atajo-de-requisito'

// La unidad está en una fase cuyos requisitos obligatorios dejó de cumplir (se quitó un documento, se vació un dato): no se la expulsa, se avisa y se dice qué le falta, con el mismo atajo.
export function FueraDeRegla({ faltan }: { faltan: readonly RequisitoVista[] }) {
  const anclas = [...new Set(faltan.flatMap((f) => anclaDeRequisito(f) ?? []))]
  return (
    <Aviso tono="aviso">
      <p className="font-medium" data-aviso="fuera-de-regla">
        Fuera de regla: a esta fase le falta {faltan.map(faltaDeRequisito).join(', ')}.
      </p>
      {anclas.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {anclas.map((ancla) => (
            <AtajoDeRequisito key={ancla} ancla={ancla} />
          ))}
        </div>
      ) : null}
    </Aviso>
  )
}
