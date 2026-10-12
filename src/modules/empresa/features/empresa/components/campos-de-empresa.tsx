import { Aviso } from '@/shared/ui/aviso'
import type { AjustesEmpresa } from '../../../entities/ajustes-empresa'
import { MOTIVO_SIN_PERMISO_AJUSTES } from '../../../entities/motivos'
import type { Moneda } from '../../../entities/tipos-cambio'
import type { CAMPOS_DE_AJUSTES, LogoElegido } from '../hooks/use-guardar-ajustes'
import { BloqueLegales } from './bloque-legales'
import { BloqueMarca } from './bloque-marca'
import { BloquePoliticas } from './bloque-politicas'
import { BloqueRegion } from './bloque-region'

// Los errores de validación que devuelve la action, por campo.
export type ErroresDeAjustes =
  Partial<Record<(typeof CAMPOS_DE_AJUSTES)[number] | 'logoRuta', string[]>> | undefined

type Props = {
  ajustes: AjustesEmpresa
  // URL pública del logo guardado, ya armada en el servidor.
  logoUrl: string | null
  monedas: readonly Moneda[]
  zonas: readonly string[]
  conDatosCargados: boolean
  // Quien no puede editar ve todo, deshabilitado y con el motivo.
  puedeEditar: boolean
  logo: LogoElegido
  alCambiarLogo: (logo: LogoElegido) => void
  registroAbierto: boolean
  alCambiarRegistro: (abierto: boolean) => void
  errores: ErroresDeAjustes
}

// Los bloques del formulario de la empresa. Sin estado propio: lo que cambia llega por props.
export function CamposDeEmpresa(props: Props) {
  const { ajustes, puedeEditar, errores } = props
  return (
    // Un <fieldset> deshabilitado apaga todos los campos de adentro, también para el teclado.
    <fieldset disabled={!puedeEditar} className="grid min-w-0 gap-4">
      <legend className="sr-only">Ajustes de la empresa</legend>
      {puedeEditar ? null : <Aviso>{MOTIVO_SIN_PERMISO_AJUSTES}</Aviso>}
      <BloqueMarca
        ajustes={ajustes}
        logoUrl={props.logoUrl}
        logo={props.logo}
        alCambiarLogo={props.alCambiarLogo}
        deshabilitado={!puedeEditar}
        errores={errores}
      />
      <BloqueLegales ajustes={ajustes} errores={errores} />
      <BloqueRegion
        ajustes={ajustes}
        monedas={props.monedas}
        zonas={props.zonas}
        conDatosCargados={props.conDatosCargados}
        errores={errores}
      />
      <BloquePoliticas
        ajustes={ajustes}
        registroAbierto={props.registroAbierto}
        alCambiarRegistro={props.alCambiarRegistro}
        deshabilitado={!puedeEditar}
        errores={errores}
      />
    </fieldset>
  )
}
