'use client'

import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { EFECTOS_DE_INTERRUPTOR } from '../../../entities/diseno'

type Efecto = (typeof EFECTOS_DE_INTERRUPTOR)[number]

const EFECTO: Record<Efecto, { etiqueta: string; ayuda: string }> = {
  habilita: { etiqueta: 'Habilita', ayuda: 'Apagado, deshabilita lo que condiciona.' },
  muestra: { etiqueta: 'Muestra', ayuda: 'Apagado, no dibuja lo que condiciona.' },
}

type Props = {
  seccionId: string
  item: { nodo: string; efecto: Efecto }
  etiqueta: string
  ocupado: boolean
  alPonerEfecto: (efecto: Efecto) => void
}

// Un interruptor de la hoja: una bandera de la fórmula que quien cotiza enciende o apaga. Aquí se elige qué hace apagada. Si el efecto no vale, lo dice el aviso del editor.
export function ItemDeInterruptor({ seccionId, item, etiqueta, ocupado, alPonerEfecto }: Props) {
  return (
    <li
      className="@container min-w-0 rounded-(--radius-md) border border-(--color-line) p-3"
      data-item={`interruptor:${item.nodo}`}
    >
      <p className="mb-2 text-(length:--text-sm) font-medium text-(--color-ink)">
        {`Interruptor ${etiqueta}.`}
      </p>
      <CampoSeleccion
        nombre={`${seccionId}__${item.nodo}-efecto`}
        etiqueta="Qué hace"
        opciones={EFECTOS_DE_INTERRUPTOR.map((valor) => ({
          valor,
          etiqueta: EFECTO[valor].etiqueta,
        }))}
        value={item.efecto}
        disabled={ocupado}
        ayuda={EFECTO[item.efecto].ayuda}
        onChange={(evento) => {
          alPonerEfecto(evento.target.value as Efecto)
        }}
      />
    </li>
  )
}
