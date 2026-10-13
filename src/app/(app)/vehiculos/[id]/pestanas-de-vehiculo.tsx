'use client'

import { parseAsString, useQueryStates } from 'nuqs'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { pestanaDeVehiculo, pestanasDisponibles } from './pestanas'

const DISPONIBLES = pestanasDisponibles()
// La clave `seccion` es la misma que lee la página en el servidor (`CLAVE_DE_PESTANA`): no se
// importa acá porque una constante de un archivo de cliente le llegaría como referencia.
const PARAMETROS = { seccion: parseAsString.withDefault('ficha') }

// La pestaña abierta vive en la URL: se puede recargar y compartir el enlace.
export function PestanasDeVehiculo() {
  const [{ seccion }, setParametros] = useQueryStates(PARAMETROS, { shallow: false })
  return (
    <Tabs
      // Lo que venga en la URL que no sea una pestaña que existe abre la ficha.
      value={pestanaDeVehiculo(seccion)}
      onValueChange={(elegida) => {
        void setParametros({ seccion: pestanaDeVehiculo(String(elegida)) })
      }}
    >
      <TabsList className="h-11 w-full max-w-full justify-start overflow-x-auto md:h-8 md:w-fit">
        {DISPONIBLES.map((pestana) => (
          <TabsTrigger key={pestana.clave} value={pestana.clave} className="px-3">
            {pestana.titulo}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}
