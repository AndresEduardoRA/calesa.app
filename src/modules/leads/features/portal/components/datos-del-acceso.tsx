'use client'

import { cn } from 'cn'
import { fechaRelativa, formatearHora } from '@/shared/lib/fechas'
import { Aviso } from '@/shared/ui/aviso'
import { Dato, RejillaDeDatos } from '@/shared/ui/campos'
import { useRegional } from '@/shared/ui/regional'
import type { AccesoVigente } from '../../../entities/portal'
import { nombreDeQuien } from '../../../entities/portal-mensaje'
import { BotonCopiar } from './boton-copiar'
import { InsigniaDelAcceso } from './insignia-del-acceso'

// El estado y el código (tachado si se revocó: ya no vale), con «Copiar código» mientras vale.
export function CabeceraDelAcceso({ acceso }: { acceso: AccesoVigente }) {
  const revocado = acceso.estado === 'revocado'
  return (
    <div className="flex flex-wrap items-center gap-3">
      <InsigniaDelAcceso estado={acceso.estado} />
      <span
        className={cn(
          'font-mono text-(length:--text-lg) font-semibold tracking-widest',
          revocado && 'text-(--color-ink-soft) line-through',
        )}
      >
        {acceso.codigo}
      </span>
      {revocado ? null : <BotonCopiar texto={acceso.codigo} etiqueta="Copiar código" />}
    </div>
  )
}

// Lo que explica un bloqueo (hasta qué hora) o una revocación (quién y cuándo).
export function EstadoDelAcceso({ acceso }: { acceso: AccesoVigente }) {
  const { zonaHoraria: zona } = useRegional()
  if (acceso.estado === 'bloqueado' && acceso.bloqueadoHasta) {
    return (
      <Aviso tono="aviso">
        Cinco intentos fallidos: no puede entrar hasta las{' '}
        {formatearHora(acceso.bloqueadoHasta, { zona })}. Si ya hablaste con el cliente,
        desbloquéalo para que vuelva a intentar.
      </Aviso>
    )
  }
  if (acceso.estado !== 'revocado') {
    return null
  }
  return (
    <p className="text-(length:--text-sm) text-(--color-ink-soft)">
      {acceso.revocadoEn
        ? `Lo revocó ${nombreDeQuien(acceso.revocadoPor)} ${fechaRelativa(acceso.revocadoEn, { zona })}. `
        : 'Revocado. '}
      Ese código ya no vale: para darle acceso otra vez, otórgale uno nuevo.
    </p>
  )
}

// Cuándo y quién lo otorgó, el último ingreso del cliente y si todavía tiene la clave temporal.
export function DatosDelAcceso({ acceso }: { acceso: AccesoVigente }) {
  const { zonaHoraria: zona } = useRegional()
  return (
    <RejillaDeDatos>
      <Dato etiqueta="Otorgado">
        {fechaRelativa(acceso.otorgadoEn, { zona })}, por {nombreDeQuien(acceso.otorgadoPor)}
      </Dato>
      <Dato etiqueta="Último ingreso">
        {acceso.ultimoIngresoEn
          ? fechaRelativa(acceso.ultimoIngresoEn, { zona })
          : 'Todavía no entró'}
      </Dato>
      {acceso.estado === 'revocado' ? null : (
        <Dato etiqueta="Clave">
          {acceso.debeCambiarClave
            ? 'La temporal: se le pedirá cambiarla al entrar'
            : 'La cambió el cliente'}
        </Dato>
      )}
    </RejillaDeDatos>
  )
}
