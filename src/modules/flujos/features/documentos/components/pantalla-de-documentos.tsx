import { WorkflowIcon } from 'lucide-react'
import { datosO, type Resultado } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { EstadoVacio } from '@/shared/ui/estados'
import { leerFlujosConfigurables } from '../../../areas/nucleo/composicion'
import {
  leerTiposDeDocumento,
  leerUsoDeTiposDeDocumento,
} from '../../../areas/documentos/composicion'
import {
  armarSelector,
  elegirEntrada,
  type OrigenDelSelector,
} from '../../../entities/selector-de-flujos'
import type { VistaDeGrupo } from '../../../entities/documentos/vista-de-grupo'
import { SelectorDeFlujo } from '../../configuracion/components/selector-de-flujo'
import { TiposDeDocumento } from './tipos-de-documento'

type Props = {
  permisos: Permisos
  // Todos los orígenes del catálogo, también los inactivos: los compone la página (este módulo no depende de `origenes`).
  origenes: Promise<Resultado<readonly OrigenDelSelector[]>>
  // `?origen=` y `?ambito=`: una URL que no es de los suyos abre el primero.
  origenPedido: string | undefined
  ambitoPedido: string | undefined
}

// Un grupo leído con la sesión de quien mira. El uso de cada tipo sólo se pide a quien puede cambiar el grupo: a los demás la base les diría 42501.
async function leerGrupo(flujoId: string | null, puedeCambiar: boolean): Promise<VistaDeGrupo> {
  const [grupo, uso] = await Promise.all([
    leerTiposDeDocumento(flujoId),
    puedeCambiar ? leerUsoDeTiposDeDocumento(flujoId) : null,
  ])
  return { grupo: datosO(grupo), puedeCambiar, uso: uso === null ? null : datosO(uso) }
}

// La pestaña «Documentos» de Configuración › Flujos (5.09), leída en el servidor con la sesión de quien mira y detrás de `<Suspense>`: los tipos de toda la
// empresa (se ven siempre; se cambian con `logistica.catalogos.gestionar`) y los del flujo elegido (los de un flujo que quien mira puede configurar).
// La base vuelve a decidir cada escritura. Una lectura que falla sube al `error.tsx` de `(app)`, que ofrece «Reintentar».
export async function PantallaDeDocumentos({
  permisos,
  origenes,
  origenPedido,
  ambitoPedido,
}: Props) {
  const [flujos, listaDeOrigenes] = await Promise.all([leerFlujosConfigurables(permisos), origenes])
  const entradas = armarSelector(datosO(flujos), datosO(listaDeOrigenes))
  const entrada = elegirEntrada(entradas, {
    origen: origenPedido ?? null,
    ambito: ambitoPedido ?? null,
  })
  const [empresa, flujo] = await Promise.all([
    leerGrupo(null, puede(permisos, 'logistica.catalogos.gestionar')),
    // Un flujo configurable ya es uno que quien mira puede configurar.
    entrada ? leerGrupo(entrada.flujo.id, true) : null,
  ])
  return (
    <TiposDeDocumento
      vistas={{ empresa, flujo }}
      nombreDelFlujo={entrada?.titulo ?? null}
      selector={
        entrada ? (
          <SelectorDeFlujo
            entradas={entradas.map(({ clave, titulo }) => ({ clave, titulo }))}
            valor={entrada.clave}
          />
        ) : (
          <EstadoVacio
            Icono={WorkflowIcon}
            titulo="No hay flujos que puedas configurar."
            compacto
          />
        )
      }
    />
  )
}
