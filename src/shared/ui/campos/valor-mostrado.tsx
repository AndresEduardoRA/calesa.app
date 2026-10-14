'use client'

import type { ValorMostrado as Valor } from '@/shared/lib/campos'
import { Monto } from '../monto'

// Dibuja lo que `valorMostrado()` o `valorComun()` decidieron mostrar. Un monto pasa por <Monto>
// (Modo Live); un enlace se abre en otra pestaña.
export function ValorMostrado({ valor }: { valor: Valor }) {
  switch (valor.tipo) {
    case 'vacio':
      return <span className="text-(--color-ink-faint)">—</span>
    case 'monto':
      return <Monto valor={valor.valor} />
    case 'enlace':
      return (
        <a
          href={valor.url}
          target="_blank"
          rel="noreferrer"
          className="text-(--color-primario-ink) underline-offset-2 hover:underline"
        >
          Abrir enlace
        </a>
      )
    case 'texto':
      return <span className="whitespace-pre-wrap">{valor.texto}</span>
  }
}
