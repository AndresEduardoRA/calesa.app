'use client'

import { PlusIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'
import type { RolLeido } from '../../../entities/lectura-de-fase'
import { nombreDelDestino } from '../../../entities/transiciones/vista-de-salidas'
import { useEliminarSalidaPorUrl } from '../hooks/use-eliminar-salida-por-url'
import { useSalidasDeLaFase } from '../hooks/use-salidas-de-la-fase'
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
// cada una y «Agregar salida». Quitar una pide confirmar en la URL (`?eliminar=salida&salida=<id>`). Una escritura a la vez; la lista la trae la página
// releída. Quien llega aquí configura el flujo; la base lo vuelve a exigir en cada escritura.
export function BloqueDeSalidas({ flujo, fase, roles }: Props) {
  const s = useSalidasDeLaFase(flujo, fase)
  const quitar = useEliminarSalidaPorUrl(s.salidas)
  const quitarVisto = useAbiertoAlgunaVez(quitar.abierto)
  const [agregando, setAgregando] = useState(false)
  const botonDeAgregar = useRef<HTMLButtonElement>(null)
  const prefijo = `salida-${fase.id}`
  const destinoDeLaQuitada = quitar.salida ? nombreDelDestino(flujo, quitar.salida) : null

  function cerrarFormulario() {
    setAgregando(false)
    requestAnimationFrame(() => botonDeAgregar.current?.focus())
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      {flujo.truncado.transiciones || flujo.truncado.roles ? (
        <AvisoDeTope texto="Se muestran las primeras 500 salidas y roles del flujo: puede que falten algunas." />
      ) : null}
      <QuienMueveALaFase flujo={flujo} fase={fase} roles={roles} />
      <EntradasDeLaFase flujo={flujo} fase={fase} />
      <ListaDeSalidas
        flujo={flujo}
        salidas={s}
        roles={roles}
        prefijo={prefijo}
        esFinal={fase.esFinal}
        alPedirQuitar={quitar.abrir}
      />
      {agregando ? (
        <FormularioDeNuevaSalidaDiferido salidas={s} alCerrar={cerrarFormulario} />
      ) : (
        <div className="grid justify-items-start gap-1.5">
          <Button
            ref={botonDeAgregar}
            variant="outline"
            className={BOTON}
            disabled={s.motivoSinDestinos !== null}
            aria-describedby={s.motivoSinDestinos === null ? undefined : `${prefijo}-sin-destinos`}
            onClick={() => {
              setAgregando(true)
            }}
          >
            <PlusIcon aria-hidden />
            Agregar salida
          </Button>
          {s.motivoSinDestinos === null ? null : (
            <p
              id={`${prefijo}-sin-destinos`}
              className="text-(length:--text-xs) text-(--color-ink-soft)"
            >
              {s.motivoSinDestinos}
            </p>
          )}
        </div>
      )}
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
