'use client'

import type { ErrorApp } from '@/shared/lib/errores'
import { textoDelTope } from '@/shared/lib/conteo'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { Button } from '@/shared/ui/button'
import type { Mensaje } from '../../../entities/mensajes'
import { Burbuja } from './burbuja'
import { DesdeUnaFechaDiferido, IrAUnaFechaDiferido } from './diferidos'

type Props = {
  mensajes: readonly Mensaje[]
  usuarioId: string
  mostrarAutor: boolean
  zona: string
  hayAnteriores: boolean
  enElTope: boolean
  cargandoAnteriores: boolean
  errorAlCargarAnteriores: ErrorApp | null
  desde: string | null
  verAnteriores: () => void
  irAUnaFecha: (dia: string) => void
  volverALoReciente: () => void
  alReintentar: (id: string) => void
}

// Los mensajes, lo nuevo abajo. Arriba: «Ver anteriores» (o su error con «Reintentar»); al llegar al tope lo dice y ofrece «Ir a una fecha», el camino
// a lo antiguo. Mirando desde una fecha, arriba se dice desde cuándo y se vuelve a lo más reciente.
export function ListaDelHilo({
  mensajes,
  usuarioId,
  mostrarAutor,
  zona,
  hayAnteriores,
  enElTope,
  cargandoAnteriores,
  errorAlCargarAnteriores,
  desde,
  verAnteriores,
  irAUnaFecha,
  volverALoReciente,
  alReintentar,
}: Props) {
  return (
    <div className="grid gap-3">
      {desde ? (
        <DesdeUnaFechaDiferido
          dia={desde}
          zona={zona}
          ocupado={cargandoAnteriores}
          volver="Volver a los más recientes"
          alVolver={volverALoReciente}
        />
      ) : null}
      {hayAnteriores ? (
        <div className="grid justify-items-start gap-2">
          {errorAlCargarAnteriores ? (
            <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
              {errorAlCargarAnteriores.mensaje}
            </p>
          ) : null}
          {enElTope ? (
            <>
              <AvisoDeTope
                texto={textoDelTope(TOPE_DE_LO_CARGADO, {
                  sustantivo: 'mensajes',
                  articulo: 'los',
                })}
              />
              <IrAUnaFechaDiferido zona={zona} ocupado={cargandoAnteriores} alIr={irAUnaFecha} />
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="min-h-11 md:min-h-9"
              disabled={cargandoAnteriores}
              onClick={verAnteriores}
            >
              {cargandoAnteriores
                ? 'Cargando…'
                : errorAlCargarAnteriores
                  ? 'Reintentar'
                  : 'Ver anteriores'}
            </Button>
          )}
        </div>
      ) : null}
      <ol role="log" aria-label="Mensajes" className="grid min-w-0 gap-2">
        {mensajes.map((mensaje) => (
          <Burbuja
            key={mensaje.id}
            mensaje={mensaje}
            propio={mensaje.autorId === usuarioId}
            mostrarAutor={mostrarAutor}
            zona={zona}
            alReintentar={alReintentar}
          />
        ))}
      </ol>
    </div>
  )
}
