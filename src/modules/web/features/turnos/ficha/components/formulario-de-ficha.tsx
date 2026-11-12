'use client'

import { useRef, useState } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Button } from '@/shared/ui/button'
import { Interruptor } from '@/shared/ui/interruptor'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import type { MiFichaEnLaWeb } from '../../../../entities/turnos/ficha'
import { TEXTO_VER_COMO } from '../../../../entities/turnos/rueda'
import { useGuardarFicha } from '../hooks/use-guardar-ficha'
import { CamposDeFicha } from './campos-de-ficha'

// El formulario de «Tu ficha en la web» (8.05-2). Se monta al abrir el bloque por primera vez (`ficha-en-la-web.tsx`) y su código viaja con `diferido()`: cerrado,
// no pesa en el documento de `/perfil`. Un solo «Guardar»; sin cambios en `equipo`. Mirando otro rol («Ver como») queda de sólo lectura: escribiría en la cuenta
// real (D12).
export type PropsDeFormularioDeFicha = { ficha: MiFichaEnLaWeb; miraOtroRol: boolean }

export function FormularioDeFicha({ ficha, miraOtroRol }: PropsDeFormularioDeFicha) {
  const formulario = useRef<HTMLFormElement>(null)
  const enLinea = useEnLinea()
  const [publico, setPublico] = useState(ficha.publicoWeb)
  const { guardar, recargar, enCurso, conflicto, errores } = useGuardarFicha({
    actualizadoEn: ficha.actualizadoEn,
    formulario,
  })
  const quieta = enCurso || miraOtroRol

  return (
    <form
      ref={formulario}
      noValidate
      onSubmit={(evento) => {
        evento.preventDefault()
        void guardar(publico)
      }}
    >
      <div className="grid gap-4">
        {miraOtroRol ? <Aviso tono="aviso">{TEXTO_VER_COMO}</Aviso> : null}
        {enLinea ? null : (
          <Aviso tono="aviso">
            No hay conexión. Puedes seguir escribiendo: guarda cuando vuelva.
          </Aviso>
        )}
        {conflicto ? <AvisoDeConflicto mensaje={conflicto} alRecargar={recargar} /> : null}
        {/* Un <fieldset> deshabilitado apaga los campos de adentro, también para el teclado. */}
        <fieldset disabled={quieta} className="grid min-w-0 gap-4">
          <legend className="sr-only">Tu ficha en la web</legend>
          <CamposDeFicha ficha={ficha} errores={errores} />
          <Interruptor
            titulo="Aparecer en la web"
            ayuda="Tu ficha se muestra a los visitantes y pueden escribirte directo por WhatsApp. Necesitas tu WhatsApp."
            valor={publico}
            alCambiar={setPublico}
            deshabilitado={quieta}
          />
        </fieldset>
        <div>
          <Button type="submit" className="h-11 md:h-9" disabled={quieta}>
            {enCurso ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </div>
    </form>
  )
}
