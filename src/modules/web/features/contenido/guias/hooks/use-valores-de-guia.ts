'use client'

import { useMemo, useState } from 'react'
import { useBorradorDeEstado } from '@/shared/ui/use-borrador-de-estado'
import type { GuiaCompleta } from '../../../../entities/contenido/guias'
import { valoresDeGuia, type ValoresDeGuia } from './valores-de-guia'

// Lo que la página de la guía edita, a partir de lo guardado, con su borrador en `sessionStorage` (el documento incluido): al volver se repone lo
// escrito y se avisa con «Descartar». Quien la usa remonta el formulario con la versión de la guía como `key`.
export function useValoresDeGuia(guia: GuiaCompleta) {
  const guardado = useMemo(() => valoresDeGuia(guia), [guia])
  const [valores, setValores] = useState<ValoresDeGuia>(guardado)
  const cambiar = (cambios: Partial<ValoresDeGuia>) => {
    setValores((antes) => ({ ...antes, ...cambios }))
  }
  const borrador = useBorradorDeEstado({
    clave: `guia-${guia.id}`,
    valores,
    guardado,
    alReponer: cambiar,
  })
  return { valores, cambiar, borrador }
}
