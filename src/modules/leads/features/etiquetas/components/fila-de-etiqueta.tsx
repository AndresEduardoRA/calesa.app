'use client'

import { Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import {
  textoDeEliminar,
  type ColorDeEtiqueta,
  type EtiquetaConUso,
} from '../../../entities/etiqueta'
import { NombreDeEtiqueta } from './nombre-de-etiqueta'
import { SelectorDeColor } from './selector-de-color'

type Props = {
  etiqueta: EtiquetaConUso
  // Las demás: para decir el repetido antes de enviar.
  todas: readonly EtiquetaConUso[]
  enCurso: boolean
  alGuardar: (cambios: { nombre?: string; color?: ColorDeEtiqueta }) => Promise<string | null>
  alEliminar: () => Promise<boolean>
}

// Una etiqueta en «Gestionar»: el nombre editable, el color de la paleta, a cuántos leads toca y
// eliminar. Con leads, eliminar pide confirmar en la misma fila diciendo a cuántos (sin abrir otro
// diálogo); sin leads se elimina y se ofrece «Deshacer».
export function FilaDeEtiqueta({ etiqueta, todas, enCurso, alGuardar, alEliminar }: Props) {
  const [motivo, setMotivo] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)

  async function eliminar() {
    if (etiqueta.leads > 0 && !confirmando) {
      setConfirmando(true)
      return
    }
    if (!(await alEliminar())) {
      setConfirmando(false)
    }
  }

  return (
    <li className="grid gap-1.5 border-b border-(--color-line) py-2 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <NombreDeEtiqueta
          etiqueta={etiqueta}
          todas={todas}
          enCurso={enCurso}
          alGuardar={(nombre) => alGuardar({ nombre })}
          motivo={motivo}
          alMotivo={setMotivo}
        />
        <SelectorDeColor
          color={etiqueta.color}
          de={etiqueta.nombre}
          deshabilitado={enCurso}
          alElegir={(color) => {
            void alGuardar({ color }).then(setMotivo)
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Eliminar la etiqueta ${etiqueta.nombre}`}
          disabled={enCurso}
          className="size-11 md:size-8"
          onClick={() => void eliminar()}
        >
          <Trash2Icon aria-hidden className="size-4" />
        </Button>
      </div>
      <p className="text-(length:--text-xs) text-(--color-ink-soft) tabular-nums">
        {etiqueta.leads === 1 ? 'En 1 lead' : `En ${etiqueta.leads} leads`}
      </p>
      {confirmando ? (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 rounded-(--radius-md) bg-(--color-peligro-soft) p-2"
        >
          <p className="flex-1 text-(length:--text-sm) text-(--color-peligro-ink)">
            ¿Eliminar «{etiqueta.nombre}»? {textoDeEliminar(etiqueta)}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => setConfirmando(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={enCurso}
            onClick={() => void eliminar()}
          >
            Eliminar
          </Button>
        </div>
      ) : null}
    </li>
  )
}
