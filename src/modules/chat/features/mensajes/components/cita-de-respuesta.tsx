'use client'

import { XIcon } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import type { CitaDeMensaje } from '../../../entities/mensajes'
import { textoDeCita } from '../../../entities/reglas-del-mensaje'

// La cita dentro de la burbuja: de quién era y sus primeras palabras. No se hace clic (no salta al original).
export function CitaEnLaBurbuja({ cita }: { cita: CitaDeMensaje | null }) {
  return (
    <blockquote className="mb-1 min-w-0 border-l-2 border-(--color-line) pl-2 text-(length:--text-sm) text-(--color-ink-soft)">
      {cita ? (
        <>
          <p className="font-semibold">{cita.autorNombre ?? 'Alguien del equipo'}</p>
          <p className="break-words">{textoDeCita(cita)}</p>
        </>
      ) : (
        <p className="italic">Mensaje no disponible</p>
      )}
    </blockquote>
  )
}

// Sobre el redactor, mientras se escribe la respuesta: a quién y qué, con su «Quitar respuesta».
export function CitaSobreElRedactor({
  cita,
  alQuitar,
}: {
  cita: CitaDeMensaje
  alQuitar: () => void
}) {
  return (
    <div className="flex items-start gap-2 rounded-(--radius-md) border-l-2 border-(--color-primario) bg-(--color-surface-3) px-3 py-2 text-(length:--text-sm)">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-(--color-ink)">
          Respondiendo a {cita.autorNombre ?? 'alguien del equipo'}
        </p>
        <p className="truncate text-(--color-ink-soft)">{textoDeCita(cita)}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        aria-label="Quitar respuesta"
        className="min-h-11 min-w-11 md:min-h-8 md:min-w-8"
        onClick={alQuitar}
      >
        <XIcon aria-hidden className="size-4" />
      </Button>
    </div>
  )
}
