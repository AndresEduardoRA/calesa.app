import {
  FormularioEmpresa,
  IconosDeLaApp,
  leerAjustes,
  leerMonedasYTiposCambio,
  urlDeIcono,
  zonasHorarias,
} from '@/modules/empresa'
import { urlPublica, urlPublicaONull } from '@/shared/lib/almacen'
import { datosO } from '@/shared/lib/errores'

// La pestaña «Empresa». La lee cualquiera que llegue a la pantalla; quien no tiene
// `empresa.ajustes.gestionar` la ve deshabilitada, con el motivo.
export async function SeccionEmpresa({ puedeEditar }: { puedeEditar: boolean }) {
  const [paraEditar, monedasYTipos] = await Promise.all([leerAjustes(), leerMonedasYTiposCambio()])
  const { ajustes, conDatosCargados } = datosO(paraEditar)
  const { monedas } = datosO(monedasYTipos)

  const logoUrl = urlPublicaONull('marca', ajustes.logoRuta)

  // Los ajustes son una fila con una versión: al guardar cualquiera de los dos, la pantalla
  // vuelve con la versión nueva y los dos arrancan de lo guardado.
  return (
    <>
      <FormularioEmpresa
        key={`ajustes-${ajustes.actualizadoEn}`}
        ajustes={ajustes}
        logoUrl={logoUrl}
        monedas={monedas.filter((moneda) => moneda.activa || moneda.codigo === ajustes.monedaBase)}
        zonas={zonasHorarias()}
        conDatosCargados={conDatosCargados}
        puedeEditar={puedeEditar}
      />
      <IconosDeLaApp
        key={`iconos-${ajustes.actualizadoEn}`}
        logoUrl={logoUrl}
        colorAcento={ajustes.colorAcento}
        iconos={ajustes.iconos}
        iconoActualUrl={urlDeIcono(ajustes.iconos, '192', (ruta) => urlPublica('marca', ruta))}
        actualizadoEn={ajustes.actualizadoEn}
        puedeEditar={puedeEditar}
      />
    </>
  )
}
