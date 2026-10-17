'use client'

import { useEffect, useRef, useState } from 'react'
import { valoresDe, valoresGuardadosDe } from '@/shared/lib/formularios'

// Si un formulario de campos sin estado (`defaultValue`, como los de tipos de cambio y moneda) tiene algo escrito: sus campos de
// texto por nombre contra lo que mandó el servidor (`valoresGuardadosDe()`). Se mide en cada `input` y `change`, y al enganchar: lo
// escrito antes de hidratar también cuenta. Va en el `ref` del `<form>`.
export function useHayCambiosEnFormulario(claves: readonly string[]) {
  const formulario = useRef<HTMLFormElement>(null)
  const [hayCambios, setHayCambios] = useState(false)
  const lista = claves.join('|')
  useEffect(() => {
    const elemento = formulario.current
    if (!elemento) {
      return
    }
    const nombres = lista === '' ? [] : lista.split('|')
    const medir = () => {
      setHayCambios(
        JSON.stringify(valoresDe(elemento, nombres)) !==
          JSON.stringify(valoresGuardadosDe(elemento, nombres)),
      )
    }
    medir()
    elemento.addEventListener('input', medir)
    elemento.addEventListener('change', medir)
    return () => {
      elemento.removeEventListener('input', medir)
      elemento.removeEventListener('change', medir)
    }
  }, [lista])
  return { formulario, hayCambios }
}
