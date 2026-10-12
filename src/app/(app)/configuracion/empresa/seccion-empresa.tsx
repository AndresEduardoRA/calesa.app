import {
  FormularioEmpresa,
  leerAjustes,
  leerMonedasYTiposCambio,
  zonasHorarias,
} from '@/modules/empresa'
import { urlPublicaONull } from '@/shared/lib/almacen'
import { datosO } from '@/shared/lib/errores'

// La pestaña «Empresa». La lee cualquiera que llegue a la pantalla; quien no tiene
// `empresa.ajustes.gestionar` la ve deshabilitada, con el motivo.
export async function SeccionEmpresa({ puedeEditar }: { puedeEditar: boolean }) {
  const [paraEditar, monedasYTipos] = await Promise.all([leerAjustes(), leerMonedasYTiposCambio()])
  const { ajustes, conDatosCargados } = datosO(paraEditar)
  const { monedas } = datosO(monedasYTipos)

  return (
    <FormularioEmpresa
      // Al guardar, la pantalla vuelve con la versión nueva y el formulario arranca de lo guardado.
      key={ajustes.actualizadoEn}
      ajustes={ajustes}
      logoUrl={urlPublicaONull('marca', ajustes.logoRuta)}
      monedas={monedas.filter((moneda) => moneda.activa || moneda.codigo === ajustes.monedaBase)}
      zonas={zonasHorarias()}
      conDatosCargados={conDatosCargados}
      puedeEditar={puedeEditar}
    />
  )
}
