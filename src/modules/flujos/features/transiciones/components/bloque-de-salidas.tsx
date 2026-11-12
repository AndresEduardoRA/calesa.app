'use client'

import { PlusIcon } from 'lucide-react'
import { useRef, useState, type RefObject } from 'react'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'
import type { RolLeido } from '../../../entities/lectura-de-fase'
import { nombreDelDestino } from '../../../entities/transiciones/vista-de-salidas'
import { useEliminarSalidaPorUrl } from '../hooks/use-eliminar-salida-por-url'
import { useSalidasDeLaFase, type SalidasDeLaFase } from '../hooks/use-salidas-de-la-fase'
import { EliminarSalidaDiferido, FormularioDeNuevaSalidaDiferido } from './diferidos'
import { EntradasDeLaFase } from './entradas-de-la-fase'
import { ListaDeSalidas } from './lista-de-salidas'
import { QuienMueveALaFase } from './quien-mueve-a-la-fase'

type Props = {
  flujo: FlujoParaConfigurar
  fase: FaseParaConfigurar
  roles: readonly RolLeido[]
}

const BOTON = 'h-11 md:h-8'

// El hueco `bloques.salidas` del inspector (5.06): quién puede mover a la fase, de dónde se llega a ella (sólo lectura), sus salidas con quién puede mover por
// cada una, «Editar» en su fila y «Agregar salida». Quitar una pide confirmar en la URL (`?eliminar=salida&salida=<id>`). Una escritura a la vez; la lista la trae la página
// releída. Quien llega aquí configura el flujo; la base lo vuelve a exigir en cada escritura.
export function BloqueDeSalidas({ flujo, fase, roles }: Props) {
  const s = useSalidasDeLaFase(flujo, fase)
  const quitar = useEliminarSalidaPorUrl(s.salidas)
  const quitarVisto = useAbiertoAlgunaVez(quitar.abierto)
  const [agregando, setAgregando] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)
  // Una forma a la vez: mientras se edita una salida no se agrega otra, y al revés. Una salida que ya no está no deja la forma abierta.
  const editandoId = s.salidas.some((x) => x.id === editando) ? editando : null
  const botonDeAgregar = useRef<HTMLButtonElement>(null)
  const prefijo = `salida-${fase.id}`
  const destinoDeLaQuitada = quitar.salida ? nombreDelDestino(flujo, quitar.salida) : null

  function cerrarFormulario() {
    setAgregando(false)
    requestAnimationFrame(() => botonDeAgregar.current?.focus())
  }

  function cerrarEdicion(id: string) {
    setEditando(null)
    requestAnimationFrame(() =>
      document.querySelector<HTMLElement>(`[data-editar-salida="${prefijo}-${id}"]`)?.focus(),
    )
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {flujo.truncado.transiciones || flujo.truncado.roles ? (
        <AvisoDeTope texto="Se muestran las primeras 500 salidas y roles del flujo: puede que falten algunas." />
      ) : null}
      <QuienMueveALaFase flujo={flujo} fase={fase} roles={roles} salidas={s} />
      <EntradasDeLaFase flujo={flujo} fase={fase} />
      <ListaDeSalidas
        flujo={flujo}
        salidas={s}
        roles={roles}
        prefijo={prefijo}
        esFinal={fase.esFinal}
        editandoId={editandoId}
        otraFormaAbierta={agregando}
        alPedirEditar={setEditando}
        alCerrarEdicion={cerrarEdicion}
        alPedirQuitar={quitar.abrir}
      />
      <AgregarSalida
        salidas={s}
        agregando={agregando}
        bloqueado={editandoId !== null}
        prefijo={prefijo}
        alAbrir={() => {
          setAgregando(true)
        }}
        alCerrar={cerrarFormulario}
        boton={botonDeAgregar}
      />
      {quitarVisto ? (
        <EliminarSalidaDiferido
          abierto={quitar.abierto}
          alCerrar={quitar.cerrar}
          accion={quitar.salida ? (quitar.salida.accion ?? 'Mover') : null}
          destino={destinoDeLaQuitada}
          enCurso={s.enCurso}
          alQuitar={() => (quitar.salida ? s.quitar(quitar.salida) : Promise.resolve(false))}
          focoAlCerrar={() =>
            document.querySelector<HTMLElement>(
              `[data-quitar-salida="${prefijo}-${quitar.salida?.id ?? ''}"]`,
            ) ?? true
          }
        />
      ) : null}
    </div>
  )
}

type PropsDeAgregar = {
  salidas: SalidasDeLaFase
  agregando: boolean
  // Mientras se edita otra salida, «Agregar salida» espera.
  bloqueado: boolean
  prefijo: string
  alAbrir: () => void
  alCerrar: () => void
  boton: RefObject<HTMLButtonElement | null>
}

// «Agregar salida»: el botón (apagado, con su motivo, si no hay a dónde salir) o el formulario en línea.
function AgregarSalida({
  salidas,
  agregando,
  bloqueado,
  prefijo,
  alAbrir,
  alCerrar,
  boton,
}: PropsDeAgregar) {
  if (agregando) {
    return <FormularioDeNuevaSalidaDiferido salidas={salidas} alCerrar={alCerrar} />
  }
  const motivo = salidas.motivoSinDestinos
  return (
    <div className="grid justify-items-start gap-1.5">
      <Button
        ref={boton}
        variant="outline"
        className={BOTON}
        disabled={motivo !== null || bloqueado}
        aria-describedby={motivo === null ? undefined : `${prefijo}-sin-destinos`}
        onClick={alAbrir}
      >
        <PlusIcon aria-hidden />
        Agregar salida
      </Button>
      {motivo === null ? null : (
        <p
          id={`${prefijo}-sin-destinos`}
          className="text-(length:--text-xs) text-(--color-ink-soft)"
        >
          {motivo}
        </p>
      )}
    </div>
  )
}
