'use client'

import { useEffect, useState } from 'react'
import type { Permisos } from '@/shared/lib/permisos'
import type { OpcionesDeImportar } from '../../../entities/opciones-de-importar'
import type { EntidadImportable } from '../../../entities/plantillas'
import type { ContextoDeLaSeccion } from '../contexto-de-la-seccion'
import { AsistenteTotal } from './asistente-total'
import { DESTINO_YO, PasoEntidad } from './paso-entidad'

type Props = {
  yo: string
  permisos: Permisos
  opciones: OpcionesDeImportar
  entidad: EntidadImportable
  origenId: string | null
  // Lo que el servidor leyó para la entidad elegida; nulo en vehículos sin origen.
  seccion: ContextoDeLaSeccion | null
}

type Estado =
  | { tipo: 'falta'; texto: string }
  | { tipo: 'asistente'; seccion: ContextoDeLaSeccion; asignarA: string | null }
  | { tipo: 'esperando' }

// Qué se dibuja debajo de «Qué importas»: lo que falta elegir, el asistente o nada (el servidor todavía no trajo la entidad nueva).
function estadoDe(
  { opciones, entidad, origenId, seccion }: Omit<Props, 'yo' | 'permisos'>,
  destino: string,
): Estado {
  if (entidad === 'vehiculos' && origenId === null) {
    return { tipo: 'falta', texto: 'Elige el origen de los vehículos.' }
  }
  if (entidad === 'leads' && destino === '') {
    return opciones.leads?.otros
      ? { tipo: 'falta', texto: 'Elige a quién van los leads.' }
      : { tipo: 'esperando' }
  }
  if (seccion?.entidad !== entidad) {
    return { tipo: 'esperando' }
  }
  return {
    tipo: 'asistente',
    seccion,
    asignarA: entidad === 'leads' && destino !== DESTINO_YO ? destino : null,
  }
}

function Indicacion({ children }: { children: string }) {
  return <p className="text-(length:--text-sm) text-(--color-ink-faint)">{children}</p>
}

// La sección «Importar» de `/datos` (9.06-4b): arriba qué importas (y a quién, o en qué origen) y debajo el asistente. El archivo de la
// persona no se guarda en la URL, en el almacenamiento del navegador ni en ningún registro: se olvida al salir (el efecto cambia la corrida).
export function SeccionImportar({ yo, permisos, opciones, entidad, origenId, seccion }: Props) {
  const [destino, setDestino] = useState(opciones.leads?.yo ? DESTINO_YO : '')
  const [corrida, setCorrida] = useState(0)
  useEffect(
    () => () => {
      setCorrida((valor) => valor + 1)
    },
    [],
  )
  const estado = estadoDe({ opciones, entidad, origenId, seccion }, destino)
  return (
    <div className="grid gap-5">
      <PasoEntidad
        opciones={opciones}
        entidad={entidad}
        origenId={origenId}
        personas={seccion?.entidad === 'leads' ? seccion.personas : []}
        hayMasPersonas={seccion?.entidad === 'leads' && seccion.hayMasPersonas}
        destino={destino}
        alElegirDestino={setDestino}
      />
      {estado.tipo === 'falta' ? <Indicacion>{estado.texto}</Indicacion> : null}
      {estado.tipo === 'asistente' ? (
        <AsistenteTotal
          key={`${entidad}:${origenId ?? ''}:${destino}:${String(corrida)}`}
          yo={yo}
          permisos={permisos}
          seccion={estado.seccion}
          asignarA={estado.asignarA}
          alImportarOtro={() => {
            setCorrida((valor) => valor + 1)
          }}
        />
      ) : null}
    </div>
  )
}
