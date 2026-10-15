// API pública del módulo `leads` para el servidor. Con `client.ts`, lo único que `app/` u otro
// módulo puede importar. Lo importan los Server Components; un Client Component de afuera importa
// `@/modules/leads/client`.

// El layout de campos de los leads: lo que leen el alta, la ficha, el listado y los filtros.
// Trae todos los campos (también los desactivados): quien consume filtra `activo`.
export { leerContextoDeAlta, leerLayoutDeLeads } from './composicion'
export {
  CLAVES_RESERVADAS_DE_LEAD,
  valorDefectoVigente,
  type CampoDeLead,
  type DatosDeLaEmpresa,
} from './entities/campo'

// «Nuevo lead»: el botón de la barra superior, la tecla N y el drawer, desde cualquier pantalla. Lo
// monta el shell sólo con `leads.crear`. Trae lo que necesita (orígenes y tipos de seguimiento
// activos, el último origen de la persona, el código de país y la ciudad de la empresa) de
// `leerContextoDeAlta()`.
export { AltaDeLead } from './features/alta/components/alta-de-lead'
export type { ContextoDeAlta } from './entities/alta'

// Configuración › Leads › Campos
export { EditorDeCamposDeLead } from './features/campos/components/editor-de-campos-de-lead'

// El listado de `/leads`: lo lee la página (`leerListadoDeLeads`) y lo dibuja `<ListadoDeLeads>` con
// el drawer rápido (`?lead=`) adentro. El alcance («míos» y «todos») y lo que cada quien ve lo
// decide la base; la página sólo agrega las vistas guardadas, que son de `equipo`.
export { leerListadoDeLeads, type DatosDelListado } from './features/listado/lecturas'
// Importar desde un CSV (parte 8): el asistente de `/leads/importar` y lo que lee del layout.
export { leerDatosDeImportacion, type DatosDeImportacion } from './features/importar/lecturas'
export { AsistenteDeImportacion } from './features/importar/components/asistente-de-importacion'
// Exportar a CSV (parte 8): lo llama el route handler de `src/app/(app)/leads/exportar`.
export { exportarLeadsEnCsv, type SalidaDeExportacion } from './features/exportar/lecturas'
export { ListadoDeLeads } from './features/listado/components/listado-de-leads'
// La vista de embudo de `/leads` (`?vista=embudo`): los embudos de quien mira y el kanban del elegido
// (`leerVistaDeEmbudo`), dibujados por `<VistaDeEmbudo>`; mientras llega, `<EsqueletoDeTablero>`. Sólo
// las oportunidades propias sobre leads de la cartera: lo decide la base.
export { leerVistaDeEmbudo, type DatosDelEmbudo } from './features/embudo/lecturas'
export { VistaDeEmbudo } from './features/embudo/components/vista-de-embudo'
export { EsqueletoDeTablero } from './features/embudo/components/esqueleto-de-tablero'
export { CLAVE_DE_VISTA, VISTA_EMBUDO } from './entities/tablero'

// La ficha de `/leads/[id]`: la lee la página (`leerFichaDeLead`) y la dibuja `<FichaDeLead>` con su
// panel de edición (`?panel=editar-lead`) adentro. Quién ve el lead, qué recibe de él y si puede
// editarlo lo decide la base (`lead_ficha()` y `lead_guardar()`); `puedeEditarLead()` sólo gobierna
// si se dibuja el botón. Un lead que no se ve es `null`: la página muestra `<LeadNoDisponible>`,
// igual para lo que no existe, lo que está en la papelera y lo ajeno.
export { leerFichaDeLead, type DatosDeLaFicha } from './features/ficha/lecturas'
export { FichaDeLead } from './features/ficha/components/ficha-de-lead'
export { LeadNoDisponible } from './features/ficha/components/lead-no-disponible'
export { puedeEditarLead } from './entities/edicion'
// Qué se ofrece para mover quién tiene el lead: lo decide la página con los permisos de quien mira.
export { accionesDeCartera, duenoDe } from './entities/cartera'
// La papelera de leads: `/leads/papelera` la compone `app/` con los lotes que lee la base.
export { PapeleraDeLeads } from './features/papelera/components/papelera-de-leads'
export { leerPapeleraDeLeads } from './composicion'
export { puedeAbrirLaPapelera, puedeEnviarLead, puedePurgarLeads } from './entities/papelera'
// Cambiar el principal y los extras: con el lead en la cartera, como editarlo.
export { puedeCambiarTelefonoDeLead } from './entities/telefonos'
export { CLAVE_DE_SECCION, seccionDeLead } from './entities/ficha'
// La sección «Seguimientos»: la lee el servidor con la sesión de quien mira y va detrás de
// `<Suspense>` (su esqueleto es `<EsqueletoDeSeguimientos>`). Quién ve qué y quién anota lo decide
// la base; un co-asesor ve sólo lo «Visible para el cliente» de los demás.
export { SeccionSeguimientos } from './features/seguimientos/components/seccion-seguimientos'
export { EsqueletoDeSeguimientos } from './features/seguimientos/components/esqueleto-de-seguimientos'
// La sección «Oportunidades»: las de quien mira sobre el lead (sólo con la cartera), leída en el servidor
// detrás de `<Suspense>` (su esqueleto es `<EsqueletoDeOportunidades>`).
export { SeccionOportunidades } from './features/oportunidades/components/seccion-oportunidades'
export { EsqueletoDeOportunidades } from './features/oportunidades/components/esqueleto-de-oportunidades'
// La sección «Portal»: el acceso del cliente (otorgar, volver a otorgar, revocar, desbloquear), leída en el
// servidor detrás de `<Suspense>` (su esqueleto es `<EsqueletoDePortal>`). La página la monta sólo si
// `puedeGestionarPortal()` (la cartera y `leads.portal.gestionar`) y le pasa el nombre de la empresa y
// la dirección de la web para el texto de WhatsApp.
export { SeccionPortal } from './features/portal/components/seccion-portal'
export { EsqueletoDePortal } from './features/portal/components/esqueleto-de-portal'
export { puedeGestionarPortal } from './entities/portal'
