import { WorkflowIcon } from 'lucide-react'
import { Suspense, type ReactNode } from 'react'
import { datosO, type Resultado } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import { EstadoVacio } from '@/shared/ui/estados'
import type { FlujoParaConfigurar } from '../../../entities/flujo'
import { leerFlujoParaConfigurar, leerFlujosConfigurables } from '../../../areas/nucleo/composicion'
import {
  armarSelector,
  elegirEntrada,
  type OrigenDelSelector,
} from '../../../entities/selector-de-flujos'
import { FlujoAbierto } from './flujo-abierto'
import type { HuecosDelFlujo } from './huecos'
import { SelectorDeFlujo } from './selector-de-flujo'

type Props = {
  permisos: Permisos
  // Todos los orígenes del catálogo, también los inactivos: los compone la página (este módulo no depende de `origenes`).
  origenes: Promise<Resultado<readonly OrigenDelSelector[]>>
  // Los roles para nombrarlos en el inspector (los compone la página: `flujos` no importa `equipo`).
  roles: Promise<Resultado<{ roles: readonly { id: string; nombre: string }[]; hayMas: boolean }>>
  // `?origen=` y `?ambito=`: una URL que no es de los suyos abre el primero.
  origenPedido: string | undefined
  ambitoPedido: string | undefined
  huecos: HuecosDelFlujo
  // Lo que va sobre la lista de fases del flujo abierto (5.08: el aviso de «fuera de regla»). Una función de servidor, no un hueco de cliente: se llama con el
  // flujo ya leído y puede leer lo suyo; va detrás de su propio `<Suspense>` sin esqueleto (lo común es que no haya nada que mostrar).
  sobreLaLista?: (flujo: FlujoParaConfigurar) => ReactNode
}

// La pestaña «Fases» de Configuración › Flujos (5.02), leída en el servidor con la sesión de quien mira y detrás de `<Suspense>`: los flujos que puede configurar,
// el elegido entero y los roles para nombrarlos. La base vuelve a decidir cada escritura. Una lectura que falla sube al `error.tsx` de `(app)`, que ofrece «Reintentar».
export async function PantallaDelFlujo({
  permisos,
  origenes,
  roles,
  origenPedido,
  ambitoPedido,
  huecos,
  sobreLaLista,
}: Props) {
  const [flujos, listaDeOrigenes, rolesLeidos] = await Promise.all([
    leerFlujosConfigurables(permisos),
    origenes,
    roles,
  ])
  const entradas = armarSelector(datosO(flujos), datosO(listaDeOrigenes))
  const entrada = elegirEntrada(entradas, {
    origen: origenPedido ?? null,
    ambito: ambitoPedido ?? null,
  })
  if (!entrada) {
    return (
      <EstadoVacio Icono={WorkflowIcon} titulo="No hay flujos que puedas configurar." compacto />
    )
  }
  const flujo = datosO(await leerFlujoParaConfigurar(entrada.flujo.id))
  const Franja = huecos.franjaDeRevisar
  return (
    <div className="grid gap-4">
      {flujo && Franja ? <Franja flujo={flujo} /> : null}
      <SelectorDeFlujo
        entradas={entradas.map(({ clave, titulo }) => ({ clave, titulo }))}
        valor={entrada.clave}
      />
      {flujo && sobreLaLista ? <Suspense fallback={null}>{sobreLaLista(flujo)}</Suspense> : null}
      {flujo ? (
        <FlujoAbierto
          flujo={flujo}
          nombreDelFlujo={entrada.titulo}
          roles={datosO(rolesLeidos).roles}
          huecos={huecos}
        />
      ) : (
        <EstadoVacio Icono={WorkflowIcon} titulo="Este flujo ya no existe." compacto />
      )}
    </div>
  )
}
