'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/shared/ui/button'
import { Drawer } from '@/shared/ui/drawer'
import { EstadoVacio } from '@/shared/ui/estados'
import { Skeleton } from '@/shared/ui/skeleton'
import { useApertura } from '@/shared/ui/use-apertura'
import { useLecturaAlMontar } from '@/shared/ui/use-lectura-al-montar'
import { formatoDeCelda, monedaDeFormato, type ContextoDeHoja } from '../../../entities/binding'
import type { CeldaDeHoja, SeccionDeHoja } from '../../../entities/hoja'
import { celdaConAyuda, tablaDeAyuda } from '../../../entities/presentacion-de-la-hoja'
import { pideRecargar } from '../../../entities/recalculo'
import { leerTablaDeAyuda } from '../../../composicion.client'
import type { AyudaAbierta, DeDondeLeer } from '../hooks/use-ayuda-de-la-hoja'
import { botonDeAyuda } from './boton-de-ayuda'
import { TablaDeLaAyuda } from './tabla-de-la-ayuda'

type Props = {
  // Las secciones donde se busca la celda que nombra la URL (como la ayuda de texto: la de «Avanzado» se abre dentro del modal).
  secciones: readonly SeccionDeHoja[]
  contexto: ContextoDeHoja
  ayuda: AyudaAbierta
  lectura: DeDondeLeer
}

type PropsDelPanel = {
  celda: CeldaDeHoja
  abierto: boolean
  alCerrar: () => void
  lectura: DeDondeLeer
}

function Leyendo() {
  return (
    <div aria-busy="true" aria-label="Cargando la tabla" className="grid gap-2">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-6 w-full" />
      ))}
    </div>
  )
}

// El fallo sigue al del recálculo: «Recargar» si lo que falló no se arregla volviendo a pedir (la fórmula cambió, la sesión venció o ya no hay permiso), si no «Reintentar».
function Fallo({ recargar, alReintentar }: { recargar: boolean; alReintentar: () => void }) {
  const router = useRouter()
  return (
    <div role="alert" className="grid gap-3">
      <p className="text-(length:--text-sm) font-medium text-(--color-peligro-ink)">
        No se pudo leer la tabla.
      </p>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-fit md:min-h-8"
        onClick={recargar ? router.refresh : alReintentar}
      >
        {recargar ? 'Recargar' : 'Reintentar'}
      </Button>
    </div>
  )
}

// Lee la tabla al montarse, con la hoja abierta de esta hoja (nunca la publicada de hoy). Se monta de nuevo en cada apertura (`key`): cada una lee otra vez.
function PanelDeLaTabla({ celda, abierto, alCerrar, lectura }: PropsDelPanel) {
  const tabla = tablaDeAyuda(celda) ?? ''
  const leer = useLecturaAlMontar(() => leerTablaDeAyuda({ tabla, ...lectura }), tabla)
  const { estado } = leer.lectura
  const dinero =
    formatoDeCelda(celda.formato) === 'monto' ? { moneda: monedaDeFormato(celda.formato) } : null
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={`Ayuda de ${celda.etiqueta}`}
      descripcion={leer.lectura.estado === 'leido' ? leer.lectura.dato.nombre : undefined}
      ancho="amplio"
      focoAlCerrar={() => botonDeAyuda(celda)}
    >
      {estado === 'leyendo' ? <Leyendo /> : null}
      {leer.lectura.estado === 'fallo' ? (
        <Fallo recargar={pideRecargar(leer.lectura.error)} alReintentar={leer.reintentar} />
      ) : null}
      {leer.lectura.estado === 'leido' && leer.lectura.dato.filas.length === 0 ? (
        <EstadoVacio compacto titulo="Esta tabla no tiene filas." />
      ) : null}
      {leer.lectura.estado === 'leido' && leer.lectura.dato.filas.length > 0 ? (
        <TablaDeLaAyuda tabla={leer.lectura.dato} dinero={dinero} />
      ) : null}
    </Drawer>
  )
}

// La ayuda de una tabla de una celda (paso 4.13-4c2): un panel de sólo lectura con la tabla de referencia de la hoja abierta, con su URL. Si la URL nombra una celda que estas
// secciones no dibujan o cuya ayuda no es de una tabla, no abre nada. Al cerrar, el foco vuelve al botón de ayuda de su celda, también si se abrió por la URL.
export function AyudaDeTabla({ secciones, contexto, ayuda, lectura }: Props) {
  const celda = celdaConAyuda(secciones, ayuda.nodo, 'tabla', contexto)
  // La celda se recuerda mientras el panel se va: sin ella se vaciaría a media animación.
  const [ultima, setUltima] = useState<CeldaDeHoja | null>(null)
  if (celda !== null && celda !== ultima) {
    setUltima(celda)
  }
  const apertura = useApertura(celda !== null)
  const mostrada = celda ?? ultima
  if (mostrada === null) {
    return null
  }
  return (
    <PanelDeLaTabla
      key={`${String(apertura)}:${mostrada.nodo}`}
      celda={mostrada}
      abierto={celda !== null}
      alCerrar={ayuda.cerrar}
      lectura={lectura}
    />
  )
}
