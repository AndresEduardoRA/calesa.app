'use client'

import type { OpcionesDeGasto } from '../../../areas/dinero/composicion.client'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { EstadoVacio } from '@/shared/ui/estados'
import { Skeleton } from '@/shared/ui/skeleton'
import { MAXIMO_DE_UNIDADES_POR_REPARTO } from '../../../entities/dinero/reparto'
import type { GrupoDeLogistica } from '../../../entities/nucleo/grupo'
import { useOpcionesDeGasto } from '../hooks/use-opciones-de-gasto'
import { useProrrateo } from '../hooks/use-prorrateo'
import { useUnidadesDelGrupo } from '../hooks/use-unidades-del-grupo'
import { CamposDeProrrateo } from './campos-de-prorrateo'
import { ConfirmarProrrateo } from './confirmar-prorrateo'
import { VistaDelReparto } from './vista-del-reparto'

function Cargando() {
  return (
    <div aria-busy="true" aria-label="Cargando las unidades del grupo" className="grid gap-2">
      <Skeleton className="h-9" />
      <Skeleton className="h-9" />
      <Skeleton className="h-9" />
    </div>
  )
}

function ConError({ mensaje, reintentar }: { mensaje: string; reintentar: () => void }) {
  return (
    <div className="grid gap-2">
      <Aviso tono="peligro">
        <p>{mensaje}</p>
      </Aviso>
      <div>
        <Button variant="outline" onClick={reintentar}>
          Reintentar
        </Button>
      </div>
    </div>
  )
}

type Unidades = { id: string; titulo: string }[]

function Formulario({ unidades, opciones }: { unidades: Unidades; opciones: OpcionesDeGasto }) {
  const f = useProrrateo({ unidades, opciones })
  const hayMonto = f.valores.monto.trim() !== ''
  return (
    <>
      <form
        noValidate
        className="grid gap-3"
        onSubmit={(evento) => {
          evento.preventDefault()
          f.pedirConfirmacion()
        }}
      >
        {f.aviso ? (
          <Aviso tono="peligro">
            <p>{f.aviso}</p>
          </Aviso>
        ) : null}
        <CamposDeProrrateo opciones={opciones} formulario={f} />
        <VistaDelReparto
          vista={f.vista}
          moneda={f.monedaDelGasto}
          hayMonto={hayMonto && f.vista.filas.length > 0}
        />
        <div>
          <Button type="submit" disabled={f.enCurso || !f.enLinea}>
            Repartir entre las unidades
          </Button>
        </div>
      </form>
      <ConfirmarProrrateo
        abierto={f.confirmando}
        monto={f.vista.suma}
        moneda={f.monedaDelGasto}
        unidades={unidades.length}
        confirmar={f.confirmar}
        alCerrar={f.cerrarConfirmacion}
      />
    </>
  )
}

// El hueco del resumen de un grupo (6.11-4): «Prorratear un gasto entre las N unidades», con la vista de cuánto le toca a cada una antes de confirmar. Lee las unidades del grupo con la sesión de quien mira; la
// base pide `logistica.gastos.editar` por cada unidad y escribe todo o nada. Sin la clave el hueco no se dibuja (lo decide quien monta el resumen: `permisos` y `regla` de `pantallas/dinero-grupo.ts`).
export function HuecoDeProrrateo({ grupo }: { grupo: GrupoDeLogistica }) {
  const unidades = useUnidadesDelGrupo(grupo)
  const lectura = useOpcionesDeGasto(true, 0)
  if (unidades.tipo === 'cargando' || (unidades.tipo === 'listo' && lectura.tipo === 'cargando')) {
    return <Cargando />
  }
  if (unidades.tipo === 'error') {
    return <ConError mensaje={unidades.error.mensaje} reintentar={unidades.reintentar} />
  }
  if (lectura.tipo === 'error') {
    return <ConError mensaje={lectura.error.mensaje} reintentar={lectura.reintentar} />
  }
  if (lectura.tipo !== 'listo') {
    return <Cargando />
  }
  if (unidades.dato.hayMas) {
    return (
      <Aviso tono="peligro">
        <p>{`Un reparto admite hasta ${String(MAXIMO_DE_UNIDADES_POR_REPARTO)} unidades. Este grupo tiene más.`}</p>
      </Aviso>
    )
  }
  if (unidades.dato.unidades.length === 0) {
    return <EstadoVacio compacto titulo="Este grupo no tiene unidades. No hay nada que repartir." />
  }
  return <Formulario unidades={unidades.dato.unidades} opciones={lectura.opciones} />
}
