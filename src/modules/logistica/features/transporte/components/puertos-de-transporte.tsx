'use client'

import { enviarAccion } from '@/shared/lib/enviar-accion'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import {
  leerPuertosDeConfiguracion,
  NO_SE_CARGARON_LOS_PUERTOS,
} from '../../../areas/transporte/composicion.client'
import {
  MENSAJE_PUERTO_YA_NO_ESTA,
  type PuertoDeCatalogo,
} from '../../../entities/transporte/catalogo'
import { guardarPuerto } from '../actions/guardar-puerto'
import { PANELES_DE_PUERTO } from '../hooks/paneles-del-catalogo'
import {
  useCatalogoDeTransporte,
  type ConfigDelCatalogo,
} from '../hooks/use-catalogo-de-transporte'
import { useModalDelCatalogo } from '../hooks/use-modal-del-catalogo'
import { CatalogoDeTransporte } from './catalogo-de-transporte'
import { ModalDePuertoDiferido } from './diferidos-de-modales'
import { filasDePuertos } from './filas-del-catalogo'

const CONFIG: ConfigDelCatalogo<PuertoDeCatalogo> = {
  leer: leerPuertosDeConfiguracion,
  mensajeDeLectura: NO_SE_CARGARON_LOS_PUERTOS,
  activar: (puerto, activo) =>
    enviarAccion(
      guardarPuerto({
        id: puerto.id,
        nombre: puerto.nombre,
        pais: puerto.pais,
        cambios: { activo },
      }),
      'No se pudo guardar el puerto.',
    ),
  avisoActivado: 'Puerto activado.',
  avisoDesactivado: 'Puerto desactivado.',
}

// Configuración › Logística › Puertos (6.08-1): se crean, renombran, ordenan (con un número), activan y desactivan; no se eliminan. Escribir lo exige `logistica.catalogos.gestionar` (la RLS de la tabla);
// la pestaña ya lo pide.
export function PuertosDeTransporte() {
  const datos = useCatalogoDeTransporte(CONFIG)
  const puertos = datos.lectura.tipo === 'listo' ? datos.lectura.filas : null
  const modal = useModalDelCatalogo(PANELES_DE_PUERTO, puertos, MENSAJE_PUERTO_YA_NO_ESTA)
  const montar = useAbiertoAlgunaVez(modal.abierto)
  return (
    <CatalogoDeTransporte
      clave="puerto"
      titulo="Puertos"
      descripcion="Son los orígenes y destinos que se eligen al cargar el transporte de una unidad."
      etiquetaDelBoton="Nuevo puerto"
      etiquetaDeCarga="Cargando los puertos"
      tituloDelError="No se pudieron cargar los puertos"
      tituloDelVacio="Todavía no hay puertos cargados."
      columnaDeUso="País y código"
      sustantivoDelTope="puertos"
      lectura={datos.lectura}
      filas={(lista) =>
        filasDePuertos(lista, {
          alEditar: modal.abrirEdicion,
          alActivar: (puerto, activo) => void datos.activar(puerto, activo),
        })
      }
      alNuevo={modal.abrirNuevo}
      alAbrir={modal.abrirEdicion}
      alReintentar={datos.reintentar}
    >
      {montar ? (
        <ModalDePuertoDiferido
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
