'use client'

import { useRef } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Bloque } from '@/shared/ui/bloque'
import { Button } from '@/shared/ui/button'
import {
  MOTIVO_SIN_PERMISO_DE_TRANSPORTE,
  TEXTO_SIN_TRANSPORTE,
  type ErroresDeTransporte,
} from '../../../entities/transporte/transporte'
import type { TransporteDeLaUnidad } from '../../../areas/transporte/composicion.client'
import { useFormularioDeTransporte } from '../hooks/use-formulario-de-transporte'
import { CamposDeContenedor, CamposDeFechasYNotas } from './campos-de-carga-y-fechas'
import { CamposDeRuta } from './campos-de-ruta'
import { opcionesDelFormulario } from './opciones-del-formulario'

type Props = {
  unidadId: string
  datos: TransporteDeLaUnidad
  puedeEditar: boolean
  puedeCargarNavieras: boolean
  // Vuelve a leer lo de la unidad (la versión nueva tras un conflicto).
  releer: () => void
}

const hayError = (errores: ErroresDeTransporte, campos: readonly (keyof ErroresDeTransporte)[]) =>
  campos.some((c) => errores[c] !== undefined)

type PropsDelPie = {
  conflicto: string | null
  error: string | null
  puedeEditar: boolean
  puedeGuardar: boolean
  releer: () => void
}

// El conflicto («Recargar»), el rechazo sin campo y «Guardar»; sin permiso, el motivo en vez del botón (D12).
function PieDelFormulario({ conflicto, error, puedeEditar, puedeGuardar, releer }: PropsDelPie) {
  return (
    <>
      {conflicto ? (
        <AvisoDeConflicto
          mensaje={conflicto}
          alRecargar={releer}
          detalle="No se guardó nada. Recargar trae la versión nueva y conserva lo que escribiste."
        />
      ) : null}
      {error ? (
        <Aviso tono="peligro">
          <p>{error}</p>
        </Aviso>
      ) : null}
      {puedeEditar ? (
        <div>
          <Button type="submit" className="min-h-11 md:min-h-9" disabled={!puedeGuardar}>
            Guardar
          </Button>
        </div>
      ) : (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {MOTIVO_SIN_PERMISO_DE_TRANSPORTE}
        </p>
      )}
    </>
  )
}

// El formulario del hueco «Transporte» (6.08-2): tres bloques abiertos (Ruta, Contenedor y booking, Fechas y notas), el aviso de conflicto con «Recargar» y «Guardar». Sin permiso de editar,
// los mismos campos apagados y el motivo, sin «Guardar» (D12).
export function FormularioDeTransporte({
  unidadId,
  datos,
  puedeEditar,
  puedeCargarNavieras,
  releer,
}: Props) {
  const formulario = useRef<HTMLFormElement>(null)
  const f = useFormularioDeTransporte({ unidadId, transporte: datos.transporte, formulario })
  const opciones = opcionesDelFormulario(datos, datos.transporte)
  const apagado = f.enCurso || !puedeEditar
  const campos = {
    prefijo: `transporte-${unidadId}`,
    valores: f.valores,
    errores: f.errores,
    escribir: f.escribir,
    apagado,
  }
  // Lo que se ofrece como nuevo: si no hay ninguna naviera activa para elegir, el selector lo dice.
  const hayNavieras = datos.navieras.some((n) => n.activo)
  return (
    <form
      ref={formulario}
      onSubmit={f.guardar}
      noValidate
      className="grid gap-3"
      data-hueco="transporte"
      data-estado={datos.transporte ? 'listo' : 'vacio'}
    >
      {datos.transporte ? null : (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{TEXTO_SIN_TRANSPORTE}</p>
      )}
      <Bloque
        titulo="Ruta"
        forzarAbierto={hayError(f.errores, ['naviera', 'puertoOrigen', 'puertoDestino'])}
      >
        <CamposDeRuta
          {...campos}
          navieras={opciones.navieras}
          puertosOrigen={opciones.puertosOrigen}
          puertosDestino={opciones.puertosDestino}
          puedeCargarNavieras={puedeCargarNavieras}
          hayNavieras={hayNavieras}
        />
      </Bloque>
      <Bloque
        titulo="Contenedor y booking"
        forzarAbierto={hayError(f.errores, ['contenedor', 'booking'])}
      >
        <CamposDeContenedor {...campos} />
      </Bloque>
      <Bloque
        titulo="Fechas y notas"
        forzarAbierto={hayError(f.errores, ['zarpe', 'eta', 'arribo', 'notas'])}
      >
        <CamposDeFechasYNotas {...campos} />
      </Bloque>
      <PieDelFormulario
        conflicto={f.conflicto}
        error={f.error}
        puedeEditar={puedeEditar}
        puedeGuardar={f.hayCambios && !f.enCurso}
        releer={releer}
      />
    </form>
  )
}
