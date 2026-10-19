import {
  huellaDelFormulario,
  leerAjustes,
  leerMonedasYTiposCambio,
  urlDeIcono,
  zonasHorarias,
} from '@/modules/empresa'
import { FormularioEmpresa, IconosDeLaApp } from '@/modules/empresa/pantallas/configuracion-empresa'
import { urlPublica, urlPublicaONull } from '@/shared/lib/almacen'
import { datosO } from '@/shared/lib/errores'

// La pestaña «Empresa». La lee cualquiera que llegue a la pantalla; quien no tiene
// `empresa.ajustes.gestionar` la ve deshabilitada, con el motivo.
export async function SeccionEmpresa({ puedeEditar }: { puedeEditar: boolean }) {
  const [paraEditar, monedasYTipos] = await Promise.all([leerAjustes(), leerMonedasYTiposCambio()])
  const { ajustes, conDatosCargados } = datosO(paraEditar)
  const { monedas } = datosO(monedasYTipos)

  const logoUrl = urlPublicaONull('marca', ajustes.logoRuta)

  // Los ajustes son una fila con una versión, que editan dos cosas. Cada una lleva de `key` lo
  // que ella muestra: arranca de nuevo cuando eso cambia, y no cuando guardó la otra.
  return (
    <>
      <FormularioEmpresa
        key={huellaDelFormulario(ajustes)}
        ajustes={ajustes}
        logoUrl={logoUrl}
        monedas={monedas.filter((moneda) => moneda.activa || moneda.codigo === ajustes.monedaBase)}
        zonas={zonasHorarias()}
        conDatosCargados={conDatosCargados}
        puedeEditar={puedeEditar}
      />
      <IconosDeLaApp
        key={`${ajustes.logoRuta ?? ''}|${ajustes.colorAcento ?? ''}|${JSON.stringify(ajustes.iconos)}`}
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
