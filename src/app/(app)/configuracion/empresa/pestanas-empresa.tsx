'use client'

import { parseAsString, parseAsStringLiteral, useQueryStates } from 'nuqs'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { CLAVES_DE_PESTANA, PESTANAS, pestanaDe } from './pestanas'

const PARAMETROS = {
  seccion: parseAsStringLiteral(CLAVES_DE_PESTANA).withDefault('empresa'),
  // Los paneles de una pestaña no sobreviven al cambiar a otra.
  tc: parseAsString,
  moneda: parseAsString,
  panel: parseAsString,
}

// La pestaña abierta vive en la URL: se puede recargar y compartir el enlace.
export function PestanasEmpresa() {
  const [{ seccion }, setParametros] = useQueryStates(PARAMETROS, { shallow: false })
  return (
    <Tabs
      value={seccion}
      onValueChange={(elegida) => {
        void setParametros({
          seccion: pestanaDe(String(elegida)),
          tc: null,
          moneda: null,
          panel: null,
        })
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
