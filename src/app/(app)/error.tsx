'use client'

import { useEffect } from 'react'
import { EstadoError } from '@/shared/ui/estados'

type Props = { error: Error & { digest?: string }; retry: () => void }

// Si una pantalla falla al cargar, el marco (menú, barra) sigue en pie y acá se ofrece reintentar.
export default function ErrorDeLaApp({ error, retry }: Props) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return <EstadoError alReintentar={retry} />
}
