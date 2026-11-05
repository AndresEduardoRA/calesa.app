import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Suspense } from 'react'
import {
  MAXIMO_DE_PAGINA_DE_COTIZACIONES,
  esquemaDelListado,
  filasConNombres,
  idDelResumen,
  idsDe,
  leerAutoresDeCotizaciones,
  leerListadoDeCotizaciones,
  leerUnaDelListado,
  origenParaNueva,
  pedidoDelListado,
  rutaDeLaHoja,
  CLAVE_DE_RESUMEN_DE_COTIZACION,
  CLAVE_DE_VEHICULO,
  type FilaDelListado,
  type LecturaDelServidor,
} from '@/modules/cotizaciones'
import { ListadoDeCotizaciones } from '@/modules/cotizaciones/pantallas/listado'
import { requerirSesion } from '@/modules/equipo'
import { leerNombresDeLeads } from '@/modules/leads'
import { getOrigenes } from '@/modules/origenes'
import { leerTitulosDeVehiculos, leerVehiculo } from '@/modules/vehiculos'
import { datosO } from '@/shared/lib/errores'
import { CLAVE_DE_CURSOR, CLAVE_DE_POR_PAGINA, leerFiltros } from '@/shared/lib/filtros'
import { leerCursor, leerPorPagina, tamanoDePagina, tamanosHasta } from '@/shared/lib/paginacion'
import { puede, type Permisos } from '@/shared/lib/permisos'
import { unParametro } from '@/shared/lib/rutas'
import { EstadoSinPermiso } from '@/shared/ui/estados'
import { EsqueletoListado } from '@/shared/ui/esqueletos'

export const metadata: Metadata = { title: 'Cotizaciones' }

// Las cotizaciones que quien mira ve (`docs/UX.md` › «Cotizaciones»): una página por cursor con sus filtros en la URL. Lo que se ve lo decide la RLS (`cotizaciones_listado()` es invocadora);
// acá sólo se arma el pedido, se leen los nombres de la página y se dibuja.
export default function PaginaDeCotizaciones({ searchParams }: PageProps<'/cotizaciones'>) {
  return (
    <Suspense fallback={<EsqueletoListado filas={8} columnas={8} />}>
      <Listado searchParams={searchParams} />
    </Suspense>
  )
}

// Los nombres de unas filas, una vez y por clave primaria: el cliente sólo con `leads.ver`; lo que quien mira no ve no llega y se dibuja «—».
async function nombresDe(permisos: Permisos, filas: readonly FilaDelListado[]) {
  const [clientes, vehiculos, autores] = await Promise.all([
    puede(permisos, 'leads.ver')
      ? leerNombresDeLeads(idsDe(filas, 'leadId'))
      : Promise.resolve({ ok: true as const, data: new Map<string, string>() }),
    leerTitulosDeVehiculos(idsDe(filas, 'vehiculoId')),
    leerAutoresDeCotizaciones(idsDe(filas, 'creadoPor')),
  ])
  return { clientes: datosO(clientes), vehiculos: datosO(vehiculos), autores: datosO(autores) }
}

// La cotización de `?cotizacion=` cuando no está en la página (recargar, un enlace compartido, «Siguiente» con el resumen abierto): la lee el servidor, con la RLS de quien mira y su
// «Vencida» de la función del listado (`leerUnaDelListado`), y sus nombres aparte (sólo ella: una página de 100 con 100 clientes distintos ya llena el tope de ids de cada lectura).
// Si esa lectura falla, el listado no cae: `error`, y el resumen ofrece «Reintentar».
async function leerLaDelResumen(permisos: Permisos, id: string): Promise<LecturaDelServidor> {
  try {
    const fila = datosO(await leerUnaDelListado(id))
    if (fila === null) {
      return { id, estado: 'no_disponible' }
    }
    const [cotizacion] = filasConNombres([fila], await nombresDe(permisos, [fila]))
    return cotizacion === undefined ? { id, estado: 'error' } : { id, estado: 'listo', cotizacion }
  } catch {
    return { id, estado: 'error' }
  }
}

async function Listado({
  searchParams,
}: {
  searchParams: PageProps<'/cotizaciones'>['searchParams']
}) {
  await connection()
  const [sesion, parametros] = await Promise.all([requerirSesion(), searchParams])
  // Los orígenes con `cotizaciones.ver` (también los desactivados: sus cotizaciones siguen ahí).
  const todos = datosO(await getOrigenes(true))
  const visibles = todos.filter((origen) => puede(sesion.permisos, 'cotizaciones.ver', origen.id))
  if (visibles.length === 0) {
    return (
      <EstadoSinPermiso descripcion="No tienes permiso para ver cotizaciones en ningún origen. Pídeselo a quien administra los roles." />
    )
  }
  const esquema = esquemaDelListado(visibles)
  const tamano = tamanoDePagina({
    pedido: leerPorPagina(unParametro(parametros[CLAVE_DE_POR_PAGINA])),
    preferencia: sesion.preferencias.porPagina,
    maximo: MAXIMO_DE_PAGINA_DE_COTIZACIONES,
  })
  const pedido = pedidoDelListado(leerFiltros(esquema, parametros), {
    cursor: leerCursor(unParametro(parametros[CLAVE_DE_CURSOR])),
    tamano,
    vehiculo: unParametro(parametros[CLAVE_DE_VEHICULO]),
  })
  const pagina = datosO(await leerListadoDeCotizaciones(pedido))
  // La del resumen, si la URL trae una que no está en la página; los nombres de la página, en paralelo.
  const idDelResumenUrl = idDelResumen(unParametro(parametros[CLAVE_DE_RESUMEN_DE_COTIZACION]))
  const faltaLaDelResumen =
    idDelResumenUrl !== null && !pagina.filas.some((fila) => fila.id === idDelResumenUrl)
  const [nombres, delServidor] = await Promise.all([
    nombresDe(sesion.permisos, pagina.filas),
    faltaLaDelResumen ? leerLaDelResumen(sesion.permisos, idDelResumenUrl) : null,
  ])
  const filas = filasConNombres(pagina.filas, nombres)
  // Con `?vehiculo=`, de quién son estas cotizaciones: el título sólo si quien mira ve el vehículo (la lectura es nula si no existe o no se ve).
  const deUnVehiculo =
    pedido.vehiculoId === undefined
      ? undefined
      : { titulo: datosO(await leerVehiculo(pedido.vehiculoId))?.titulo ?? null }
  const origenDeNueva = origenParaNueva(sesion.permisos, visibles, pedido.origenId)

  return (
    <ListadoDeCotizaciones
      esquema={esquema}
      pagina={{ ...pagina, filas }}
      delServidor={delServidor}
      porPagina={{ valor: tamano, opciones: tamanosHasta(MAXIMO_DE_PAGINA_DE_COTIZACIONES) }}
      origenes={visibles.map((origen) => ({ id: origen.id, nombre: origen.nombre }))}
      {...(deUnVehiculo === undefined ? {} : { vehiculo: deUnVehiculo })}
      rutaDeNueva={
        origenDeNueva === null ? null : rutaDeLaHoja({ origen: origenDeNueva, lead: null })
      }
    />
  )
}
