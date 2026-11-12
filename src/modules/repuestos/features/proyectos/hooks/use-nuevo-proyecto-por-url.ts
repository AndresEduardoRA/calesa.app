'use client'

import { useApertura } from '@/shared/ui/use-apertura'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { useRevisionAlAbrir } from '@/shared/ui/use-revision-al-abrir'
import { PANEL_NUEVO_PROYECTO, CLAVE_DE_VEHICULO } from '../../../entities/proyectos/paneles'
import { SIN_PERMISO_PARA_CREAR_PROYECTOS } from '../../../entities/proyectos/errores'

// «Nuevo proyecto» en la URL (`?panel=nuevo-proyecto`, y `&vehiculo=<id>` para abrirlo ya vinculado, 8.09-4): se puede recargar, «atrás» lo cierra y se comparte. Sin `repuestos.editar`
// no abre: se avisa y la URL se limpia, una vez. Cada apertura es nueva (`apertura`): un id de intento nuevo y los campos vacíos.
export function useNuevoProyectoPorUrl(puedeEditar: boolean) {
  const url = usePanelPorUrl(PANEL_NUEVO_PROYECTO, [CLAVE_DE_VEHICULO])
  const apertura = useApertura(url.abierto)
  const rechazada = useRevisionAlAbrir(
    url.abierto ? String(apertura) : null,
    puedeEditar ? null : SIN_PERMISO_PARA_CREAR_PROYECTOS,
    url.cerrar,
  )
  return {
    abierto: url.abierto && !rechazada,
    apertura,
    // El `?vehiculo=` que trae la URL ahora: el servidor sólo lo resolvió si es el de la carga.
    vehiculoEnLaUrl: url.valor(CLAVE_DE_VEHICULO),
    abrir: () => {
      url.abrir()
    },
    cerrar: url.cerrar,
  }
}
