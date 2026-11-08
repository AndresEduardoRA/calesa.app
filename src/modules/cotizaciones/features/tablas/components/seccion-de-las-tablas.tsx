import { TableIcon } from 'lucide-react'
import { datosO, type Resultado } from '@/shared/lib/errores'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { EstadoVacio } from '@/shared/ui/estados'
import { leerTablasDeReferencia } from '../../../areas/tablas/composicion'
import { origenElegido } from '../../../entities/origenes-para-cotizar'
import { ListaDeTablas } from './lista-de-tablas'

type Origen = { id: string; nombre: string; activo: boolean }

type Props = {
  // Todos los orígenes del catálogo, también los inactivos: los compone la página (este módulo no depende de `origenes`).
  origenes: Promise<Resultado<readonly Origen[]>>
  permisos: Permisos
  // `?origen=`: uno que no es de los suyos abre el primero.
  origenPedido: string | undefined
  // `?tabla=`: la tabla que se edita.
  tablaPedida: string | undefined
}

// La pestaña «Tablas» de Configuración › Cotización (4.23-3), leída en el servidor con la sesión de quien mira y detrás de `<Suspense>`: los orígenes donde tiene
// `cotizaciones.configurar` (la misma línea que el área `formula`: un área no importa otra) y las tablas de referencia del abierto. La base vuelve a decidir (policy
// `tablas_referencia: leer`). Una lectura que falla sube al `error.tsx` de la ruta, que ofrece «Reintentar».
export async function SeccionDeLasTablas({ origenes, permisos, origenPedido }: Props) {
  const visibles = datosO(await origenes)
    .filter((origen) => puede(permisos, 'cotizaciones.configurar', origen.id))
    .map(({ id, nombre, activo }) => ({ id, nombre, activo }))
  const origen = origenElegido(visibles, origenPedido)
  return (
    <div className="grid min-w-0 gap-4">
      <div className="grid gap-0.5">
        <h2 className="text-(length:--text-lg) font-semibold text-(--color-ink)">
          Tablas de referencia
        </h2>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Las filas con las que la fórmula busca un valor (por año, por tipo). Publicar una tabla
          publica la versión siguiente de las fórmulas que la usan.
        </p>
      </div>
      {origen ? (
        <ListaDeTablas
          origenes={visibles}
          origen={origen}
          lectura={datosO(await leerTablasDeReferencia(origen.id))}
        />
      ) : (
        <EstadoVacio
          Icono={TableIcon}
          titulo="No hay orígenes donde puedas configurar las tablas de referencia."
          compacto
        />
      )}
    </div>
  )
}
