import { errorDeCampo } from '@/shared/lib/formularios'
import { Bloque } from '@/shared/ui/bloque'
import { Campo } from '@/shared/ui/campo'
import type { AjustesEmpresa } from '../../../entities/ajustes-empresa'
import type { LogoElegido } from '../hooks/use-guardar-ajustes'
import { CampoColor } from './campo-color'
import { CampoLogo } from './campo-logo'
import type { ErroresDeAjustes } from './campos-de-empresa'

type Props = {
  ajustes: AjustesEmpresa
  logoUrl: string | null
  logo: LogoElegido
  alCambiarLogo: (logo: LogoElegido) => void
  deshabilitado: boolean
  errores: ErroresDeAjustes
}

export function BloqueMarca({
  ajustes,
  logoUrl,
  logo,
  alCambiarLogo,
  deshabilitado,
  errores,
}: Props) {
  return (
    <Bloque titulo="Marca" descripcion="Lo que identifica a la empresa en toda la app.">
      <Campo
        nombre="nombre"
        etiqueta="Nombre de la empresa"
        autoComplete="organization"
        maxLength={80}
        defaultValue={ajustes.nombre}
        error={errorDeCampo(errores, 'nombre')}
      />
      <CampoColor guardado={ajustes.colorAcento} error={errorDeCampo(errores, 'colorAcento')} />
      <CampoLogo
        urlActual={logoUrl}
        cambio={logo}
        alCambiar={alCambiarLogo}
        deshabilitado={deshabilitado}
      />
    </Bloque>
  )
}
