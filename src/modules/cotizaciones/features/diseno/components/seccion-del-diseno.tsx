import { PaletteIcon } from 'lucide-react'
import { datosO, type Resultado } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { EstadoVacio } from '@/shared/ui/estados'
import {
  leerDisenoDelOrigen,
  leerNivelesDelDiseno,
  leerTonosDelCatalogo,
} from '../../../areas/diseno/composicion'
import { origenElegido } from '../../../entities/origenes-para-cotizar'
import { DisenoDelOrigenDiferido } from './diferidos'

type Origen = { id: string; nombre: string; activo: boolean }

type Props = {
  // Todos los orígenes del catálogo, también los inactivos: los compone la página (este módulo no depende de `origenes`).
  origenes: Promise<Resultado<readonly Origen[]>>
  permisos: Permisos
  // `?origen=`: uno que no es de los suyos abre el primero.
  origenPedido: string | undefined
}

// La pestaña «Diseño» de Configuración › Cotización (4.22-2), leída en el servidor con la sesión de quien mira y detrás de `<Suspense>`: los orígenes donde tiene
// `cotizaciones.configurar` y, del abierto, el borrador o la publicada y los niveles. La base vuelve a decidir (policy `formulas: leer`). Una lectura que falla sube al
// `error.tsx` de la ruta, que ofrece «Reintentar».
export async function SeccionDelDiseno({ origenes, permisos, origenPedido }: Props) {
  const visibles = datosO(await origenes)
    .filter((origen) => puede(permisos, 'cotizaciones.configurar', origen.id))
    .map(({ id, nombre, activo }) => ({ id, nombre, activo }))
  const origen = origenElegido(visibles, origenPedido)
  if (!origen) {
    return (
      <EstadoVacio
        Icono={PaletteIcon}
        titulo="No hay orígenes donde puedas configurar el diseño de la hoja."
        compacto
      />
    )
  }
  const [leida, niveles, catalogo] = await Promise.all([
    leerDisenoDelOrigen(origen.id),
    leerNivelesDelDiseno(),
    leerTonosDelCatalogo(),
  ])
  // El tono es adorno de la vista previa: si su lectura falla, la hoja se dibuja sin colores y la pestaña sigue.
  const tonos = catalogo.ok
    ? catalogo.data.tonos.map((t) => ({
        clave: t.clave,
        claro: t.colores.claro,
        oscuro: t.colores.oscuro,
      }))
    : []
  return (
    <DisenoDelOrigenDiferido
      origenes={visibles}
      origen={origen}
      leida={datosO(leida)}
      niveles={datosO(niveles)}
      tonos={tonos}
    />
  )
}
