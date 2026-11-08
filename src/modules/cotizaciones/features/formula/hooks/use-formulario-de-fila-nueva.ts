'use client'

import { useState } from 'react'
import {
  idDeFilaNueva,
  type PedidoDeFilaNueva,
  type TipoDeFilaNueva,
} from '../../../entities/formula/fila-nueva'

const TEXTO_INICIAL: Record<TipoDeFilaNueva, string> = { calculo: '', constante: '0' }

// Lo que se escribe en «Sumar fila» (4.21-3a-2, P6): la etiqueta, el nombre (id) —que sigue a la etiqueta mientras no se toque— el tipo y el texto. Al cambiar de tipo, un
// texto que sigue siendo el del tipo de antes (vacío o `0`) pasa al del nuevo; uno escrito se conserva. Los errores y qué se crea son de quien lo usa.
export function useFormularioDeFilaNueva(ocupados: ReadonlySet<string>) {
  const [etiqueta, setEtiqueta] = useState('')
  const [idEscrito, setIdEscrito] = useState<string | null>(null)
  const [tipo, setTipo] = useState<TipoDeFilaNueva>('calculo')
  const [texto, setTexto] = useState(TEXTO_INICIAL.calculo)

  const propuesto = etiqueta.trim() === '' ? '' : idDeFilaNueva(etiqueta, ocupados)
  const id = idEscrito ?? propuesto
  return {
    etiqueta,
    id,
    tipo,
    texto,
    cambiarEtiqueta: setEtiqueta,
    cambiarId: setIdEscrito,
    cambiarTexto: setTexto,
    cambiarTipo: (nuevo: TipoDeFilaNueva) => {
      if (texto === TEXTO_INICIAL[tipo]) setTexto(TEXTO_INICIAL[nuevo])
      setTipo(nuevo)
    },
    pedido: (): Omit<PedidoDeFilaNueva, 'despuesDe'> => ({ etiqueta, id, tipo, texto }),
  }
}
