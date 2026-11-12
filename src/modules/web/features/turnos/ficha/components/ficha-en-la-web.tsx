'use client'

import { useRef, useState } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Bloque } from '@/shared/ui/bloque'
import { Button } from '@/shared/ui/button'
import { Interruptor } from '@/shared/ui/interruptor'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import type { MiFichaEnLaWeb } from '../../../../entities/turnos/ficha'
import { TEXTO_VER_COMO } from '../../../../entities/turnos/rueda'
import { useGuardarFicha } from '../hooks/use-guardar-ficha'
import { CamposDeFicha } from './campos-de-ficha'

// «Tu ficha en la web» en Mi perfil (8.05-2): cómo te presenta la web y cómo te escriben los clientes. Quien lo monta le pone de `key` la versión del perfil: lo
// guardado (aquí, en «Tus datos» o por quien administra el equipo) lo vuelve a montar desde la base. Un solo «Guardar»; sin cambios en `equipo`. Mirando otro
// rol («Ver como») queda de sólo lectura: escribiría en la cuenta real (D12).
export function FichaEnLaWeb({
  ficha,
  miraOtroRol,
}: {
  ficha: MiFichaEnLaWeb
  miraOtroRol: boolean
}) {
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
      <Bloque
        titulo="Tu ficha en la web"
        descripcion="Cómo te presenta la web y cómo te escriben los clientes."
        plegado
        forzarAbierto={conflicto !== null || Object.keys(errores).length > 0}
      >
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
      </Bloque>
    </form>
  )
}
