'use client'

import { useId } from 'react'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import {
  MENSAJE_DE_COMPROBANTE_INVALIDO,
  TIPOS_DE_COMPROBANTE,
} from '../../../entities/compras/comprobante'
import { useComprobante } from '../hooks/use-comprobante'

type Props = {
  proyectoId: string
  // La ruta ya subida (vacía = sin comprobante).
  ruta: string
  alCambiar: (ruta: string) => void
  error?: string
  deshabilitado: boolean
}

// El comprobante de una compra (8.11-3, C8; copia del de logística): se sube al elegir el archivo (el nombre es su hash, subir lo mismo dos veces no cambia nada) y la ruta se manda al guardar. Un archivo que se sube y no se
// guarda lo limpia `storage-gc`. «Ver comprobante» pide una URL firmada de 60 s al tocarlo.
export function CampoDeComprobante({ proyectoId, ruta, alCambiar, error, deshabilitado }: Props) {
  const id = useId()
  const c = useComprobante(proyectoId, ruta, alCambiar)
  const motivo = error ?? c.rechazo
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>Comprobante</Label>
      {ruta === '' ? null : (
        <div className="flex flex-wrap items-center gap-2 text-(length:--text-sm)">
          <span>Comprobante adjunto</span>
          <Button type="button" variant="outline" size="sm" onClick={() => void c.ver()}>
            Ver comprobante
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={deshabilitado}
            onClick={() => {
              alCambiar('')
            }}
          >
            Quitar
          </Button>
        </div>
      )}
      <input
        id={id}
        type="file"
        accept={TIPOS_DE_COMPROBANTE}
        disabled={deshabilitado || c.subiendo}
        aria-invalid={motivo ? true : undefined}
        aria-describedby={`${id}-ayuda`}
        className="min-h-11 text-(length:--text-sm) md:min-h-9"
        onChange={(evento) => {
          const campo = evento.currentTarget
          // Se vacía el campo al terminar: elegir el mismo archivo otra vez vuelve a dispararlo.
          void c.elegir(campo.files?.[0]).then(() => {
            campo.value = ''
          })
        }}
      />
      <p id={`${id}-ayuda`} className="text-(length:--text-sm) text-(--color-ink-faint)">
        {c.subiendo ? 'Subiendo…' : MENSAJE_DE_COMPROBANTE_INVALIDO}
      </p>
      {motivo ? (
        <p role="alert" className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {motivo}
        </p>
      ) : null}
    </div>
  )
}
