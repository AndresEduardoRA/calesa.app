'use client'

import { useRouter } from 'next/navigation'
import { useId, useTransition } from 'react'
import { Aviso } from '@/shared/ui/aviso'
import { AvisoDeConflicto } from '@/shared/ui/aviso-de-conflicto'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  LARGO_MAXIMO_DE_CLAVE,
  LARGO_MINIMO_DE_CLAVE,
  type AccesoDelCliente,
} from '../../../entities/portal'
import type { useOtorgarPortal } from '../hooks/use-otorgar-portal'

type Props = {
  id: string
  acceso: AccesoDelCliente
  otorgar: ReturnType<typeof useOtorgarPortal>
}

// La clave temporal que escribe la persona (o ninguna: la genera la base). Con un acceso vigente avisa
// que el anterior deja de valer. Un conflicto se dice adentro, con «Recargar», y lo escrito queda.
export function FormularioDeClave({ id, acceso, otorgar }: Props) {
  const router = useRouter()
  const [recargando, recargar] = useTransition()
  const idClave = useId()
  const idAyuda = useId()
  const idMotivo = useId()
  return (
    <form
      id={id}
      className="grid gap-3"
      onSubmit={(evento) => {
        evento.preventDefault()
        void otorgar.darConLaEscrita()
      }}
    >
      {acceso.estado === 'activo' || acceso.estado === 'bloqueado' ? (
        <Aviso tono="aviso">
          El código {acceso.codigo} y su clave dejan de valer, y si el cliente tiene la sesión
          abierta, se cierra.
        </Aviso>
      ) : null}
      <div className="grid gap-1.5">
        <Label htmlFor={idClave}>Clave temporal</Label>
        {/* Sin autocompletar ni corrector (el corrector mejorado manda lo escrito a un servicio). */}
        <Input
          id={idClave}
          value={otorgar.clave}
          onChange={(evento) => {
            otorgar.escribir(evento.target.value)
          }}
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          data-1p-ignore
          data-lpignore="true"
          maxLength={LARGO_MAXIMO_DE_CLAVE * 2}
          className="h-11 font-mono md:h-9"
          aria-invalid={otorgar.motivo !== null}
          aria-describedby={otorgar.motivo ? `${idMotivo} ${idAyuda}` : idAyuda}
        />
        {otorgar.motivo ? (
          <p id={idMotivo} className="text-(length:--text-sm) text-(--color-peligro-ink)">
            {otorgar.motivo}
          </p>
        ) : null}
        <p id={idAyuda} className="text-(length:--text-xs) text-(--color-ink-soft)">
          De {LARGO_MINIMO_DE_CLAVE} a {LARGO_MAXIMO_DE_CLAVE} caracteres: se le pedirá cambiarla al
          entrar. O genera una de 10 letras y números fáciles de dictar.
        </p>
      </div>
      {otorgar.error?.codigo === 'conflicto' ? (
        <AvisoDeConflicto
          mensaje={otorgar.error.mensaje}
          alRecargar={() => {
            recargar(() => {
              router.refresh()
            })
          }}
          enCurso={recargando}
          detalle="No se otorgó nada. Recargar trae el acceso como quedó; la clave que escribiste se conserva."
        />
      ) : otorgar.error ? (
        <Aviso tono="peligro">{otorgar.error.mensaje}</Aviso>
      ) : null}
    </form>
  )
}
