'use client'

import { Campo } from '@/shared/ui/campo'
import { Interruptor } from '@/shared/ui/interruptor'
import { LARGO_DE_CANAL } from '../../../../entities/contenido/testimonios'
import type { useFormularioDeConsentimiento } from '../hooks/use-formulario-de-consentimiento'

type Props = { formulario: ReturnType<typeof useFormularioDeConsentimiento> }

// Los campos de «Registrar consentimiento»: el canal y qué datos autorizó. Cada casilla sólo se puede encender si el testimonio tiene ese dato.
export function CamposDeConsentimiento({ formulario: f }: Props) {
  const t = f.testimonio
  return (
    <>
      <Campo
        nombre="canal"
        etiqueta="Canal"
        autoComplete="off"
        maxLength={LARGO_DE_CANAL + 20}
        value={f.valores.canal}
        error={f.errores['canal']}
        ayuda="Por dónde lo aceptó: WhatsApp, correo, firma…"
        onChange={(evento) => {
          f.cambiar({ canal: evento.target.value })
        }}
      />
      <Interruptor
        titulo="Mostrar la ciudad"
        ayuda={
          t.ciudad === null ? 'No tiene ciudad cargada.' : 'La ciudad se verá en la web pública.'
        }
        valor={f.valores.ciudad}
        deshabilitado={t.ciudad === null}
        alCambiar={(ciudad) => {
          f.cambiar({ ciudad })
        }}
      />
      <Interruptor
        titulo="Mostrar el vehículo"
        ayuda={
          t.vehiculo === null
            ? 'No tiene vehículo cargado.'
            : 'El vehículo se verá en la web pública.'
        }
        valor={f.valores.vehiculo}
        deshabilitado={t.vehiculo === null}
        alCambiar={(vehiculo) => {
          f.cambiar({ vehiculo })
        }}
      />
      <Interruptor
        titulo="Mostrar la foto"
        ayuda={
          t.fotoRuta === null ? 'No tiene foto cargada.' : 'La foto se verá en la web pública.'
        }
        valor={f.valores.foto}
        deshabilitado={t.fotoRuta === null}
        alCambiar={(foto) => {
          f.cambiar({ foto })
        }}
      />
    </>
  )
}
