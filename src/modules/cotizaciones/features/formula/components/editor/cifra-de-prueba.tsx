'use client'

import { textoDelFaltante } from '../../../../entities/textos-de-faltantes'
import type { CifraDeLaFila } from '../../../../entities/formula/vista-previa'
import { ValorDeConstante } from './valor-de-constante'

// Las cifras de la vista previa llevan 2 decimales (no los 6 de los campos de una constante).
const DECIMALES_DE_LA_CIFRA = 2

// La cifra de prueba de una fila (4.21-3a-2, C4), en su cabecera: su valor con el formato de su nodo (el dinero por `<Monto>`), o por qué no la tiene. Una fila apagada
// no suma cero: dice que está apagada. Una bandera, o una vista que no está calculada, no dibuja nada.
export function CifraDePrueba({ cifra }: { cifra: CifraDeLaFila }) {
  switch (cifra.tipo) {
    case 'nada':
      return null
    case 'valor':
      return (
        <span data-cifra className="font-medium text-(--color-ink)">
          <ValorDeConstante
            valor={cifra.valor}
            formato={cifra.formato}
            decimales={DECIMALES_DE_LA_CIFRA}
          />
        </span>
      )
    case 'texto':
      return (
        <span data-cifra className="font-medium text-(--color-ink)">
          {cifra.texto}
        </span>
      )
    case 'sin_cifra':
      return (
        <span data-cifra className="text-(--color-ink-soft)">
          {cifra.faltante === null
            ? 'Sin cifra: depende de algo que falta.'
            : textoDelFaltante(cifra.faltante)}
        </span>
      )
    case 'apagada':
      return (
        <span data-cifra className="text-(--color-ink-soft)">
          {cifra.estado === 'fuera_de_variante' ? 'Fuera de la variante.' : 'Condición apagada.'}
        </span>
      )
    default: {
      const _: never = cifra
      return _
    }
  }
}
