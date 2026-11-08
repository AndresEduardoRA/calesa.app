import { Suspense } from 'react'
import { EsqueletoFormulario } from '@/shared/ui/esqueletos'
import { leerSerieVigente } from '../../../areas/comprobantes/composicion'
import { ErrorDeLectura } from './error-de-lectura'
import { FormularioDeSerie } from './formulario-de-serie'

// La pestaña «Comprobantes» de Configuración › Empresa (4.26-3): la serie vigente se lee en el servidor tras `<Suspense>`. Si la lectura falla, el error con
// «Reintentar»; nunca una serie inventada.
export function SerieDeComprobantes({ puedeCambiar }: { puedeCambiar: boolean }) {
  return (
    <Suspense fallback={<EsqueletoFormulario />}>
      <Serie puedeCambiar={puedeCambiar} />
    </Suspense>
  )
}

async function Serie({ puedeCambiar }: { puedeCambiar: boolean }) {
  const lectura = await leerSerieVigente()
  if (!lectura.ok) {
    return <ErrorDeLectura titulo="No se pudo cargar la serie" />
  }
  return (
    <FormularioDeSerie
      key={lectura.data.actualizadoEn}
      vigente={lectura.data}
      puedeCambiar={puedeCambiar}
    />
  )
}
