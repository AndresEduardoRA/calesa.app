'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { RUTAS } from '@/shared/lib/rutas'
import { Button } from '@/shared/ui/button'
import { Confirmar } from '@/shared/ui/confirmar'
import { Interruptor } from '@/shared/ui/interruptor'
import { motivoParaNoEliminar, type OrigenConUso } from '../../../entities/origen'
import { useOrigenes } from '../hooks/use-origenes'

type Props = { origen: OrigenConUso; puedeGestionar: boolean }

// Desactivar es reversible (se hace y se ofrece «Deshacer»); eliminar no, y sólo vale para un
// origen sin uso: con uso el botón queda apagado y dice qué lo ata.
export function EstadoDelOrigen({ origen, puedeGestionar }: Props) {
  const router = useRouter()
  const ediciones = useOrigenes()
  const [confirmando, setConfirmando] = useState(false)
  const motivo = motivoParaNoEliminar(origen)

  async function eliminar() {
    const resultado = await ediciones.eliminar(origen)
    if (resultado.ok) {
      router.push(RUTAS.origenes as Route)
    } else {
      setConfirmando(false)
    }
  }

  return (
    <section
      aria-labelledby="estado-titulo"
      className="grid gap-4 border-t border-(--color-line) pt-6"
    >
      <h2 id="estado-titulo" className="text-(length:--text-lg) font-medium text-(--color-ink)">
        Estado
      </h2>
      <Interruptor
        titulo="Activo"
        ayuda="Un origen inactivo no aparece al dar de alta vehículos ni cotizaciones. Sus fichas y vehículos se siguen viendo."
        valor={origen.activo}
        alCambiar={(activo) => {
          void ediciones.cambiarActivo(origen, activo)
        }}
        deshabilitado={!puedeGestionar || ediciones.enCurso}
      />
      <div className="grid gap-2">
        <div>
          <Button
            variant="destructive"
            className="h-11 md:h-8"
            disabled={!puedeGestionar || motivo !== null || ediciones.enCurso}
            onClick={() => {
              setConfirmando(true)
            }}
          >
            Eliminar origen
          </Button>
        </div>
        <p className="text-(length:--text-sm) text-(--color-ink-faint)">
          {motivo ??
            'Sin vehículos ni cotizaciones, se elimina junto con su flujo y sus campos. No se puede deshacer.'}
        </p>
      </div>
      <Confirmar
        abierto={confirmando}
        alCerrar={() => {
          setConfirmando(false)
        }}
        alConfirmar={() => void eliminar()}
        titulo={`Eliminar el origen ${origen.nombre}`}
        descripcion={`Se elimina «${origen.nombre}» con sus ${origen.uso.camposActivos} campos activos, ${origen.uso.categorias} categorías y ${origen.uso.concesiones} permisos acotados a él. No se puede deshacer.`}
        etiquetaConfirmar="Eliminar origen"
        enCurso={ediciones.enCurso}
        palabraClave={origen.nombre}
      />
    </section>
  )
}
