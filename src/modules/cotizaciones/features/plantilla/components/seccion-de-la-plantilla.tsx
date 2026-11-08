import { IdCardIcon } from 'lucide-react'
import type { ComponentType } from 'react'
import type { Route } from 'next'
import Link from 'next/link'
import { datosO, type Resultado } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { leerPlantillaDelOrigen } from '../../../areas/plantilla/composicion'
import { origenElegido } from '../../../entities/origenes-para-cotizar'
import { origenesDeLaTarjeta } from '../../../entities/plantilla/origenes-de-la-tarjeta'
import { propsDelEditor } from '../../../entities/plantilla/props-del-editor'
import type { PropsDeLaVistaPreviaDeLaPlantilla } from '../../../entities/vista-previa-de-la-plantilla'
import { PestanaDeLaTarjeta } from './pestana-de-la-tarjeta'
import { SelectorDeOrigen } from './selector-de-origen'

type Origen = { id: string; nombre: string; activo: boolean }

type Props = {
  // Todos los orígenes del catálogo, también los inactivos: los compone la página (este módulo no depende de `origenes`).
  origenes: Promise<Resultado<readonly Origen[]>>
  permisos: Permisos
  // `?origen=`: uno que no es de los suyos abre el primero.
  origenPedido: string | undefined
  // La vista previa del editor (4.19-4): la página la trae del área `tarjeta` y este módulo no la importa.
  VistaPrevia?: ComponentType<PropsDeLaVistaPreviaDeLaPlantilla>
}

// La pestaña «Tarjeta» de Configuración › Cotización (4.19-3b), leída en el servidor con la sesión de quien mira y detrás de `<Suspense>`: los orígenes donde tiene
// `cotizaciones.configurar` y, del abierto, el borrador, la publicada y la fórmula con la que se validan. Al editor sólo llega lo que dibuja (`propsDelEditor()`). La base
// vuelve a decidir (policy `plantillas_tarjeta: leer`). Una lectura que falla sube al `error.tsx` de la ruta, que ofrece «Reintentar».
export async function SeccionDeLaPlantilla({
  origenes,
  permisos,
  origenPedido,
  VistaPrevia,
}: Props) {
  const visibles = origenesDeLaTarjeta(permisos, datosO(await origenes)).map(
    ({ id, nombre, activo }) => ({ id, nombre, activo }),
  )
  const origen = origenElegido(visibles, origenPedido)
  if (!origen) {
    return (
      <EstadoVacio
        Icono={IdCardIcon}
        titulo="No hay orígenes donde puedas configurar la tarjeta."
        compacto
      />
    )
  }
  const editor = propsDelEditor(datosO(await leerPlantillaDelOrigen(origen.id)), origen)
  return (
    <>
      <SelectorDeOrigen origenes={visibles} origenId={origen.id} />
      {editor === null ? (
        <EstadoVacio
          Icono={IdCardIcon}
          titulo={`Falta publicar la fórmula de ${origen.nombre}: la tarjeta se arma con sus grupos.`}
          accion={
            <Link
              href={
                `${RUTAS.configuracionDeCotizacion}?seccion=formula&origen=${origen.id}` as Route
              }
              className={buttonVariants({ className: 'min-h-11 md:min-h-8' })}
            >
              Ir a «Fórmula»
            </Link>
          }
          compacto
        />
      ) : (
        <PestanaDeLaTarjeta editor={editor} VistaPrevia={VistaPrevia} />
      )}
    </>
  )
}
