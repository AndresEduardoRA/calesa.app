import { connection } from 'next/server'
import {
  entidadElegida,
  leerPersonasParaDestino,
  opcionesDeImportar,
  origenElegido,
  puedeImportar,
} from '@/modules/datos'
import { SeccionImportarDiferida } from '@/modules/datos/pantallas/datos'
import { requerirSesion, puede } from '@/modules/equipo'
import { leerDatosDeImportacion } from '@/modules/leads'
import { getOrigenes, leerLayout } from '@/modules/origenes'
import { datosO, ok } from '@/shared/lib/errores'
import { EstadoSinPermiso } from '@/shared/ui/estados'

type Props = { entidad: string | undefined; origen: string | undefined }

const SIN_PERSONAS = ok({ personas: [], hayMas: false })

// La sección «Importar» de `/datos` (9.06-4b): el servidor lee sólo el contexto de la entidad de la URL (D43). Un error de lectura va a
// `error.tsx` con «Reintentar» (D50). Los permisos sólo dibujan: la acción y `importacion_crear` los exigen.
export async function SeccionImportarDeDatos({ entidad: pedida, origen: pedido }: Props) {
  await connection()
  const sesion = await requerirSesion()
  const origenes = datosO(await getOrigenes(true))
  const opciones = opcionesDeImportar(sesion.permisos, origenes)
  const entidad = entidadElegida(pedida, opciones)
  if (!puedeImportar(opciones) || entidad === null) {
    return (
      <EstadoSinPermiso descripcion="Tu rol no importa leads ni vehículos. Pídeselo a quien administra los roles." />
    )
  }
  const comun = { yo: sesion.usuarioId, permisos: sesion.permisos, opciones, entidad }
  if (entidad === 'leads') {
    const [datos, personas] = await Promise.all([
      leerDatosDeImportacion(),
      puede(sesion.permisos, 'datos.importar.todo')
        ? leerPersonasParaDestino(sesion.usuarioId)
        : SIN_PERSONAS,
    ])
    const leidos = datosO(datos)
    const destinos = datosO(personas)
    return (
      <SeccionImportarDiferida
        {...comun}
        origenId={null}
        seccion={{
          entidad: 'leads',
          campos: leidos.campos,
          contexto: leidos.contexto,
          personas: destinos.personas,
          hayMasPersonas: destinos.hayMas,
        }}
      />
    )
  }
  const origenId = origenElegido(pedido, opciones)
  const origen = origenes.find((uno) => uno.id === origenId)
  if (!origen) {
    return <SeccionImportarDiferida {...comun} origenId={null} seccion={null} />
  }
  const layout = datosO(await leerLayout(origen.id, { conUso: false }))
  return (
    <SeccionImportarDiferida
      {...comun}
      origenId={origen.id}
      seccion={{
        entidad: 'vehiculos',
        origen: { id: origen.id, nombre: origen.nombre, tipo: origen.tipo },
        campos: layout.campos,
        categorias: layout.categorias,
      }}
    />
  )
}
