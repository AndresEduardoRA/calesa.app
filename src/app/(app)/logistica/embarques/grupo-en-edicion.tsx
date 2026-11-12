import {
  leerCatalogosDeTransporte,
  leerGrupo,
  tipoDeLaBaseDe,
  type VistaDeGrupos,
} from '@/modules/logistica'
import { DrawerDeEdicionDelGrupo } from '@/modules/logistica/pantallas/transporte'
import { datosO } from '@/shared/lib/errores'

// El formulario de «Editar grupo» (`?panel=editar-grupo`): lee las unidades del grupo y los catálogos y los pasa al drawer. Una sola lectura del grupo por pedido: el resumen no se dibuja a la
// vez (D36). Un error de lectura sube al `error.tsx` de `(app)`, que ofrece «Reintentar».
export async function GrupoEnEdicion({
  clave,
  vista,
  claveDeUrl,
}: {
  clave: string
  vista: VistaDeGrupos
  claveDeUrl: string
}) {
  const [grupo, catalogos] = await Promise.all([
    leerGrupo(tipoDeLaBaseDe(vista), clave),
    leerCatalogosDeTransporte(),
  ])
  const { navieras, puertos } = datosO(catalogos)
  return (
    <DrawerDeEdicionDelGrupo
      grupo={datosO(grupo)}
      navieras={navieras.map((n) => ({ id: n.id, nombre: n.nombre, activo: n.activo }))}
      puertos={puertos.map((p) => ({ id: p.id, nombre: p.nombre, activo: p.activo }))}
      claveDeUrl={claveDeUrl}
    />
  )
}
