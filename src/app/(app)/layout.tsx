import { Suspense, type ReactNode } from 'react'
import { getAjustes } from '@/modules/empresa'
import {
  BannerPerspectiva,
  ProveedorPerspectiva,
  ProveedorPreferencias,
  cerrarSesion,
  nombreVisible,
  requerirSesion,
} from '@/modules/equipo'
import { urlPublicaONull } from '@/shared/lib/almacen'
import { EstiloDeMarca } from '@/shared/ui/estilo-de-marca'
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
  const [sesion, ajustes] = await Promise.all([requerirSesion(), getAjustes()])
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
      {/* El color de la empresa pisa los tokens neutros de design/tokens.css. */}
      <EstiloDeMarca color={ajustes.colorAcento} />
      <ProveedorPreferencias {...sesion.preferencias}>
        {/* La perspectiva «ver como» de esta sesión, para el menú, el banner y quien la pida. */}
        <ProveedorPerspectiva perspectiva={sesion.perspectiva}>
          <Marco
            nombreEmpresa={ajustes.nombre}
            marca={
              <Marca nombre={ajustes.nombre} logoUrl={urlPublicaONull('marca', ajustes.logoRuta)} />
            }
            navegacion={<BarraLateral permisos={sesion.permisos} />}
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
