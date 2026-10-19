import { Suspense, type ReactNode } from 'react'
import { TiposCambioVigentes, getAjustes, getTiposCambio } from '@/modules/empresa/shell'
import {
  BannerPerspectiva,
  ProveedorPerspectiva,
  ProveedorPreferencias,
  cerrarSesion,
  nombreVisible,
  puede,
  requerirSesion,
} from '@/modules/equipo/shell'
import { AltaDeLead } from '@/modules/leads/shell'
import { urlPublicaONull } from '@/shared/lib/almacen'
import { anchoDeEstaPeticion } from '@/shared/lib/ancho.server'
import { ProveedorDeAncho } from '@/shared/ui/ancho-de-pantalla'
import { EstiloDeMarca } from '@/shared/ui/estilo-de-marca'
import { SimbolosDeLista } from '@/shared/ui/lista/simbolos-de-lista'
import { Marca } from '@/shared/ui/marca'
import { ProveedorRegional } from '@/shared/ui/regional'
import { BarraLateral } from './_shell/barra-lateral'
import { EsqueletoShell } from './_shell/esqueleto-shell'
import { Marco } from './_shell/marco'
import { MenuUsuario } from './_shell/menu-usuario'
import { entradasVisibles } from './_shell/navegacion'

// Todo lo que depende de quién entró: la sesión, sus permisos y los ajustes de la empresa. Acá se
// leen una vez y se reparten por props a un marco que no sabe de dónde salen.
async function Shell({ children }: { children: ReactNode }) {
  const [sesion, ajustes, tiposCambio, ancho] = await Promise.all([
    requerirSesion(),
    getAjustes(),
    getTiposCambio(),
    anchoDeEstaPeticion(),
  ])
  const nombre = nombreVisible(sesion)
  const delUsuario = entradasVisibles(sesion.permisos, 'usuario').map(
    ({ clave, titulo, ruta }) => ({
      clave,
      titulo,
      ruta,
    }),
  )

  return (
    <ProveedorRegional
      locale={ajustes.locale}
      monedaBase={ajustes.monedaBase}
      zonaHoraria={ajustes.zonaHoraria}
    >
      {/* El ancho de quien pide: cada lista dibuja una sola de sus vistas, ya desde el servidor (cierre 1). */}
      <ProveedorDeAncho inicial={ancho}>
        {/* El color de la empresa pisa los tokens neutros de design/tokens.css. */}
        <EstiloDeMarca color={ajustes.colorAcento} />
        {/* Los iconos que se repiten en cada fila de una lista, dibujados una vez (`<use>`): el «⋯» cuesta 3 nodos, no 6. */}
        <SimbolosDeLista />
        <ProveedorPreferencias {...sesion.preferencias}>
          {/* La perspectiva «ver como» de esta sesión, para el menú, el banner y quien la pida. */}
          <ProveedorPerspectiva perspectiva={sesion.perspectiva}>
            <Marco
              nombreEmpresa={ajustes.nombre}
              marca={
                <Marca
                  nombre={ajustes.nombre}
                  logoUrl={urlPublicaONull('marca', ajustes.logoRuta)}
                />
              }
              navegacion={<BarraLateral permisos={sesion.permisos} />}
              // Sin tipos de cambio vigentes el hueco no ocupa lugar.
              tipoCambio={
                tiposCambio.length > 0 ? (
                  <TiposCambioVigentes
                    tipos={tiposCambio}
                    puedeGestionar={puede(sesion.permisos, 'empresa.tipos_cambio.gestionar')}
                  />
                ) : undefined
              }
              // Sin `leads.crear` no se monta nada: ni botón, ni atajo, ni una URL que lo abra. El drawer lee lo que necesita al abrirse:
              // el documento de la pantalla no lleva los catálogos del alta.
              nuevoLead={puede(sesion.permisos, 'leads.crear') ? <AltaDeLead /> : undefined}
              aviso={<BannerPerspectiva />}
              menuUsuario={
                <MenuUsuario
                  persona={{
                    nombre,
                    email: sesion.email,
                    avatarUrl: urlPublicaONull('avatares', sesion.avatarRuta),
                    rol: sesion.roles[0]?.nombre ?? null,
                  }}
                  entradas={delUsuario}
                  alCerrarSesion={cerrarSesion}
                />
              }
            >
              {children}
            </Marco>
          </ProveedorPerspectiva>
        </ProveedorPreferencias>
      </ProveedorDeAncho>
    </ProveedorRegional>
  )
}

// Las pantallas con sesión. El layout en sí es estático (la cáscara es el esqueleto del marco);
// leer la sesión es de cada request y por eso va detrás de <Suspense>.
export default function LayoutApp({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<EsqueletoShell />}>
      <Shell>{children}</Shell>
    </Suspense>
  )
}
