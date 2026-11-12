'use client'

import { aplicarMensaje } from '../../../entities/portal-mensaje'

// Un cliente, un código y una clave de ejemplo, fijos: la vista previa nunca muestra una clave real.
const EJEMPLO = { cliente: 'Ana Pérez', codigo: 'EJM-4F2K9', clave: 'K7M2Q9XWPR' }

type Props = {
  texto: string
  empresa: string
  // La dirección pública de la web; nula si nadie la configuró.
  direccion: string | null
}

// Cómo le llega el mensaje al cliente, con datos de ejemplo y la empresa y la dirección reales. Se dibuja como texto, nunca como HTML.
export function VistaPreviaDelMensaje({ texto, empresa, direccion }: Props) {
  return (
    <div className="grid gap-2">
      <span className="text-(length:--text-sm) font-medium text-(--color-ink)">Vista previa</span>
      <pre
        aria-label="Vista previa del mensaje"
        className="rounded-(--radius-md) bg-(--color-surface-2) p-3 font-sans text-(length:--text-sm) whitespace-pre-wrap text-(--color-ink)"
      >
        {aplicarMensaje(texto, { ...EJEMPLO, empresa, direccion })}
      </pre>
      {direccion ? null : (
        <p className="text-(length:--text-xs) text-(--color-ink-soft)">
          Todavía no hay una dirección de la web configurada: {'{direccion}'} dice «la web de{' '}
          {empresa}».
        </p>
      )}
    </div>
  )
}
