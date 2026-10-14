'use client'

import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { CLAVES_DE_PESTANA, PESTANAS, pestanaDe } from './pestanas'

const PARAMETROS = {
  seccion: parseAsStringLiteral(CLAVES_DE_PESTANA).withDefault('campos'),
  // El panel de una pestaña no sobrevive al cambiar a otra.
  campo: parseAsString,
}

// La pestaña abierta vive en la URL: se puede recargar y compartir el enlace.
export function PestanasDeLeads() {
  const [{ seccion }, setParametros] = useQueryStates(PARAMETROS, { shallow: false })
  return (
    <Tabs
      value={seccion}
      onValueChange={(elegida) => {
        void setParametros({ seccion: pestanaDe(String(elegida)), campo: null })
      }}
    >
      <TabsList className="h-11 w-full max-w-full justify-start overflow-x-auto md:h-8 md:w-fit">
        {PESTANAS.map((pestana) => (
          <TabsTrigger key={pestana.clave} value={pestana.clave} className="px-3">
            {pestana.titulo}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
