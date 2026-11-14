import { leerAjustesDeLeads, leerChoquesDeTelefonos } from '@/modules/leads'
import {
  ChoquesDeTelefonos,
  TelefonosExtraDeLaEmpresa,
} from '@/modules/leads/pantallas/configuracion'
import { datosO } from '@/shared/lib/errores'

// La pestaña «Teléfonos extra»: el máximo y la regla, y, con la regla guardada encendida, los números que hoy se repiten entre leads (la
// primera página; «Ver más» sigue desde el navegador). La `key` del formulario es la versión: lo guardado, acá o por otra persona, vuelve a
// montarlo desde la base; la de los choques también, para que una regla recién encendida los lea de nuevo. Si no se puede leer, el
// `error.tsx` con «Reintentar».
export async function SeccionTelefonosExtra() {
  const { telefonos } = datosO(await leerAjustesDeLeads())
  const primera = telefonos.comoPrincipal ? datosO(await leerChoquesDeTelefonos(null)) : null
  return (
    <div className="grid gap-4">
      <TelefonosExtraDeLaEmpresa key={telefonos.actualizadoEn} telefonos={telefonos} />
      {primera ? <ChoquesDeTelefonos key={telefonos.actualizadoEn} primera={primera} /> : null}
    </div>
  )
}
