'use client'

import { useRef, useState } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { useBorrador } from '@/shared/ui/use-borrador'
import { useEnLinea } from '@/shared/ui/use-en-linea'
import type { AjustesEmpresa } from '../../../entities/ajustes-empresa'
import type { Moneda } from '../../../entities/tipos-cambio'
import {
  CAMPOS_DE_AJUSTES,
  useGuardarAjustes,
  type LogoElegido,
} from '../hooks/use-guardar-ajustes'
import { CamposDeEmpresa } from './campos-de-empresa'

type Props = {
  ajustes: AjustesEmpresa
  // URL pública del logo guardado, ya armada en el servidor.
  logoUrl: string | null
  // Las monedas activas, para elegir la base.
  monedas: readonly Moneda[]
  zonas: readonly string[]
  conDatosCargados: boolean
  puedeEditar: boolean
}

// Marca, datos legales, región y políticas en un solo formulario con un «Guardar» y una versión.
// Quien lo usa le pone de `key` la huella de lo guardado (`huellaDelFormulario()`): cuando eso
// cambia (lo guardó esta persona u otra), el formulario arranca de nuevo de lo guardado. La
// versión llega por props: que se regeneren los íconos, que son la misma fila, no lo reinicia.
export function FormularioEmpresa(props: Props) {
  const { ajustes, puedeEditar, conDatosCargados } = props
  const formulario = useRef<HTMLFormElement>(null)
  const [logo, setLogo] = useState<LogoElegido>({ tipo: 'igual' })
  const [registroAbierto, setRegistroAbierto] = useState(ajustes.registroAbierto)
  const enLinea = useEnLinea()
  const borrador = useBorrador('ajustes-empresa', formulario, CAMPOS_DE_AJUSTES, puedeEditar)
  const { guardar, enCurso, errores } = useGuardarAjustes({
    logoRuta: ajustes.logoRuta,
    actualizadoEn: ajustes.actualizadoEn,
    conDatosCargados,
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
        void guardar(logo, registroAbierto)
      }}
    >
      {enLinea ? null : (
        <Aviso tono="aviso">
          No hay conexión. Puedes seguir escribiendo: guarda cuando vuelva.
        </Aviso>
      )}
      <CamposDeEmpresa
        {...props}
        logo={logo}
        alCambiarLogo={setLogo}
        registroAbierto={registroAbierto}
        alCambiarRegistro={setRegistroAbierto}
        errores={errores}
      />
      {puedeEditar ? (
        <div>
          <Button type="submit" className="h-11 md:h-9" disabled={enCurso}>
            {enCurso ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      ) : null}
    </form>
  )
}
