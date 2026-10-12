import { errorDeCampo } from '@/shared/lib/formularios'
import { Bloque } from '@/shared/ui/bloque'
import { Campo } from '@/shared/ui/campo'
import type { AjustesEmpresa } from '../../../entities/ajustes-empresa'
import type { ErroresDeAjustes } from './campos-de-empresa'

type Props = { ajustes: AjustesEmpresa; errores: ErroresDeAjustes }

export function BloqueLegales({ ajustes, errores }: Props) {
  return (
    <Bloque
      titulo="Datos legales y de contacto"
      descripcion="Salen en las cotizaciones, los comprobantes y la web pública."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          nombre="razonSocial"
          etiqueta="Razón social"
          maxLength={160}
          defaultValue={ajustes.razonSocial ?? ''}
          error={errorDeCampo(errores, 'razonSocial')}
        />
        <Campo
          nombre="nit"
          etiqueta="NIT"
          autoComplete="off"
          maxLength={40}
          defaultValue={ajustes.nit ?? ''}
          error={errorDeCampo(errores, 'nit')}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          nombre="direccion"
          etiqueta="Dirección"
          autoComplete="street-address"
          maxLength={200}
          defaultValue={ajustes.direccion ?? ''}
          error={errorDeCampo(errores, 'direccion')}
        />
        <Campo
          nombre="ciudad"
          etiqueta="Ciudad"
          autoComplete="address-level2"
          maxLength={80}
          defaultValue={ajustes.ciudad ?? ''}
          error={errorDeCampo(errores, 'ciudad')}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          nombre="telefono"
          etiqueta="Teléfono"
          type="tel"
          autoComplete="tel"
          maxLength={40}
          defaultValue={ajustes.telefono ?? ''}
          error={errorDeCampo(errores, 'telefono')}
        />
        <Campo
          nombre="whatsapp"
          etiqueta="WhatsApp"
          type="tel"
          maxLength={40}
          defaultValue={ajustes.whatsapp ?? ''}
          error={errorDeCampo(errores, 'whatsapp')}
        />
      </div>
      <Campo
        nombre="email"
        etiqueta="Correo de contacto"
        type="email"
        autoComplete="email"
        defaultValue={ajustes.email ?? ''}
        error={errorDeCampo(errores, 'email')}
      />
    </Bloque>
  )
}
