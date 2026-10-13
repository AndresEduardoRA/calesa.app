'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { frasePorVacio } from '@/modules/origenes/client'
import { CLAVE_DE_CURSOR } from '@/shared/lib/filtros'
import type { Pagina } from '@/shared/lib/paginacion'
import { RUTAS } from '@/shared/lib/rutas'
import { buttonVariants } from '@/shared/ui/button'
import { EstadoSinResultados, EstadoVacio } from '@/shared/ui/estados'
import { useFiltrosDelListado } from '@/shared/ui/filtros'
import { Paginacion } from './paginacion'
import { TablaDeVehiculos } from './tabla-de-vehiculos'
import { TarjetaVehiculo } from './tarjeta-vehiculo'
import { faseDe, type DatosDelOrigen, type FilaDeVehiculo } from './tipos'

type Props = DatosDelOrigen & {
  pagina: Pagina<FilaDeVehiculo>
  // «Nuevo», si la persona puede dar de alta acá: llena el vacío de primera vez.
  accionDeVacio?: ReactNode
}

const mayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1)

// Se llegó con un cursor a una página que ya no tiene nada (se borró, cambió un filtro por otro
// lado): se ofrece volver al principio en vez de mostrar un vacío sin salida.
function PaginaSinFilas() {
  const ruta = usePathname()
  const parametros = new URLSearchParams(useSearchParams())
  parametros.delete(CLAVE_DE_CURSOR)
  return (
    <EstadoVacio
      titulo="No hay más en esta página"
      descripcion="Lo que había acá cambió mientras navegabas."
      accion={
        <Link
          href={`${ruta}?${parametros.toString()}` as Route}
          className={buttonVariants({ variant: 'outline' })}
        >
          Volver al principio
        </Link>
      }
    />
  )
}

// La lista de un origen o el estado que corresponda: vacío de primera vez (con la frase del
// origen), vacío por filtro (con «Limpiar») o una página que se quedó sin filas.
export function ResultadoDelListado({ pagina, accionDeVacio, ...datos }: Props) {
  const filtros = useFiltrosDelListado()
  const hayCursor = useSearchParams().has(CLAVE_DE_CURSOR)
  const { origen, campos, fases } = datos

  if (pagina.filas.length === 0) {
    if (filtros.hayFiltros) {
      return <EstadoSinResultados alLimpiar={filtros.limpiar} />
    }
    if (hayCursor) {
      return <PaginaSinFilas />
    }
    return (
      <EstadoVacio
        titulo={mayuscula(frasePorVacio(origen))}
        descripcion={
          origen.activo
            ? 'Lo que se dé de alta en este origen va a aparecer acá.'
            : 'Este origen está desactivado: no recibe registros nuevos.'
        }
        accion={accionDeVacio}
      />
    )
  }

  return (
    <div className="grid gap-3">
      <div className="hidden md:block">
        <TablaDeVehiculos
          {...datos}
          vehiculos={pagina.filas}
          encabezado={mayuscula(origen.sustantivo)}
        />
      </div>
      <ul className="grid gap-2 md:hidden">
        {pagina.filas.map((vehiculo) => (
          <li key={vehiculo.id}>
            <TarjetaVehiculo
              vehiculo={vehiculo}
              campos={campos}
              fase={faseDe(fases, vehiculo.faseId)}
              href={`${RUTAS.vehiculos}/${vehiculo.id}`}
            />
          </li>
        ))}
      </ul>
      <Paginacion siguiente={pagina.siguiente} anterior={pagina.anterior} />
    </div>
  )
}
