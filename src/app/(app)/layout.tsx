import { Suspense, type ReactNode } from 'react'
import { TiposCambioVigentes, getAjustes, getTiposCambio } from '@/modules/empresa'
import {
  BannerPerspectiva,
  ProveedorPerspectiva,
  ProveedorPreferencias,
  cerrarSesion,
  nombreVisible,
  puede,
  requerirSesion,
} from '@/modules/equipo'
import { AltaDeLead, leerContextoDeAlta, leerLayoutDeLeads } from '@/modules/leads'
import { urlPublicaONull } from '@/shared/lib/almacen'
import { EstiloDeMarca } from '@/shared/ui/estilo-de-marca'
import { Marca } from '@/shared/ui/marca'
import { ProveedorRegional } from '@/shared/ui/regional'
import { BarraLateral } from './_shell/barra-lateral'
import { EsqueletoShell } from './_shell/esqueleto-shell'
import { Marco } from './_shell/marco'
import { MenuUsuario } from './_shell/menu-usuario'
import { entradasVisibles } from './_shell/navegacion'

// «Nuevo lead», con lo que el drawer necesita de la base. Va detrás de su propio <Suspense>: el marco
// no espera por él, y si no se puede leer el botón no aparece (la pantalla no se cae).
async function NuevoLead() {
  const [contexto, layout] = await Promise.all([leerContextoDeAlta(), leerLayoutDeLeads()])
  if (!contexto.ok || !layout.ok) {
    console.error('«Nuevo lead» no pudo leer su contexto', contexto.ok ? layout : contexto)
    return null
  }
  return <AltaDeLead contexto={contexto.data} campos={layout.data} />
}

// Todo lo que depende de quién entró: la sesión, sus permisos y los ajustes de la empresa. Acá se
// leen una vez y se reparten por props a un marco que no sabe de dónde salen.
async function Shell({ children }: { children: ReactNode }) {
  const [sesion, ajustes, tiposCambio] = await Promise.all([
    requerirSesion(),
    getAjustes(),
    getTiposCambio(),
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
            // Sin tipos de cambio vigentes el hueco no ocupa lugar.
            tipoCambio={
              tiposCambio.length > 0 ? (
                <TiposCambioVigentes
                  tipos={tiposCambio}
                  puedeGestionar={puede(sesion.permisos, 'empresa.tipos_cambio.gestionar')}
                />
              ) : undefined
            }
            // Sin `leads.crear` no se monta nada: ni botón, ni atajo, ni una URL que lo abra.
            nuevoLead={
              puede(sesion.permisos, 'leads.crear') ? (
                <Suspense fallback={null}>
                  <NuevoLead />
                </Suspense>
              ) : undefined
            }
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
