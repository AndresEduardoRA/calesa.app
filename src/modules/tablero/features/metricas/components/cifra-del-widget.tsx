import type { ReactNode } from 'react'
import type { ErrorApp } from '@/shared/lib/errores'
import { ErrorDeWidget } from './error-de-widget'
import { ErrorSinPermisoDeWidget } from './error-sin-permiso-de-widget'

// El error de un widget: sin permiso se dice y no se reintenta; lo demás ofrece «Reintentar».
export function ErrorDeLectura({ error }: { error: ErrorApp }) {
  return error.codigo === 'sin_permiso' ? (
    <ErrorSinPermisoDeWidget mensaje={error.mensaje} />
  ) : (
    <ErrorDeWidget />
  )
}

// Una cifra grande con su nota. Es un grupo con nombre «<Título>: <valor>» para el lector de pantalla y para las pruebas.
export function CifraDelWidget({
  titulo,
  valor,
  nota,
  accion,
}: {
  titulo: string
  valor: string
  nota?: ReactNode
  accion?: ReactNode
}) {
  return (
    <div role="group" aria-label={`${titulo}: ${valor}`} className="grid gap-2 p-4">
      <p
        aria-hidden
        className="text-(length:--text-2xl) font-semibold text-(--color-ink) tabular-nums"
      >
        {valor}
      </p>
      {nota ? <p className="text-(length:--text-sm) text-(--color-ink-soft)">{nota}</p> : null}
      {accion}
    </div>
  )
}
