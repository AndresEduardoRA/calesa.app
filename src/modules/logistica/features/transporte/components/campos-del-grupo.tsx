'use client'

import { puede } from '@/shared/lib/permisos'
import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { TEXTO_DE_VARIOS, type CampoDelGrupo } from '../../../entities/transporte/edicion-del-grupo'
import type { OpcionDeTransporte } from '../../../entities/transporte/oferta'
import {
  LARGO_MAXIMO_DEL_CONTENEDOR,
  type CampoDeTransporte,
  type ErroresDeTransporte,
  type ValoresDeTransporte,
} from '../../../entities/transporte/transporte'
import { usePermisosDeTransporte } from '../hooks/use-permisos-de-transporte'
import { SinNavieras } from './campos-de-ruta'

export type PropsDeCamposDelGrupo = {
  prefijo: string
  valores: ValoresDeTransporte
  // Los campos donde las unidades difieren: salen sin valor y dicen «Varios».
  varios: readonly CampoDelGrupo[]
  errores: ErroresDeTransporte
  escribir: (campo: CampoDeTransporte, valor: string) => void
  apagado: boolean
}

type Selector = PropsDeCamposDelGrupo & {
  campo: 'naviera' | 'puertoOrigen' | 'puertoDestino'
  id: string
  etiqueta: string
  opciones: readonly OpcionDeTransporte[]
}

// Un selector del grupo: «Varios» (valor vacío) si las unidades difieren, «Sin elegir» si ninguna tiene (6.08-4). Escribir un valor lo aplica a todas; dejar «Varios» no toca nada (D38).
function SelectorDelGrupo({ campo, id, etiqueta, opciones, ...p }: Selector) {
  const enVarios = p.varios.includes(campo)
  const sinTocar = enVarios && p.valores[campo] === ''
  return (
    <CampoSeleccion
      nombre={`${p.prefijo}-${id}`}
      etiqueta={etiqueta}
      opciones={[{ valor: '', etiqueta: enVarios ? 'Varios' : 'Sin elegir' }, ...opciones]}
      value={p.valores[campo]}
      onChange={(e) => {
        p.escribir(campo, e.target.value)
      }}
      ayuda={sinTocar ? TEXTO_DE_VARIOS : undefined}
      error={p.errores[campo]}
      disabled={p.apagado}
    />
  )
}

type PropsDeRuta = PropsDeCamposDelGrupo & {
  navieras: readonly OpcionDeTransporte[]
  puertosOrigen: readonly OpcionDeTransporte[]
  puertosDestino: readonly OpcionDeTransporte[]
  hayNavieras: boolean
}

// «Ruta»: naviera y puertos. Las opciones son todos los activos del catálogo (un grupo cruza flujos; la oferta de cada uno la revisa la base por unidad, D40).
// Sin navieras activas: quien gestiona los catálogos ve el enlace a cargarlas (igual que en el hueco «Transporte»).
function SinNavierasDelGrupo() {
  const permisos = usePermisosDeTransporte()
  return (
    <SinNavieras
      puedeCargar={permisos !== null && puede(permisos, 'logistica.catalogos.gestionar')}
    />
  )
}

export function CamposDeRutaDelGrupo({
  navieras,
  puertosOrigen,
  puertosDestino,
  hayNavieras,
  ...p
}: PropsDeRuta) {
  return (
    <>
      <div className="grid gap-1.5">
        <SelectorDelGrupo
          {...p}
          campo="naviera"
          id="naviera"
          etiqueta="Naviera"
          opciones={navieras}
        />
        {hayNavieras ? null : <SinNavierasDelGrupo />}
      </div>
      <SelectorDelGrupo
        {...p}
        campo="puertoOrigen"
        id="puerto-origen"
        etiqueta="Puerto de origen"
        opciones={puertosOrigen}
      />
      <SelectorDelGrupo
        {...p}
        campo="puertoDestino"
        id="puerto-destino"
        etiqueta="Puerto de destino"
        opciones={puertosDestino}
      />
    </>
  )
}

type Texto = PropsDeCamposDelGrupo & {
  campo: 'contenedor' | 'booking' | 'zarpe' | 'eta' | 'arribo'
  etiqueta: string
  fecha?: boolean
}

// Un campo de texto o de fecha del grupo. Un «Varios» arranca vacío y lo dice en el `placeholder` (en una fecha, sólo en la ayuda) y en la ayuda mientras no se escriba.
function TextoDelGrupo({ campo, etiqueta, fecha = false, ...p }: Texto) {
  const sinTocar = p.varios.includes(campo) && p.valores[campo] === ''
  return (
    <Campo
      nombre={`${p.prefijo}-${campo}`}
      etiqueta={etiqueta}
      {...(fecha
        ? { type: 'date' }
        : {
            autoComplete: 'off',
            autoCapitalize: 'characters',
            maxLength: LARGO_MAXIMO_DEL_CONTENEDOR * 2,
            placeholder: sinTocar ? 'Varios' : undefined,
          })}
      value={p.valores[campo]}
      onChange={(e) => {
        p.escribir(campo, e.target.value)
      }}
      ayuda={sinTocar ? TEXTO_DE_VARIOS : undefined}
      error={p.errores[campo]}
      disabled={p.apagado}
    />
  )
}

export function CamposDeContenedorDelGrupo(p: PropsDeCamposDelGrupo) {
  return (
    <>
      <TextoDelGrupo {...p} campo="contenedor" etiqueta="Contenedor" />
      <TextoDelGrupo {...p} campo="booking" etiqueta="Booking" />
    </>
  )
}

export function CamposDeFechasDelGrupo(p: PropsDeCamposDelGrupo) {
  return (
    <>
      <TextoDelGrupo {...p} campo="zarpe" etiqueta="Zarpe" fecha />
      <TextoDelGrupo {...p} campo="eta" etiqueta="ETA" fecha />
      <TextoDelGrupo {...p} campo="arribo" etiqueta="Arribo" fecha />
    </>
  )
}
