'use client'

import type { Route } from 'next'
import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { Badge } from '@/shared/ui/badge'
import { Button, buttonVariants } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { NumeroDeLead } from '@/shared/ui/numero-de-lead'
import { PieConSalida } from '@/shared/ui/pie-con-salida'
import { Skeleton } from '@/shared/ui/skeleton'
import type { Referencia } from '../../../entities/menciones'
import type { DatosDeReferencia, EstadoDeReferencia } from '../../../entities/referencias'
import type { ContextoDeMenciones } from '../contexto-de-menciones'
import { textoSinAcceso } from './chip-de-mencion'

type Props = {
  abierta: Referencia | null
  menciones: ContextoDeMenciones
  alCerrar: () => void
}

// A dónde lleva «Abrir en…»: la pantalla de cada módulo, donde se aplican sus permisos (aquí no se decide nada).
const SALIDA: Record<
  'lead' | 'vehiculo' | 'cotizacion',
  { ruta: string; clave: string; texto: string }
> = {
  lead: { ruta: RUTAS.leads, clave: 'lead', texto: 'Abrir en Leads' },
  vehiculo: { ruta: RUTAS.vehiculos, clave: 'vehiculo', texto: 'Abrir en Vehículos' },
  cotizacion: { ruta: '/cotizaciones', clave: 'cotizacion', texto: 'Abrir en Cotizaciones' },
}

function tituloDe(datos: DatosDeReferencia): string {
  switch (datos.clase) {
    case 'lead':
      return datos.nombre ?? 'Lead'
    case 'vehiculo':
      return datos.titulo
    case 'cotizacion':
      return datos.titulo ?? `Cotización ${String(datos.numero)}`
    case 'usuario':
      return datos.nombre ?? 'Persona'
  }
}

function Dato({ nombre, children }: { nombre: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5">
      <dt className="text-(length:--text-xs) text-(--color-ink-soft)">{nombre}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  )
}

// Sólo lo que el hilo ya leyó bajo la sesión de quien mira: nunca teléfono, campos privados ni montos.
function DatosDeLaMencion({ datos }: { datos: DatosDeReferencia }) {
  switch (datos.clase) {
    case 'lead':
      return (
        <dl className="grid gap-3">
          <Dato nombre="Nombre">{datos.nombre ?? '—'}</Dato>
          {datos.numeroVisible !== null ? (
            <Dato nombre="Número">
              <NumeroDeLead
                numeros={{
                  numero: datos.numeroVisible,
                  numeroPropio: null,
                  creadorDelPropio: null,
                }}
              />
            </Dato>
          ) : null}
        </dl>
      )
    case 'vehiculo':
      return (
        <dl className="grid gap-3">
          <Dato nombre="Vehículo">{datos.titulo}</Dato>
          <Dato nombre="VIN">{datos.vin ?? '—'}</Dato>
          <Dato nombre="Lote">{datos.lote ?? '—'}</Dato>
        </dl>
      )
    case 'cotizacion':
      return (
        <dl className="grid gap-3">
          <Dato nombre="Cotización">
            {String(datos.numero)}
            {datos.titulo ? ` · ${datos.titulo}` : ''}
          </Dato>
          <Dato nombre="Clase">{datos.claseDeCotizacion}</Dato>
          <Dato nombre="Estado">
            <Badge variant="secondary">{datos.estadoDeCotizacion}</Badge>
          </Dato>
        </dl>
      )
    case 'usuario':
      return null
  }
}

type Vista = { titulo: string; cuerpo: React.ReactNode; salida: string | null; textoSalida: string }

function vistaDe(
  abierta: Referencia,
  estado: EstadoDeReferencia | 'error' | null,
  reintentar: () => void,
): Vista {
  if (estado === null) {
    return {
      titulo: 'Cargando…',
      cuerpo: (
        <div aria-busy="true" className="grid gap-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
        </div>
      ),
      salida: null,
      textoSalida: '',
    }
  }
  if (estado === 'error') {
    return {
      titulo: 'No se pudo cargar',
      cuerpo: (
        <Button type="button" variant="outline" className="h-11 md:h-9" onClick={reintentar}>
          Reintentar
        </Button>
      ),
      salida: null,
      textoSalida: '',
    }
  }
  if (estado.situacion === 'eliminado') {
    return { titulo: 'Eliminado', cuerpo: null, salida: null, textoSalida: '' }
  }
  if (estado.situacion === 'sin_acceso') {
    return {
      titulo: textoSinAcceso(abierta.clase),
      cuerpo: <p>Pídele a quien lo tiene que te lo comparta.</p>,
      salida: null,
      textoSalida: '',
    }
  }
  const clase = estado.datos.clase
  const salida = clase === 'usuario' ? null : SALIDA[clase]
  return {
    titulo: tituloDe(estado.datos),
    cuerpo: <DatosDeLaMencion datos={estado.datos} />,
    salida: salida ? `${salida.ruta}?${salida.clave}=${encodeURIComponent(estado.id)}` : null,
    textoSalida: salida?.texto ?? '',
  }
}

// La mención abierta (`?mencion=<clase>:<id>`) sin salir del chat: lo que el hilo ya leyó y un enlace a la pantalla del módulo. Si no se ve, ni un dato
// ni un enlace; eliminado, lo dice. Sólo lectura: no hay nada escrito que cuidar al cerrar.
export function DrawerDeMencion({ abierta, menciones, alCerrar }: Props) {
  // Cerrado conserva lo último que mostró hasta que termina de irse.
  const vista = abierta
    ? vistaDe(abierta, menciones.estadoDe(abierta), menciones.reintentar)
    : { titulo: 'Mención', cuerpo: null, salida: null, textoSalida: '' }
  return (
    <Drawer
      abierto={abierta !== null}
      alCerrar={alCerrar}
      titulo={vista.titulo}
      pie={
        <PieConSalida className="flex flex-wrap justify-end gap-2">
          {vista.salida ? (
            <Link
              href={vista.salida as Route}
              className={buttonVariants({ variant: 'outline', className: 'h-11 md:h-9' })}
            >
              {vista.textoSalida}
            </Link>
          ) : null}
          <Button type="button" variant="outline" className="h-11 md:h-9" onClick={alCerrar}>
            Cerrar
          </Button>
        </PieConSalida>
      }
    >
      {vista.cuerpo}
    </Drawer>
  )
}
