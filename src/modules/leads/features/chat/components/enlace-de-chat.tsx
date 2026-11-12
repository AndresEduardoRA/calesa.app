'use client'
import type { Route } from 'next'
import Link from 'next/link'
import { useEscribirPorChat } from '../hooks/use-escribir-por-chat'

// «Escribirle por chat» a quien tiene el lead. Lleva sólo el id de la persona: la página `/chat` abre la directa y la base decide si se puede.
export function EnlaceDeChat({ duenoId }: { duenoId: string }) {
  if (!useEscribirPorChat()) return null
  return (
    <>
      {' · '}
      <Link
        href={`/chat?con=${duenoId}` as Route}
        className="font-medium underline underline-offset-2"
      >
        Escribirle por chat
      </Link>
    </>
  )
}
