'use client'

import { useRef, useState } from 'react'
import type { ConteoAcotado } from '@/shared/lib/conteo'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Button } from '@/shared/ui/button'
import { useBorrador } from '@/shared/ui/use-borrador'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import { origenesAGuardar, type AjustesDelSitio } from '../../../../entities/sitio/ajustes'
import {
  CAMPOS_DE_AJUSTES_DEL_SITIO,
  useGuardarAjustesDelSitio,
} from '../hooks/use-guardar-ajustes-del-sitio'
import { BloqueBuscadores } from './bloque-buscadores'
import { BloqueContacto } from './bloque-contacto'
import { BloqueIdentidad } from './bloque-identidad'
import { BloqueRedes } from './bloque-redes'
import { BloqueVitrina } from './bloque-vitrina'

export type PropsDeAjustesDelSitio = {
  ajustes: AjustesDelSitio
  // Los orígenes activos (los compone la página: `web` no importa `origenes`).
  origenes: readonly { id: string; nombre: string }[]
  // Por origen que hoy se ve: cuántos vehículos publicados dejan de verse al apagarlo (`null`: no se pudo leer).
  conteos: Record<string, ConteoAcotado | null>
}

// Configuración › Sitio web › Ajustes: identidad, contacto, vitrina, redes y buscadores con un «Guardar» y una versión. Quien lo usa
// le pone de `key` la versión de la fila: lo guardado (aquí o por otra persona) lo vuelve a montar desde la base. El borrador guarda
// sólo los campos de texto; las casillas y el interruptor arrancan de lo guardado.
export function FormularioDeAjustesDelSitio({
  ajustes,
  origenes,
  conteos,
}: PropsDeAjustesDelSitio) {
  const formulario = useRef<HTMLFormElement>(null)
  const enLinea = useEnLinea()
  const [moneda, setMoneda] = useState(ajustes.mostrarMonedaSecundaria)
  const [tildados, setTildados] = useState<string[]>(() =>
    origenes.map((origen) => origen.id).filter((id) => ajustes.origenesVisibles.includes(id)),
  )
  const borrador = useBorrador('ajustes-del-sitio', formulario, CAMPOS_DE_AJUSTES_DEL_SITIO)
  const { guardar, recargar, enCurso, conflicto, errores } = useGuardarAjustesDelSitio({
    actualizadoEn: ajustes.actualizadoEn,
    formulario,
    alGuardar: borrador.limpiar,
  })

  return (
    <form
      ref={formulario}
      noValidate
      className="grid gap-4"
      onSubmit={(evento) => {
        evento.preventDefault()
        void guardar({
          mostrarMonedaSecundaria: moneda,
          origenesVisibles: origenesAGuardar(
            ajustes.origenesVisibles,
            origenes.map((origen) => origen.id),
            tildados,
          ),
        })
      }}
    >
      <h2 className="text-(length:--text-lg) font-semibold text-(--color-ink)">Ajustes</h2>
      {enLinea ? null : (
        <Aviso tono="aviso">
          No hay conexión. Puedes seguir escribiendo: guarda cuando vuelva.
        </Aviso>
      )}
      {conflicto ? <AvisoDeConflicto mensaje={conflicto} alRecargar={recargar} /> : null}
      {/* Un <fieldset> deshabilitado apaga los campos de adentro, también para el teclado. */}
      <fieldset disabled={enCurso} className="grid min-w-0 gap-4">
        <legend className="sr-only">Ajustes del sitio</legend>
        <BloqueIdentidad ajustes={ajustes} errores={errores} />
        <BloqueContacto ajustes={ajustes} errores={errores} />
        <BloqueVitrina
          origenes={origenes}
          guardados={ajustes.origenesVisibles}
          tildados={tildados}
          alTildar={(id, tildado) => {
            setTildados((antes) =>
              tildado
                ? [...antes.filter((otro) => otro !== id), id]
                : antes.filter((otro) => otro !== id),
            )
          }}
          conteos={conteos}
          mostrarMonedaSecundaria={moneda}
          alCambiarMoneda={setMoneda}
          deshabilitado={enCurso}
          errores={errores}
        />
        <BloqueRedes ajustes={ajustes} errores={errores} />
        <BloqueBuscadores ajustes={ajustes} errores={errores} />
      </fieldset>
      <div>
        <Button type="submit" className="h-11 md:h-9" disabled={enCurso}>
          {enCurso ? 'Guardando…' : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}
