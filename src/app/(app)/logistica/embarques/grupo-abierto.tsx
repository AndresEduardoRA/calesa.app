import {
  leerCatalogosDeTransporte,
  leerGrupo,
  tipoDeLaBaseDe,
  type VistaDeGrupos,
} from '@/modules/logistica'
import { ResumenDelGrupo } from '@/modules/logistica/pantallas/transporte'
import { datosO } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import { HUECOS_DEL_GRUPO, huecosDelGrupo } from './huecos-del-grupo'

// El resumen del grupo con esa clave: sus unidades y los huecos que la persona puede usar. Una clave que no existe y una que no se ve dan el mismo grupo sin unidades (la base no distingue); un
// error de lectura sube al `error.tsx` de `(app)`, que ofrece «Reintentar».
export async function GrupoAbierto({
  clave,
  vista,
  permisos,
}: {
  clave: string
  vista: VistaDeGrupos
  permisos: Permisos
}) {
  const [grupo, catalogos] = await Promise.all([
    leerGrupo(tipoDeLaBaseDe(vista), clave),
    leerCatalogosDeTransporte(),
  ])
  return (
    <ResumenDelGrupo
      grupo={datosO(grupo)}
      vista={vista}
      catalogos={datosO(catalogos)}
      huecos={huecosDelGrupo(HUECOS_DEL_GRUPO, permisos)}
    />
  )
}
