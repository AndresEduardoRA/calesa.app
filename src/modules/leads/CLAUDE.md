# leads

Leads (prospectos y clientes) con teléfono principal único y enmascarado salvo cartera, **campos configurables** con quién los ve, seguimientos, recordatorios, etiquetas, favoritos/tachados, compartir/transferir, oportunidades en embudos, portal del cliente, limbo y papelera.

> Estado: en la Fase 3 existe el **layout de campos** (esquema, RPC, privacidad y la pantalla Configuración › Leads › Campos). El alta, la ficha, el listado y el resto todavía no tienen código: lo que sigue en «Entra y sale» como pendiente es el contrato de las partes que faltan. Hasta entonces `vehiculos` muestra el nombre de un lead con sus propias funciones de lectura (`vehiculo_vinculos`, `vehiculo_interesados`).

## Entra y sale

- Entra: Configuración › Leads (`/configuracion/leads`, `?seccion=campos`, un campo en `?campo=`) con `leads.configurar`. Pendiente: drawer «Nuevo lead» (verifica el teléfono al tipear), seguimientos con Tiptap saneado, importación CSV propia.
- Sale por `index.ts` (servidor):
  - `leerLayoutDeLeads()` — todos los campos (también los desactivados: quien consume filtra `activo`) como `CampoDeLead`. Es lo que leerán el alta, la ficha, el listado y los filtros.
  - `valorDefectoVigente(campo, empresa)` — el valor con el que arranca el alta: el fijo, o la ciudad o el país de la empresa resuelto hoy.
  - `<EditorDeCamposDeLead campos puedeGestionar empresa>` — la pestaña «Campos».
  - `CLAVES_RESERVADAS_DE_LEAD` y los tipos `CampoDeLead`, `DatosDeLaEmpresa`.
- Sale por `client.ts`: las mismas reglas puras y tipos, sin servidor.
- Pendiente: `getLead()`, `buscarLeads()`, `<SelectorLead>`, `<ChipLead>`, `telefonoDe(leadId)` (sólo cartera). Los consumirán `cotizaciones`, `vehiculos`, `agenda`, `chat`, `web`, `repuestos`, `buscador`, `tablero`, `datos`.
- Depende de: `equipo` (permisos y alcance propios/todos) y de `shared/lib/campos` + `shared/ui/campos` (el motor de campos y su editor, compartidos con `origenes`). **No** depende de `origenes` ni de `empresa`: la ciudad y el país de la empresa los trae la página por props.

## Archivos clave

- `entities/campo.ts` — `CampoDeLead` (= `CampoBase` + `enTabla`, `filtrable`, `soloCartera`, `valorDefectoEmpresa`), `camposDeLeadDesde()`, `CLAVES_RESERVADAS_DE_LEAD` (espejo de `_lead_clave_reservada()`), `claveDeCampoDeLead()`, `soloCarteraPorTipo()` (el correo y el documento nacen privados), `valorDefectoVigente()`.
- `entities/cambios-de-campo.ts` — `cambiosRespectoDe()` (sólo viaja lo que cambió), `cambiosComoColumnas()`, `necesitaVistaPrevia()` (también cuando un campo deja de ser «solo la cartera»). `entities/impacto.ts` — el impacto del motor dicho con «lead», más lo que es propio: a cuántos leads se expone un privado y cuánto pide el alta rápida (`REQUERIDOS_QUE_ALARGAN_EL_ALTA`). `entities/motivos.ts`, `entities/repositorios.ts`.
- `infra/campos.ts` (las cinco RPC `lead_campo_*`), `infra/queries/campos.ts` (`leads_campos`), `composicion.ts`.
- `features/campos/` — `configuracion.tsx` (`configuracionDeLeads()`: las banderas, los textos, cómo se arma lo que viaja y el hueco «Valor de la empresa»), `components/editor-de-campos-de-lead.tsx` (el envoltorio del editor compartido), `hooks/use-campos.ts`, `actions/` (crear, guardar, mover, eliminar, vista previa) y `schemas/campos.ts`.
- La página compone lo que cruza módulos: `src/app/(app)/configuracion/leads/` (lee el layout y los ajustes de la empresa).
- Pendiente: `entities/telefono.ts` (normalización) y `entities/cartera.ts` (reglas de acceso puras); `infra/queries/leads.ts` lee **`leads_vista`**, nunca la tabla; `infra/rpc.ts` envuelve `crear_lead`, `verificar_telefono`, `compartir_lead`, `transferir_lead`, `otorgar_portal`; `features/listado/`, `ficha/`, `seguimientos/`, `recordatorios/`, `embudo/`, `portal/`, `importar/`.

## Tablas

`leads` (con `atributos`), `leads_campos` (el layout), `leads_telefonos`, `leads_asesores` (cartera), `leads_favoritos`, `leads_tachados`, `etiquetas`, `leads_etiquetas`, `tipos_seguimiento`, `seguimientos`, `recordatorios`, `embudos`, `embudos_etapas`, `oportunidades`, `oportunidades_historial`, `accesos_portal`, `origenes_lead`, `lotes_papelera` (compartida con vehículos y cotizaciones).

RPC de campos (`…20261014000800_leads_campos.sql`): `lead_campo_crear`, `lead_campo_guardar`, `lead_campo_mover`, `lead_campo_eliminar`, `lead_campo_impacto`. Privacidad y datos (`…000900_leads_atributos.sql`): `atributos_lead()`, `lead_validar_atributos` (trigger), `crear_lead`, `_leads_columnas_a_atributos()` (la migración de las seis columnas). El motor SQL es común con los orígenes (`…000600_campos_motor.sql`).

## No se rompe

- **Fijos:** nombre, teléfono principal, tipo y origen del lead son columnas: no se apagan ni se borran. Todo lo demás es un campo de `leads_campos`, también edad, ciudad, país, dirección, género y notas, que nacen de fábrica (`es_sistema`): se apagan y se renombran, no se eliminan ni cambian de tipo ni de clave.
- **Un solo layout por despliegue**, igual para prospectos y clientes. No es multi-empresa.
- **Un campo con datos no cambia de tipo ni se elimina: se desactiva** (el dato queda en `atributos`; reactivar lo devuelve). Volver requerido no toca los leads que ya existen: el trigger sólo valida al escribir. El orden es relativo («después de X»). El aviso de impacto va con números y dentro del panel.
- **Los privados se recortan en la base, no en la pantalla.** Un campo «solo la cartera» (`solo_cartera`) sólo lo recibe quien tiene el lead en su cartera (dueño, compartido o adoptado), **incluido** quien tiene `leads.ver` «todos» sin estar en ella: igual que el teléfono. `leads.atributos` no tiene grant: se lee por `leads_vista.atributos`, que viene de `atributos_lead()`.
  - Falla cerrada: a quien no es de la cartera sólo le llegan las claves que el layout conoce como no privadas, **estén activas o no**. Desactivar un privado no lo expone.
  - **Filtrar también es leer:** PostgREST filtra sobre la columna de la vista, que ya viene recortada; `leads.atributos` directo da «permission denied». El buscador (Fase 7) hereda la regla.
  - Compartir, transferir y adoptar del limbo le dan los privados a quien entra a la cartera; revocar se los quita. No se mueven datos: se decide al leer.
  - Un trigger no deja que quien está fuera de la cartera cambie un privado, ni le exige uno requerido que no ve.
  - `actividad` ya no entrega `antes` ni `despues` (la fila entera, con el teléfono y los privados): la pantalla de Actividad (Fase 9) leerá el diff por una función que recorta según la cartera.
- **`crear_lead`** recibe los datos propios en `atributos`; una clave suelta (`ciudad`) se rechaza diciendo dónde va. Un atributo que no existe, de tipo equivocado, con una opción que no está o sin un requerido se rechaza con el campo en el `hint` (`atributos.<clave>`). Al adoptar del limbo se suman los atributos que trae.
- **Los campos propios nunca salen** en el portal del cliente ni en la web pública (por ahora). Una etiqueta es privada de cada persona; un campo de lead es del despliegue y su visibilidad la decide el layout.
- Los tipos son los de un vehículo sin VIN ni lote, más `correo` y `documento` (que nacen «solo la cartera»). Un vehículo no lleva correo ni documento (un `check` en cada tabla). Los teléfonos extra siguen en `leads_telefonos`.
- El **valor por defecto** sólo precarga el alta; la base no lo aplica sola. «La de la empresa» (`valor_defecto_empresa`: `ciudad` o `pais`) se resuelve al leer el layout, así que sigue a la empresa si cambia; es excluyente con un valor fijo y sólo vale en un campo de texto.
- **Alta rápida (Flujo 1, ≤ 25 s):** el drawer lleva los cuatro fijos y los campos activos requeridos; lo demás va plegado en «Más datos», precargado. Volver requerido un campo avisa dentro del panel cuántos datos pedirá el alta; desde el cuarto, que la meta cuesta cumplirla.
- `telefono_principal` es único entre leads vivos; sólo `crear_lead` y `cambiar_telefono_lead` lo escriben. Si existe: dice de quién es (CTA al chat) o, si está en limbo, lo adopta y queda en `actividad`.
- El teléfono completo sólo lo ve la cartera (`telefono_lead()`), **incluido el dueño**: es deliberado, no un bug.
- Favoritos, tachados y etiquetas son privados por usuario: compartir un lead no los comparte.
- Un seguimiento con `visibilidad = 'publico'` es lo único del lead que ve el portal.
- Todo texto de la interfaz sale de la fila (`etiqueta`): ningún nombre de campo está escrito en componentes.

## Ojo

- `leads_vista` existe porque RLS no esconde columnas. Un `select *` sobre `leads` desde la app es un error de revisión (y falla: ni `telefono_principal` ni `atributos` tienen grant).
- Una vista se valida al crearse: por eso las migraciones antiguas ya no nombran las seis columnas, y `_leads_vista_crear()` es la única definición actual de `leads_vista`.
- `atributos` nunca guarda un nulo: vaciar quita la clave. Lo de un campo desactivado se conserva y no se cambia.
- Sin rango: la columna `edad` tenía `between 1 and 120`; el campo «Edad» es un número cualquiera. Si hace falta un tope, es una regla del motor para todos los campos, no de este.
- Un lead insertado con el cliente de servicio (los e2e) pasa por el mismo trigger: con un campo requerido activo, falta el dato y se rechaza. Los e2e que cargan leads completan los requeridos (`e2e/soporte/leads.ts`).
- Discrepancias que se anotaron y **no** cambian el enmascarado: `leads_telefonos` no se enmascara a quien ve el lead sin la cartera; `telefono_lead(id)` no comprueba acceso (da el teléfono enmascarado de cualquier id); quien tiene `leads.editar` «todos» puede compartirse un lead ajeno. Van con la parte de la cartera.
- El código del portal (`XXX-YYYYY`, alfabeto sin I/O/0/1) se muestra una sola vez en grande; la clave se guarda con bcrypt y nadie la lee.
