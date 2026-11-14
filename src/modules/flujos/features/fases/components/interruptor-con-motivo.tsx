'use client'

import { Interruptor } from '@/shared/ui/interruptor'
import {
  motivoDelInterruptor,
  type CampoConRegla,
  type CampoDeFase,
  type ContextoDeFase,
} from '../../../entities/fases/reglas-de-fase'
import { ID_DE_CAMPO_DE_FASE } from '../../../entities/fases/bloques-de-fase'

type Props = {
  campo: CampoDeFase
  titulo: string
  // Lo que hace, cuando se puede cambiar.
  ayuda: string
  valor: boolean
  alCambiar: (valor: boolean) => void
  // Un interruptor que depende de una regla del flujo: apagada, no se enciende y la ayuda dice por qué (D23).
  regla?: { campo: CampoConRegla; contexto: ContextoDeFase }
  // Otro motivo por el que no se puede encender (nulo si se puede): reemplaza la ayuda, como el de la regla.
  motivo?: string | null
  error?: string | undefined
  // Un aviso que no bloquea (otra fase ya es inicial).
  aviso?: string | null
  deshabilitado: boolean
}

// Un interruptor de «Datos» con su error y su aviso debajo. Si la regla del flujo está apagada se deshabilita con su motivo en lugar de la ayuda; uno ya
// encendido (dato viejo) siempre se puede apagar. El `id` de la tarjeta es a donde va el foco de un error.
export function InterruptorConMotivo({
  campo,
  titulo,
  ayuda,
  valor,
  alCambiar,
  regla,
  motivo: motivoPropio = null,
  error,
  aviso,
  deshabilitado,
}: Props) {
  const motivo = regla ? motivoDelInterruptor(regla.campo, valor, regla.contexto) : motivoPropio
  return (
    <div id={ID_DE_CAMPO_DE_FASE[campo]} className="grid min-w-0 gap-1.5">
      <Interruptor
        titulo={titulo}
        ayuda={motivo ?? ayuda}
        valor={valor}
        alCambiar={alCambiar}
        deshabilitado={deshabilitado || motivo !== null}
      />
      {aviso ? <p className="text-(length:--text-sm) text-(--color-aviso-ink)">{aviso}</p> : null}
      {error ? (
        <p role="alert" className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
    </div>
  )
}
