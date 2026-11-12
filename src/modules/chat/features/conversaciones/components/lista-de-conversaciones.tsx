'use client'

import type { Resultado } from '@/shared/lib/errores'
import type { PaginaDeConversaciones } from '../../../entities/conversaciones'
import { useListaDeConversaciones } from '../hooks/use-lista-de-conversaciones'
import { ErrorDeLaLista } from './error-de-la-lista'
import { FilaDeConversacion } from './fila-de-conversacion'
import { PieDeLaLista } from './pie-de-la-lista'
import { VacioDeLaLista } from './vacio-de-la-lista'

type Props = {
  usuarioId: string
  inicial: Resultado<PaginaDeConversaciones>
  // La conversación abierta (`?c=`), si hay una.
  abierta: string | null
  // Zona horaria de la empresa, para la hora de lo último.
  zona: string
}

// La lista de `/chat`: mis conversaciones, la del mensaje más reciente primero, con «Ver más» y las señales de Realtime.
export function ListaDeConversaciones({ usuarioId, inicial, abierta, zona }: Props) {
  const lista = useListaDeConversaciones({ usuarioId, inicial })
  return (
    <nav aria-label="Conversaciones" className="flex min-h-0 flex-1 flex-col">
      <h1 className="px-3 py-3 text-(length:--text-xl) font-semibold text-(--color-ink)">Chat</h1>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {lista.errorDeLista && lista.filas.length === 0 ? (
          <ErrorDeLaLista alReintentar={() => void lista.recargar()} />
        ) : lista.filas.length === 0 ? (
          <VacioDeLaLista />
        ) : (
          <>
            <ul className="grid gap-0.5 px-1">
              {lista.filas.map((c) => (
                <FilaDeConversacion
                  key={c.id}
                  conversacion={c}
                  abierta={c.id === abierta}
                  zona={zona}
                />
              ))}
            </ul>
            <PieDeLaLista
              filas={lista.filas.length}
              hayMas={lista.hayMas}
              enElTope={lista.enElTope}
              cargandoMas={lista.cargandoMas}
              error={lista.errorAlCargarMas}
              cargarMas={() => void lista.cargarMas()}
            />
          </>
        )}
      </div>
    </nav>
  )
}
