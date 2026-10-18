'use client'

import type { Route } from 'next'
import { Trash2Icon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { RUTAS } from '@/shared/lib/rutas'
import { MasAcciones, type AccionDeMenu } from '@/shared/ui/lista'
import {
  ETIQUETA_DE_ACCION_DE_VEHICULO,
  accionesDeVehiculo,
  type OfertaDeAccion,
} from '../../../entities/acciones-de-vehiculo'
import type { PermisoDePapelera } from '../../../entities/papelera'
import type { PermisoDeVitrina } from '../../../entities/vitrina'
import { usePanelDeVehiculo } from '../../alta/hooks/use-panel-de-vehiculo'
import { useEnvioAPapelera } from '../../papelera/hooks/use-envio-a-papelera'

type Props = {
  vehiculo: { id: string; titulo: string; origenId: string; actualizadoEn: string }
  // Se ofrece «Editar» en el menú: la fila y la tarjeta. En el resumen y en la ficha es un botón de la cabecera.
  editar: boolean
  // «Publicar en la web…»: nulo no se ofrece (la lista y el resumen lo callan sin el permiso); apagado se ve con el motivo (la ficha, siempre).
  publicar: PermisoDeVitrina | null
  papelera: PermisoDePapelera
  // Qué hace «Publicar en la web…» donde el panel de la vitrina ya está (la ficha). Sin esto lleva a la ficha con el panel abierto.
  alPublicar?: () => void
  // Se envió: el vehículo ya no está donde se miraba (la ficha vuelve al inventario y el resumen se cierra).
  alEnviado?: () => void
  // En una cabecera (el resumen, la ficha): con borde, como los botones de al lado.
  conBorde?: boolean
}

const oferta = (
  permiso: { estado: 'oculto' | 'deshabilitado' | 'habilitado' } | null,
): OfertaDeAccion =>
  permiso === null || permiso.estado === 'oculto'
    ? 'oculta'
    : permiso.estado === 'deshabilitado'
      ? 'apagada'
      : 'habilitada'

// «Publicar en la web…» lleva a la ficha con su panel abierto: el panel y la vista previa de lo que verá el visitante viven en la ficha.
const aLaVitrina = (id: string) => `${RUTAS.vehiculos}/${id}?panel=vitrina`

// El «⋯» de un vehículo: la lista de siempre (`accionesDeVehiculo()`), igual en la fila, la tarjeta, el resumen y la ficha. «Enviar a la
// papelera» se hace sin preguntar y ofrece «Deshacer»; lo que ya se sabe que la base va a rechazar (vinculado, fuera de su fase inicial)
// se ve apagado con el motivo. Sin nada que ofrecer no se dibuja.
export function MenuDeVehiculo(props: Props) {
  const { vehiculo, editar, publicar, papelera, alPublicar, alEnviado, conBorde } = props
  const router = useRouter()
  const panel = usePanelDeVehiculo()
  const envio = useEnvioAPapelera()
  const bloques = accionesDeVehiculo({
    editar: editar ? 'habilitada' : 'oculta',
    publicar: oferta(publicar),
    papelera: oferta(papelera),
  })
  if (bloques.length === 0) {
    return null
  }
  const motivoDe = (permiso: { estado: string; motivo?: string } | null) =>
    permiso?.estado === 'deshabilitado' ? (permiso.motivo ?? null) : null

  const lineas: Record<string, () => AccionDeMenu[]> = {
    editar: () => [
      {
        tipo: 'accion',
        clave: 'editar',
        etiqueta: ETIQUETA_DE_ACCION_DE_VEHICULO.editar,
        despuesDeCerrar: true,
        alElegir: () => {
          panel.editar(vehiculo.id)
        },
      },
    ],
    publicar: () => [
      {
        tipo: 'accion',
        clave: 'publicar',
        etiqueta: ETIQUETA_DE_ACCION_DE_VEHICULO.publicar,
        despuesDeCerrar: true,
        deshabilitada: publicar?.estado === 'deshabilitado',
        alElegir:
          alPublicar ??
          (() => {
            router.push(aLaVitrina(vehiculo.id) as Route)
          }),
      },
      ...notaDe(motivoDe(publicar), 'motivo-publicar'),
    ],
    papelera: () => [
      {
        tipo: 'accion',
        clave: 'papelera',
        etiqueta: ETIQUETA_DE_ACCION_DE_VEHICULO.papelera,
        icono: <Trash2Icon aria-hidden />,
        destructiva: true,
        deshabilitada: envio.enCurso || papelera.estado === 'deshabilitado',
        alElegir: () => {
          void envio.enviar([vehiculo]).then((entro) => {
            if (entro) {
              alEnviado?.()
            }
          })
        },
      },
      ...notaDe(motivoDe(papelera), 'motivo-papelera'),
    ],
  }
  const acciones = bloques.flatMap((bloque, indice) => [
    ...(indice > 0 ? [{ tipo: 'separador' as const, clave: `separador-${String(indice)}` }] : []),
    ...bloque.flatMap((clave) => lineas[clave]?.() ?? []),
  ])
  return (
    <MasAcciones
      nombre={vehiculo.titulo}
      id={vehiculo.id}
      acciones={acciones}
      conBorde={conBorde}
    />
  )
}

function notaDe(motivo: string | null, clave: string): AccionDeMenu[] {
  return motivo === null ? [] : [{ tipo: 'nota', clave, texto: motivo }]
}
