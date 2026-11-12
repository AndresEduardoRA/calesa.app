'use client'

import { enviarAccion } from '@/shared/lib/enviar-accion'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import {
  leerNavierasDeConfiguracion,
  NO_SE_CARGARON_LAS_NAVIERAS,
} from '../../../areas/transporte/composicion.client'
import {
  MENSAJE_NAVIERA_YA_NO_ESTA,
  type NavieraDeCatalogo,
} from '../../../entities/transporte/catalogo'
import { guardarNaviera } from '../actions/guardar-naviera'
import { PANELES_DE_NAVIERA } from '../hooks/paneles-del-catalogo'
import {
  useCatalogoDeTransporte,
  type ConfigDelCatalogo,
} from '../hooks/use-catalogo-de-transporte'
import { useModalDelCatalogo } from '../hooks/use-modal-del-catalogo'
import { CatalogoDeTransporte } from './catalogo-de-transporte'
import { ModalDeNavieraDiferido } from './diferidos-de-modales'
import { filasDeNavieras } from './filas-del-catalogo'

const CONFIG: ConfigDelCatalogo<NavieraDeCatalogo> = {
  leer: leerNavierasDeConfiguracion,
  mensajeDeLectura: NO_SE_CARGARON_LAS_NAVIERAS,
  activar: (naviera, activo) =>
    enviarAccion(
      guardarNaviera({ id: naviera.id, nombre: naviera.nombre, cambios: { activo } }),
      'No se pudo guardar la naviera.',
    ),
  avisoActivado: 'Naviera activada.',
  avisoDesactivado: 'Naviera desactivada.',
}

// Configuración › Logística › Navieras (6.08-1): se crean, renombran, activan y desactivan; no se eliminan. Escribir lo exige `logistica.catalogos.gestionar` (la RLS de la tabla); la pestaña ya lo pide.
export function NavierasDeTransporte() {
  const datos = useCatalogoDeTransporte(CONFIG)
  const navieras = datos.lectura.tipo === 'listo' ? datos.lectura.filas : null
  const modal = useModalDelCatalogo(PANELES_DE_NAVIERA, navieras, MENSAJE_NAVIERA_YA_NO_ESTA)
  const montar = useAbiertoAlgunaVez(modal.abierto)
  return (
    <CatalogoDeTransporte
      clave="naviera"
      titulo="Navieras"
      descripcion="Son las que se eligen al cargar el transporte de una unidad y las que cada flujo ofrece."
      etiquetaDelBoton="Nueva naviera"
      etiquetaDeCarga="Cargando las navieras"
      tituloDelError="No se pudieron cargar las navieras"
      tituloDelVacio="Todavía no hay navieras cargadas."
      columnaDeUso="Estado"
      sustantivoDelTope="navieras"
      lectura={datos.lectura}
      filas={(lista) =>
        filasDeNavieras(lista, {
          alEditar: modal.abrirEdicion,
          alActivar: (naviera, activo) => void datos.activar(naviera, activo),
        })
      }
      alNuevo={modal.abrirNuevo}
      alAbrir={modal.abrirEdicion}
      alReintentar={datos.reintentar}
    >
      {montar ? (
        <ModalDeNavieraDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.alCerrar}
          original={modal.original}
          noDisponible={modal.noDisponible}
          alGuardar={datos.recargar}
        />
      ) : null}
    </CatalogoDeTransporte>
  )
}
