# Glosario

Un término del negocio = un nombre en el código: al aparecer uno nuevo se agrega aquí antes de crear el tipo o la tabla. Si ya existe, se usa
ese nombre: nunca un sinónimo ni su traducción al inglés.

- **Equipo** — `perfiles` / `/configuracion/equipo`: las personas que usan el sistema. No: «usuarios» en la UI.
- **Rol** — `roles`: conjunto de permisos con nombre, creado por el dueño; `dueno` es de sistema.
- **Permiso** — `permisos` (clave `modulo.recurso.accion`): capacidad fija por código; se asigna, no se crea.
- **Concesión** — `roles_permisos`: un permiso dado a un rol, acotado a un origen y con alcance.
- **Alcance** — `alcance_permiso` (`propios` | `todos`): si el permiso aplica a lo propio (cartera/creado por mí) o a todo.
- **Dominancia** — `rol_dominado()`, `concesion_dominada()` / `entities/dominancia.ts`: nadie otorga, edita, asigna ni quita lo que no tiene.
  Sobre la persona, `persona_dominada()` / `personas_dominadas()`: nadie bloquea, da de baja ni cambia los roles de quien tiene permisos que él
  no cubre (el dueño sí).
- **Guardián** — `rbac_guardian()`: siempre queda alguien que opera y gestiona roles y personas; el rol dueño conserva los permisos de equipo.
- **Invitado** — `app_metadata.invitado` / `perfiles.invitado_en` / `invitarPersona()`: cuenta creada por alguien del equipo, con un rol,
  aunque el registro esté cerrado.
- **Invitación pendiente** — `EstadoPersona` `invitacion_pendiente` (`invitado_en` sin `invitacion_aceptada_en`): aún no eligió contraseña.
- **Perspectiva («ver como»)** — `permisos_efectivos()` / `usePerspectiva()` / cookie `perspectiva`: mirar la app con los permisos de otro rol.
- **Permisos efectivos** — `permisos_efectivos()` / `Sesion.permisos`: los propios ∩ los del rol de la perspectiva.
- **Bloquear** — `perfiles.bloqueado` / `equipo_bloquear`: impide operar sin perder nada.
- **Dar de baja** — `perfiles.activo = false` / `equipo_dar_de_baja`, `equipo_vista_previa_baja`: sale del equipo.
- **Baja en curso** — `equipo_bajas` (`terminada_en` nulo) / `_bajas_en_curso()`, `_baja_lote()`, job `equipo-bajas`: ya dada de baja.
- **Sesión** — `Sesion` / `mi_sesion()` / `requerirSesion()`: la persona del request: estado de la cuenta, perfil, roles reales, permisos
  efectivos y preferencias.
- **Estado de la cuenta** — `EstadoCuenta` (`activa` | `bloqueada` | `baja`): si puede operar; bloqueada o de baja no se queda adentro.
- **Perfil** — `perfiles` / `/perfil`: lo que cada persona edita de sí misma: nombre, foto y preferencias.
- **Preferencia** — `preferencias_usuario` / `Preferencias`: elección de interfaz por persona (densidad, tema), igual en todos sus dispositivos.
- **Zona de quien mira** — `preferencias_usuario.zona_horaria` / `useRegional().zonaDeLaPersona`: en qué zona ve cada persona las fechas de
  subasta (`/perfil` › «Zona horaria»); sin elegir, la de la empresa. Lo demás sigue en la zona de la empresa.
- **Hora del patio** — `zonaDelPatio()` / `<FechaDeSubasta>`: la hora de una subasta en la zona de su patio, estimada por el estado de la
  ubicación (`ubicacion_estado`); un estado con dos zonas toma la de la mayoría.
- **Densidad** — `useDensidad()` / `--fila` (`compacta` | `comoda`): altura de las filas; compacta con mouse, cómoda en táctil, o la elegida.
- **Aviso de acceso** — `?aviso=clave` / `AVISOS`: por qué alguien llegó redirigido a una pantalla de acceso; el texto sale del catálogo.
- **Aviso con acciones** — `AccionesDeUnAviso` / `resolverAcciones()`, `<AccionesDelAviso>`, `avisarError(error, { acciones })`: aviso de
  error, advertencia o bloqueo que ofrece ahí mismo de 1 a 3 salidas (ir, abrir un panel, reintentar, deshacer, recargar), filtradas por permiso.
- **Causa (de un error)** — `ErrorApp.causa`: clave estable de la regla que frenó (viaja en `hint`); de ella salen las acciones del aviso.
- **Canje** — `/auth/callback` / `canjearAcceso()`: convertir el código de Google o el enlace de un correo en una sesión.
- **Primer registro** — `ajustes_acceso().primer_registro`: aún no hay nadie en el equipo; la primera cuenta nace con el rol dueño.
- **Registro abierto** — `ajustes_empresa.registro_abierto`: si alguien puede crear cuenta solo; lo aplica un trigger en `auth.users`.
- **Empresa** — `ajustes_empresa` / `AjustesEmpresa`: fila única: marca, datos legales, país, formato regional, zona horaria, moneda base y
  políticas.
- **Color de la marca** — `ajustes_empresa.color_acento` / `tokensDeMarca()`: color primario; de él salen los `--color-primario*`.
- **Formato regional** — `ajustes_empresa.locale`: idioma y país (`es-BO`) con que `Intl` escribe números, montos y fechas.
- **Íconos de la app** — `ajustes_empresa.iconos` / `Iconos`, «Regenerar íconos»: ícono de pestaña y app instalada, desde el logo.
- **Retención** — `ajustes_empresa.papelera_dias`, `actividad_dias`: días que se conserva la papelera y el registro de actividad.
- **Moneda base** — `ajustes_empresa.moneda_base`, `monedas`: moneda en la que se guardan los montos (`monto_base`).
- **Moneda** — `monedas` / `Moneda`: moneda con la que trabaja la empresa (ISO, símbolo, decimales); no se borra, se desactiva.
- **Tipo de cambio** — `tipos_cambio` (clave: oficial, paralelo…) / `TipoCambio`: valor nombrado entre dos monedas; uno vigente por clave; se
  congela en cada cotización.
- **Tipo de cambio por defecto** — `tipos_cambio.es_default`: el que se usa entre dos monedas si no se elige otro; uno por par.
- **Historial de un tipo de cambio** — `tipos_cambio_historial` / `CambioDeValor`: de cuánto a cuánto, quién y cuándo; lo escribe un trigger.
- **Monto en moneda base** — `gastos.monto_base`, `pagos.monto_base` / `_monto_en_base()`: lo calcula la base con el tipo de cambio elegido
  (su valor queda en `tipo_cambio_aplicado`); quien carga nunca lo manda.
- **Prorratear** — `gastos_prorratear()` / `gastos.lote_id`: repartir un gasto entre 1 y 200 vehículos en partes iguales; los centavos que
  sobran van a los primeros y la suma es exacta. Un reparto es un lote; se hace desde el resumen de un grupo, con vista previa por unidad.
- **Sello (de un pago)** — `pagos.confirmado_por`, `pagos.confirmado_en` / `textoDelSello()`: quién confirmó y cuándo; lo pone
  `pago_confirmar()`, nadie lo edita; «Confirmado por <nombre> el <fecha>». Un error se corrige con `pago_anular()`, nunca se deshace.
- **Confirmar un pago** — `pago_confirmar()` / `logistica.pagos.confirmar`: acto aparte de registrarlo; confirmado ya no se edita ni elimina.
- **Anular un pago** — `pago_anular()` / `logistica.pagos.confirmar`: saca de la venta un pago confirmado (de un vehículo o de un proyecto de repuestos), con
  motivo y constancia `pago.anulado` en `actividad`; no vuelve ni deja sin cumplir lo que pide de pagos la fase actual del vehículo o de un ítem del proyecto.
  Eliminar es sólo para uno sin confirmar.
- **Comprobante de un gasto o pago** — `comprobante_ruta` de `gastos`, `pagos` y `repuestos_compras`, bucket `comprobantes` /
  `comprobante_puede()`: archivo que los respalda (`<unidad|proyecto>/<sha-256>.<ext>`); lo lee quien ve la fila (una compra, con
  `repuestos.costos.ver`). No es el **Comprobante** de venta.
- **Integración** — `integraciones` / `Integracion`, `integracionActiva()`: interruptor + config no secreta (apibara, push, web pública).
- **Secreto de una integración** — `integraciones.secreto_guardado_en` / `integracion_guardar_secreto()`: clave de API en Vault.
- **Origen** — `origenes`: de dónde viene un vehículo (subasta USA, China, oficina…); tipo subasta o manual.
- **Layout de campos** — `origenes_campos` / `leads_campos`: campos de un vehículo (o lead) y cómo se muestran, filtran y editan; motor
  `shared/lib/campos`.
- **Preconfiguración** — `origen_preconfigurar_campos()`: campos que nacen con el origen según su tipo (subasta/apibara o manual).
- **Categoría** — `categorias`: agrupación dentro de un origen (marca, segmento).
- **Sustantivo del origen** — `origenes.sustantivo`: cómo se llama lo que entra por ese origen («vehículo», «unidad», «lote»).
- **Género del sustantivo** — `origenes.genero` / `Genero`: para concordar sin texto fijo; lo sugiere `generoSugerido()` y se corrige.
- **Clave del origen** — `origenes.clave` / `claveDeNombre()`: identificador estable que sale del nombre al crearlo y no cambia.
- **Campo de fábrica** — `origenes_campos.es_sistema`, `leads_campos.es_sistema`: preconfigurado; no se elimina ni cambia de tipo o clave.
  «Sistema» nombra otra cosa (rol dueño).
- **Campo desactivado** — `origenes_campos.activo = false`: sale del formulario y filtros; sus datos siguen en `vehiculos.atributos`.
- **Campo principal** — `origenes_campos.principal`: identifica al vehículo en la lista, el resumen y logística; uno por origen como mucho,
  activo y no de monto; sin él, el título.
- **Rango (de un campo)** — `minimo`/`maximo` de `leads_campos` y `origenes_campos`, `_valor_fuera_de_rango()`: límites de un `numero` o
  `moneda` (nulo = sin límite); se rechaza el valor que cambia y queda fuera, no el que ya estaba. `*_campo_impacto().fuera_de_rango` los cuenta.
- **Valor por defecto de un campo** — `valor_defecto` / `valorDefectoPara()`, `valorDefectoVigente()`: lo que el alta trae puesto; sólo precarga.
- **Origen inactivo** — `origenes.activo = false`: no recibe vehículos ni cotizaciones nuevos; sus fichas se siguen viendo. Reversible.
- **Origen sin uso** — `motivoParaNoEliminar()` / `origen_eliminar()`: sin vehículos (papelera incluida), cotizaciones ni fórmula publicada.
- **Uso de un origen** — `origenes_resumen()` / `UsoDeOrigen`: vehículos, cotizaciones, campos, categorías, fases, ¿fórmula publicada? y
  concesiones.
- **Siguientes pasos** — `pasosDe()` / `<SiguientesPasos>`: lo que falta a un origen para funcionar (fases, fórmula, permisos, apibara).
- **Fórmula pendiente** — origen sin fila `publicada` en `formulas`: un origen nuevo no se cotiza hasta publicar la primera.
- **Vehículo** — `vehiculos`: el dato central; recorre el flujo de su origen.
- **Atributos** — `vehiculos.atributos`, `leads.atributos`: campos del layout que no son columna. En un lead se leen por `leads_vista`, recortados.
- **Dato común** — `camposComunes()` / columnas de `vehiculos`: lo que tiene todo vehículo y es columna (título, marca, año, VIN, precio…).
- **Sin fase** — `vehiculos.fase_id` nulo / `<BadgeDeFase>`: aún no entró al flujo de su origen; lo ubica quien mueve.
- **Inventario** — `/vehiculos` / `<ListadoDeVehiculos>`: listado de vehículos, una pestaña por origen; con «propios» se lee por
  `vehiculos_inventario()` (por rutas, filtros en SQL), con «todos» por PostgREST (`fuenteDelInventario()`).
- **Lote (de mover)** — `cambiar_fase_lote()` / `<DrawerDelLote>`, `?panel=lote`: 1 a 200 vehículos de una fase movidos a otra con nota
  común, cada uno por sí mismo (resultado parcial). No es el «lote de papelera» ni el «lote de subasta».
- **Lote de subasta** — `vehiculos.lote` + `plataforma`: identificador en la subasta (Copart/IAAI). No es el lote de papelera.
- **Foto** — `vehiculos_imagenes` / `Foto`, `<SeccionDeFotos>`: una imagen de un vehículo (hasta 24).
- **Visor de imágenes** — `<CarruselEnElLugar>`, `useVisorDeGaleria()`, `?visor=<clave>&foto=<n>`: las fotos de una entidad en grande,
  con flechas, ← →, «3 de 12» y miniaturas; en su lugar, la portada y, al acercarse, el resto (una sola lectura).
- **Alta suelta** — `vehiculo_crear(…, 'suelto')`, `vehiculos.crear`: dar de alta un vehículo desde el inventario (`/vehiculos`, «Nuevo», `N`) o por
  importación. **Alta desde cotizar** — `vehiculo_crear(…, 'cotizar')`, `vehiculos.crear.desde_cotizar`: desde la hoja de cotizar («+» y «Traer»
  del panel del vehículo). Cada una, su permiso por origen; `vehiculos.creado_desde` dice cuál fue.
- **Portada** — `vehiculos_imagenes.es_portada` / `vehiculo_foto_portada()`: la foto principal, una sola.
- **Miniatura** — `vehiculos_imagenes.ruta_miniatura` / `<Miniatura>`: la versión chica de una foto (≤ 480 px).
- **Hash** — `hashDe()` / `vehiculos_imagenes.hash`: SHA-256 de un contenido; es el nombre del objeto en Storage (nunca cambia).
- **Refcount** — `storage_refcount(bucket, ruta)`: cuántas filas referencian un objeto; sólo se borra con 0, contado bajo candado.
- **Cola de limpieza** — `cola_gc_storage` / `storage_gc_reclamar()`, `storage_gc_confirmar()`: objetos de Storage quizá sin uso.
- **Bandeja de subida** — `reducirBandeja()` / `<BandejaDeSubida>`: lo elegido para subir que aún no es foto; nada toca Storage hasta confirmar.
- **Interesado** — `vehiculos_interesados` / `vehiculo_interesado_marcar()`, `vehiculo_interesado_quitar()`: lead interesado en un vehículo
  (N:M), nota ≤ 500.
- **Vínculo** — `vehiculos.lead_id` + `vehiculos_vinculos` / `vehiculo_vincular()`: lead dueño o comprador actual, uno a la vez, con historial.
- **Vincular / Desvincular** — `vehiculo_vincular(p_vehiculo, p_actualizado_en_esperado, p_lead)` (nulo desvincula): con la versión del vehículo.
- **Vehículos del lead** — `lead_vehiculos()`, `<SeccionVehiculosDelLead>`, `?seccion=vehiculos`: vinculados, interesados y anteriores, sólo
  lo visible.
- **Agregar vehículo** — `vehiculos_para_lead()`, `?panel=agregar-vehiculo`: buscar entre los vehículos visibles para vincular uno o marcar
  interés desde el lead.
- **Vehículo de una nota** — `seguimientos.vehiculo_id`, `recordatorios.vehiculo_id`: vehículo opcional del lead que quien escribe ve.
- **Carreras** — `pnpm db:carreras` (`scripts/carreras.mjs`): prueba de concurrencia con dos conexiones reales a la base local sobre el mismo
  lead o vehículo.
- **Causa de bloqueo** — `_vehiculo_bloqueo()` / `CAUSAS_DE_BLOQUEO`: por qué un vehículo no va a la papelera (`vinculado`, `fase`,
  `comprobante`, `final`, `documentos`, `pagos`, `aduana`, `repuestos`; `cotizacion_papelera` sólo frena una purga).
- **Publicado** — `vehiculos.publicado_web` / `vehiculo_vitrina()`: quien tiene `vehiculos.vitrina` decidió que salga en la web. Condición,
  no garantía.
- **En vitrina** — `interno.vitrina_vehiculos.visible` / `web.vehiculos`, `vitrina_del_origen()`: se ve hoy en la web: publicado, fuera de
  papelera, fase que publica, origen activo y visible, integración web activa.
- **Vitrina** — `web.vehiculos` / `vehiculo_vitrina_previa()`: lo que la web muestra: identidad, precio público, campos públicos y portada.
- **Revalidar (la web pública)** — `interno.web_revalidar_pendiente`, `web_revalidar_correr()`, job `web-revalidar`: avisar al sitio, una vez
  por minuto y por etiqueta (`guias`, `faqs`, `testimonios`, `ajustes`, `asesores`, `vehiculos`), que algo cambió. Dirección en
  `integraciones.config.revalidar_url`; secreto en Vault (`integracion:web_publica`).
- **Precio público** — `vehiculos.precio_web` / `precio_web_hasta`: lo que muestra la web; NULL = «Consultar».
- **Papelera** — `lotes_papelera`, `eliminado_en` / `vehiculos_papelera_*`, `leads_papelera_*`, `cotizaciones_papelera_*` (y la genérica
  `papelera_*`, sólo de cotizaciones): borrado reversible hasta la purga.
- **Lote de papelera** — `lotes_papelera` / `LoteDePapelera`: envío de 1 a 200 a la papelera; se restaura o purga entero o por partes.
- **Purga** — `vehiculos_papelera_purgar()`, `cotizaciones_papelera_purgar()`, `papelera_purgar()`, `papelera_purgar_vencidos()`: borrar para
  siempre, a mano (`vehiculos|leads|cotizaciones.papelera.purgar`, cada papelera la suya) o a los `papelera_dias`; lo que otra tabla necesita
  (un pago, un comprobante, una cotización de la papelera que lo nombra) queda bloqueado, con motivo, en la papelera.
- **Limpieza de Storage** — `cola_gc_storage` / función `storage-gc`, `storage_gc_*()`: borrar lo que nadie referencia; job cada hora.
- **Pase** — `cola_gc_pases` / `storage_gc_disparar()`, `storage_gc_abrir()`; `push_pases` / `push_disparar()`, `push_abrir()`;
  `importaciones_pases` / `importacion_pase_emitir()`, `importacion_abrir()`: uuid de un solo uso (10 min) con que la base autentica su llamada
  a una función edge (`storage-gc`; `push`, atado a una notificación; `importar-csv`, atado a una importación total).
- **Restaurar** — `vehiculos_papelera_restaurar()`: vuelve al inventario sin publicar; lo que choca con un VIN o lote tomado queda pendiente,
  con motivo. `cotizaciones_papelera_restaurar()`: lo que choca con otra viva (versión nueva, final del vehículo) o cuelga de un vehículo o
  cliente en la papelera queda pendiente, con motivo.
- **Lead** — `leads` / `leads_vista`: prospecto o cliente; el teléfono principal lo identifica.
- **Origen del lead** — `origenes_lead` / `origen_lead_crear()`, `OrigenDeLeadConUso`: de dónde llegó (Facebook, referido…).
- **Origen del lead desactivado** — `origenes_lead.activo = false`: con leads no se elimina, se desactiva.
- **Tipo de lead** — `tipos_lead` / `tipo_lead_crear()`, `leads.tipo_lead_id`, `TipoDeLeadConUso`: qué es cada lead (Prospecto, Cliente, los
  que agregue), de una clase fija. No: el enum `tipo_lead`.
- **Clase (de un tipo de lead)** — `tipos_lead.clase` (`clase_tipo_lead`), `ClaseDeTipoDeLead`: «Prospecto» o «Cliente»; no cambia. El sistema
  razona por clase, nunca por nombre ni clave.
- **Tipo de lead desactivado** — `tipos_lead.activo = false`: como el origen del lead; el último activo de su clase no se desactiva.
- **Tipo de seguimiento** — `tipos_seguimiento` / `tipo_seguimiento_crear()`, `TipoDeSeguimientoConUso`: cómo se contactó (Llamada, WhatsApp…).
  El sistema no razona por nombre ni clave.
- **Icono (del catálogo)** — `icono` en `origenes_lead`, `tipos_lead`, `tipos_seguimiento`; `CLAVES_DE_ICONO`, `<IconoDelCatalogo>`: catálogo
  cerrado de 24 (`src/shared/lib/iconos.ts`).
- **Origen del lead por defecto** — `origenes_lead.por_defecto`, `origen_lead_guardar(… {por_defecto})`, `origen_por_defecto_id`: el que
  propone el alta.
- **Teléfono principal** — `leads.telefono_principal` / `telefono_lead()`: único entre leads vivos; completo sólo para la cartera.
- **Campo de lead** — `leads_campos` / `CampoDeLead`: dato configurable de los leads (además de nombre, teléfono, tipo y origen, fijos).
- **Layout de leads** — `leads_campos` / `leerLayoutDeLeads()`: campos de los leads con orden, grupo, requeridos, filtros, columnas y quién
  los ve.
- **Privado de cartera** — `leads_campos.solo_cartera` / `atributos_lead()`: campo que sólo recibe quien tiene el lead en su cartera (correo y
  documento nacen así).
- **Atributos públicos** — `leads.atributos_publicos` / `leads_vista.atributos_publicos`: los atributos sin los privados, por trigger.
- **Cambio de privacidad pendiente** — `leads_campos.solo_cartera_pendiente` / `CampoDeLead.privacidadPendiente`: campo que cambia de
  privacidad por lotes: «Pasando a privado/público».
- **En la tabla** — `leads_campos.en_tabla`: campo que sale como columna del listado de leads.
- **Valor de la empresa** — `leads_campos.valor_defecto_empresa`: «la ciudad (o país) de la empresa» como valor por defecto de un texto.
- **Cartera** — `leads_asesores` (fuente) / `leads.cartera` (copia por trigger): quién tiene acceso a un lead (dueño, compartido, adoptado);
  vacía = limbo.
- **Cartera corta** — `leads_cartera_corta()` / `leerMiosDeLaCartera()`: cartera de ≤ 5.000 filas (`_leads_cartera_corta_tope()`).
- **Limbo** — `lead_en_limbo()` / `_leads_al_limbo_de()`: lead sin asesores vigentes; invisible hasta que alguien lo toma al registrar su teléfono.
- **Adoptar** — `crear_lead()` con `adoptar` / «Tomar lead»: tomar un lead del limbo al registrar su teléfono.
- **Alta rápida** — `crear_lead()` / `<AltaDeLead>`: alta con primer seguimiento y recordatorio opcional desde cualquier pantalla («Nuevo
  lead» o `N`), en una transacción.
- **Widget** — `WIDGETS_TABLERO` / `widgetsVisibles()`: tarjeta de `/tablero` con su clave, permisos y grupo de RPC; la persona los oculta y
  ordena en «Personalizar» (preferencia `tablero.widgets`). En Inicio se llama «bloque».
- **Más datos** — `camposDelAlta()` / `<BloqueDeCampos>`: bloque plegado del alta con los campos no requeridos, ya precargados.
- **Primer seguimiento** — `crear_lead()` (`p_seguimiento`): el que se anota al dar de alta: tipo, resumen y recordatorio opcional.
- **En cartera** — `leads_vista.en_cartera` (de `leads.cartera`) / `en_cartera()`: el lead está en la cartera de quien mira; da el teléfono
  completo y los privados.
- **Lectura por la cartera** — `leads_cartera_vista` / `fuenteDelListado()`, `leads_asesores.lead_creado_en`, `leads_asesores_listado_idx`:
  «míos» de quien tiene «propios», leído por su cartera.
- **Reciente (de un lead)** — `leads_asesores.lead_reciente_en` (copia en toda fila de la cartera, también revocadas), `reciente_en` de
  `leads_vista` y `leads_cartera_vista`: `coalesce(ultimo_seguimiento_en, creado_en)`; ordena «míos» del panel del cliente. No: «actividad».
- **Candidatos de la búsqueda** — `leads_candidatos()`, `leads_vista_por_ids()`, `leads_busqueda_idx` / `entities/candidatos.ts`: primeros
  leads que coinciden con un nombre, sacados de un índice.
- **Buscador** — `buscador_leads()`, `buscador_vehiculos()`, `buscador_cotizaciones()` / `src/modules/buscador`: búsqueda por sección con el
  mínimo en la base y tope 5 por sección; la dibuja la paleta.
- **Paleta** — `<Paleta>`, `AccionDeLaPaleta` / `src/modules/buscador`: superposición `Ctrl/Cmd+K` que busca y ejecuta acciones; sin URL; sus
  acciones se ofrecen con `puede()`.
- **Visto** — `vistos` / `visto_registrar()`, `vistos_de()`, `ProveedorDeMarcasDeVisto`: un registro que la persona abrió (ficha o resumen) en
  _ese_ módulo; su fila se apaga como un enlace visitado. Por persona; se recuerda 7, 30, 90 o 365 días (`/perfil` › «Vistos»).
- **Último visto** — `vistos_de().ultimo` / `<SufijoDeVisto>`: el registro que la persona abrió por última vez en un módulo; borde de acento y
  «Último visto» junto al nombre.
- **Últimos abiertos** — `visitados` / `visita_registrar()`, `visitados_usuario_visto_idx`: lo último que cada persona abrió (lead, vehículo o
  cotización), a lo sumo 50; se lee bajo la RLS de cada entidad.
- **Míos / Todos** — `?alcance=todos` / `alcanceDelListado()`, `<SelectorDeAlcance>`: modos del listado de leads; «míos» (defecto) = `en_cartera`.
- **Mías** (cotizaciones) — `p_mias` de `cotizaciones_listado()`, `PedidoDelListado.mias`: las que creó quien mira (`creado_por`). No es «Míos».
- **Enmascarado** — `enmascarar_telefono()` / `telefono_lead()`: teléfono fuera de tu cartera: 3 primeros y 2 últimos dígitos («591•••••01»).
- **País del teléfono** — `paisDelNumero()` / `TABLA_DE_PAISES`: país del código de llamada, calculado en el navegador.
- **Ítems por página** — `listas.por_pagina`, `tamanoDePagina()`, `?por=`: 10, 25, 50 o 100 por cuenta; cada lista tiene un máximo (leads 50,
  vehículos 100).
- **Número propio** — `leads.numero_propio` / `leads_numeros_propios`, `NumerosDeLead.numeroPropio`: consecutivo por creador (desde 1): «Tu
  n.º 12». Se busca con `12` o `#12`.
- **Número global** — `leads.numero` / `leads_numeros_globales`, `leads.numero_global.ver`, `NumerosDeLead.numero`: consecutivo de la empresa
  («N.º 1.234»); nulo sin el permiso.
- **Resumen** — `?lead=`, `?vehiculo=`, `?cotizacion=` / `<DrawerDeLead>`, `<ResumenDeVehiculo>`, `<ResumenDeCotizacion>`: vistazo sin salir
  de la lista («drawer rápido» en el código).
- **Patrón de lista** — `@/shared/ui/lista` (`<UnaSolaVista>`, `<FilaDeLista>`, `<MasAcciones>`…): tabla o tarjetas, nombre a la izquierda,
  «⋯» a la derecha.
- **Vista de la lista** — `VistaDeLista` (`tabla` | `tarjetas`), `?vista=`, `<ConmutadorDeVista>`: cómo se ve una lista en escritorio; en el
  inventario la recuerda `vehiculos.vista`. Por debajo de 768 px siempre tarjetas. No es una «Vista guardada».
- **Vuelta del foco** — `abrirConVuelta()`, `useVueltaDelFoco()` (`src/shared/ui/vuelta-del-foco.ts`): tras recargar con un panel por URL,
  «atrás» devuelve el foco a quien lo abrió (desde un menú, al botón del menú).
- **Más acciones («⋯»)** — `<MasAcciones>` / `accionesDeLead()`, `accionesDeVehiculo()`: menú de fila, tarjeta, resumen o ficha.
- **Filtro descartado** — `filtrosDescartados()` / `<AvisoDeFiltrosDescartados>`: filtro de la URL sobre un campo desactivado o eliminado.
- **Ficha del lead** — `/leads/[id]` / `lead_ficha()`, `<FichaDeLead>`: cabecera, «Datos», edición en `?panel=editar-lead`.
- **Teléfono extra** — `leads_telefonos` / `lead_telefonos()`, `lead_telefono_guardar()`, `lead_telefono_quitar()`: número alterno con
  etiqueta opcional.
- **«Anterior»** — `leads_telefonos.etiqueta` / `ETIQUETA_DEL_ANTERIOR`: etiqueta del principal reemplazado, que queda como teléfono extra.
- **Cambiar teléfono principal** — `cambiar_telefono_lead()` / `?panel=cambiar-telefono`, `<PanelDeTelefono>`: sólo la cartera, con la
  versión del lead.
- **Teléfono extra de otro lead** — `_lead_verificar().alterno` / `Verificacion.libre.alterno`: aviso, sin bloquear, de que un número libre es
  extra de otro lead.
- **Versión del lead** — `leads.actualizado_en` / `lead_version()`: lo que la ficha manda al guardar para detectar cambio ajeno.
- **Código de país** — `ajustes_empresa.telefono_cc` / `normalizarTelefono()`: prefijo que completa un teléfono sin «+» ni «00».
- **Compartir / Transferir** — `lead_compartir()`, `lead_transferir(p_dueno_esperado)`: dar acceso / pasar el lead (el saliente queda
  compartido); nadie se lo da a sí mismo.
- **Quién lo tiene** — `lead_cartera()` / `<BloqueDeCartera>`: nombres y tipo de acceso; nunca correo ni teléfono.
- **Quitar acceso** — `lead_revocar_acceso()`: sacar a un compartido de la cartera; al dueño no, se transfiere. Ofrece «Deshacer».
- **Salir de este lead** — `lead_salir()` / `ETIQUETA_DE_SALIR`: un compartido se quita a sí mismo.
- **Supervisión** — `leads.compartir` / `leads.transferir` en «todos»: mueve la cartera de leads ajenos sin tenerlos; no ve teléfono ni privados.
- **Papelera de leads** — `leads_papelera_*`, `/leads/papelera`: borrado reversible por lote, todo o nada; revoca el portal.
- **Seguimiento** — `seguimientos`, `tipos_seguimiento` / `seguimiento_*()`, `lead_seguimientos()`: contacto con el lead; nace privado; sólo
  su autor lo edita.
- **Recordatorio** — `recordatorios` / `recordatorio_*()`, `recordatorios_vista`: aviso personal con fecha y hora; sólo su dueño lo ve y toca.
- **Próximo contacto** — `recordatorio_crear()` / `p_recordatorio` de `seguimiento_crear()` y `crear_lead()`: el que nace con un seguimiento.
- **Visible para el cliente** — `seguimientos.visibilidad = 'publico'` / `ETIQUETA_DE_VISIBLE`: lo ven quienes ven el lead y el portal;
  apagado, sólo el autor. La UI no dice «portal».
- **Detalle de un seguimiento** — `seguimientos.detalle_doc` / `_seguimiento_detalle()`, `validarDocumento()`: JSON de ProseMirror (nunca
  HTML) validado.
- **Co-asesor** — `leads_asesores` (`tipo_acceso = 'compartido'`): quien comparte un lead con su dueño.
- **Recordatorio vencido** — `lead_ficha().recordatorios_vencidos` / `estadoDelRecordatorio()`: propio, con hora pasada y sin completar.
- **Marca** — `MarcasDeLead` / `leads_vista.es_favorito`, `esta_tachado`, `etiquetas`: favorito, tachado y etiquetas que una persona pone a
  un lead; privadas.
- **Etiqueta** — `etiquetas`, `leads_etiquetas` / `etiqueta_*()`, `lead_etiquetas_poner()`: marca con nombre y color, privada (hasta 50; 20
  por lead).
- **Color de etiqueta** — `etiquetas.color` / `CLAVES_DE_COLOR`, `--etiqueta-<clave>`: uno de ocho de la paleta cerrada, guardado como clave.
- **Favorito / Tachado** — `leads_favoritos`, `leads_tachados` / `lead_favorito_poner()`, `lead_tachado_poner()`: marcas por persona; no
  reordenan. Una cotización también se marca favorita (`cotizaciones_favoritos` / `cotizacion_favorito_poner()`).
- **Tus marcas** — `SECCION_MARCAS` / `filtrosDeMarcas()`: sección de arriba del panel de filtros («Solo las ves tú»).
- **Tachados ocultos** — `?tachados=` (`ocultar` · `incluir` · `solo`) / `ocultaTachados()`, `ocultos`: el listado oculta lo tachado y avisa
  cuántos, con «Mostrarlos».
- **Gestionar etiquetas** — `?panel=etiquetas` / `<DialogoDeEtiquetas>`: crear, renombrar, recolorear y eliminar las propias.
- **Embudo / Etapa / Oportunidad** — `embudos`, `embudos_etapas`, `oportunidades` / `embudo_*`, `oportunidad_*`: embudo personal de 3 a 12
  etapas (inicial, ganada, perdida).
- **Oportunidad base** — `_lead_oportunidad_base()`: la que nace con todo lead nuevo (alta rápida, importación, «Datos», turno de la web), abierta,
  en la etapa inicial del embudo por defecto de quien lo crea y con el nombre del lead de título. Intacta, no cuenta como trabajo al deshacer.
- **Embudo por defecto** — `embudos.es_default` / `embudo_por_defecto()`: el creado la primera vez («Ventas»); no se elimina, se renombra.
- **Plantilla del embudo** — `ajustes_leads.embudo_etapas` / `embudo_plantilla_guardar()`: etapas con que nace el embudo por defecto de cada
  persona; nula = las seis de fábrica (`_embudo_etapas_de_fabrica()`). Sólo afecta a los que nacen después.
- **Mover a…** — `oportunidad_mover()` / `<MenuMoverA>`: cambiar de etapa desde un menú; ganada o perdida cierra, abierta reabre.
- **Motivo de pérdida** — `oportunidades.motivo_perdida`: opcional, hasta 200, al mover a perdida; se limpia al reabrir.
- **Vista de embudo** — `/leads?vista=embudo` / `<VistaDeEmbudo>`: kanban de tus oportunidades en un embudo; los filtros de la lista no aplican.
- **Portal del cliente** — `accesos_portal` / `web.portal_*` / `?seccion=portal`: lo que el cliente ve en la web con código y clave: sus
  vehículos, lo «Visible para el cliente» y novedades.
- **Mensaje del portal** — `ajustes_leads.portal_mensaje` / `portal_mensaje_guardar()`: texto para WhatsApp al dar acceso, con `{cliente}`,
  `{empresa}`, `{codigo}`, `{clave}` y `{direccion}`; nulo = el de fábrica.
- **Ajustes de leads** — `ajustes_leads` / `ajustes_leads_leer()`: fila única con las plantillas de leads (embudo y mensaje del portal), cada
  una con su versión.
- **Código del portal** — `accesos_portal.codigo` / `codigoDictado()`: `XXX-YYYYY`: prefijo de la empresa y cinco símbolos sin I, O, 0 ni 1.
- **Clave temporal** — `otorgar_portal(p_clave)`: la da el equipo al otorgar (8 a 64 o generada).
- **Dar acceso / Volver a otorgar** — `otorgar_portal`: volver a otorgar cambia código y clave; los anteriores y la sesión abierta dejan de valer.
- **Revocar (el acceso)** — `revocar_portal`: el código deja de valer y la sesión se corta; irreversible, se da uno nuevo.
- **Desbloquear** — `portal_desbloquear`: limpiar el bloqueo de 15 minutos que dejan cinco intentos fallidos.
- **Límite por IP (del portal)** — `interno.portal_intentos` / `web.portal_intento()`: 10 intentos por IP cada 15 minutos; la IP se guarda
  sólo como **huella** (HMAC con la sal `portal:sal`).
- **Versión del acceso** — `accesos_portal.otorgado_en`: da conflicto en «Volver a otorgar» y vence la sesión del portal.
- **Sesión del portal** — cookie `portal` / `SesionDelPortal`, `firmarSesionDelPortal()`, `leerSesionDelPortal()`: HMAC-SHA256
  (`PORTAL_COOKIE_SECRETO`), 7 días; lleva `lead_id` y `otorgado_en` y deja de valer al volver a otorgar o revocar.
- **Novedades** — `web.portal_snapshot().novedades`: lo «Visible para el cliente» sin vehículo suyo; las 30 más nuevas.
- **Dirección de la web** — `ajustes_web.direccion_publica` / `leerDireccionPublica()`: la dirección pública del sitio.
- **Cotización** — `cotizaciones`: cálculo de una fórmula para un lead/vehículo, con snapshot.
- **Preventa / Final** — `clase_cotizacion`: borrador comercial / la que cierra el vehículo (una activa por vehículo).
- **Papelera de cotizaciones** — `cotizaciones_papelera_*`, `cotizaciones.papelera.purgar`, `/cotizaciones/papelera`: borrado reversible por
  lote, con versión; mandar una pide verla y poder guardarla (una final, `cotizaciones.final.gestionar`). Las que se fueron con su vehículo
  están en la papelera de vehículos. La purga automática también la vacía.
- **Última cotización (de un vehículo)** — `vehiculos.cotizado_en`, `_vehiculo_cotizado()`: ordena «Últ. cotización» del panel del vehículo.
  Cotizar no edita el vehículo.
- **Historial de cotizaciones (de un vehículo)** — `<HistorialDelVehiculo>` (`cotizaciones/features/historial`): las visibles por
  `vehiculo_id`, de la más nueva, de a 20; plegado en el panel del vehículo, y la misma lista en la ficha del vehículo
  (`<CotizacionesDelVehiculo>`) y del lead (`<CotizacionesDelLead>`, por `lead_id`). **Cotizado (n)**: `contarCotizacionesDelVehiculo()`.
- **Panel del vehículo** — `?panel=vehiculo` de `/cotizaciones/nuevo`, `<BarraDelVehiculo>` / `PanelDelVehiculo`
  (`vehiculos/features/panel-para-cotizar`): elige el vehículo por «Últ. cotización» o «Cierre subasta» (`?lista=ultima|cierre`) o buscando
  nombre, VIN o lote (`?buscar=`); «+» y «Traer» abren el alta del inventario en el panel (`?alta=mano|subasta`).
- **Panel del cliente** — `?panel=cliente` de `/cotizaciones/nuevo`, `<BarraDelCliente>` / `PanelDelCliente` (`leads/features/panel-para-cotizar`):
  elige el lead entre «míos» por reciente, por clase (`?clase=`) o buscando nombre o `#n` (`?buscar=`); su «+» abre el alta del shell con
  `?elegir=<clave>` (`claveParaElegir()`) y la hoja elige al creado.
- **Fórmula** — `formulas` (`definicion`, `params`): grafo de nodos versionado por origen; ver `docs/COTIZADOR.md`.
- **Nodo** — `definicion.nodos[]`: una línea de la fórmula: input, constante, tipo de cambio, campo, bandera, tabla, tramo, cálculo.
- **Constante** — nodo `constante` + `params`: valor por defecto versionado que el ⚙ de la XCell cambia.
- **Versión del flujo** — `flujos.actualizado_en` como texto ISO: la lee la pantalla de Flujos y la devuelve cada escritura para detectar
  cambio ajeno (`PT409`); `useVersionDelFlujo()` la entrega a las acciones.
- **Inspector de fase** — panel `?fase=<id>` de Configuración › Flujos: «Datos», «Salidas y quién mueve» y «Requisitos para entrar» de una fase.
- **Versión de la fórmula** — `formulas.version`: número de una publicada o archivada, por origen (el borrador no tiene).
- **Borrador de la fórmula** — `formulas.estado = 'borrador'`: a lo sumo uno por origen, sin número; lo publicado no cambia hasta publicarlo.
  «Descartar…» (`<Confirmar>`) no se deshace. No es la «Pregunta al descartar» ni el «Borrador» de un formulario (`useBorrador()`).
- **Versión de origen** — `formulas.version_origen_id`: en un borrador, la publicada sobre la que se empezó (si ya no lo es, publicar da
  PT409); en una publicada o archivada, la que reemplazó.
- **Revertir la fórmula** — `formula_revertir()`: publica la N+1 como copia (con su diseño) de una archivada; no es el ↺ de la XCell.
- **Bucket** — `definicion.buckets` (nombre → nodo `tipo_cambio`), `grupos[].bucket`: papel del dinero (pagado afuera, en aduana) y el tipo de
  cambio que lo convierte.
- **Snapshot** — `cotizaciones.valores`, `fuentes`, `tipos_cambio`: todo lo que el cálculo usó.
- **XCell** — `src/shared/ui/xcell`: celda numérica editable del cotizador: valor, default, revertir, ayuda, ⚙, sugerido, teclado.
- **Modo Live** — `useLive()` / `<Monto>`: oculta cifras y símbolos de moneda en toda la app.
- **Tabla de referencia** — `tablas_referencia`, `_filas`: alimentan nodos tabla/tramo (impuestos, tramos, tarifas, depreciación).
- **Publicar una tabla de referencia** — `tabla_referencia_publicar()`: reemplaza sus filas, sube `tablas_referencia.version` y publica la
  N+1 de cada fórmula que la usa con la copia congelada.
- **Tabla compartida** — tabla de referencia con `origen_id` nulo: la usan los orígenes sin una propia de esa clave; la propia la **tapa** (va
  `tapada` en la lista de ese origen). Publicarla pide `cotizaciones.configurar` en cada origen que la usa.
- **Plantilla de tarjeta** — `plantillas_tarjeta`: cómo se ve la cotización (tarjeta y PDF), versionada aparte; declarativa (grupos con tono,
  etiquetas y leyendas por nodo, total, nota, logo, columnas) y validada por `validar_plantilla()`.
- **Lectura de la tarjeta** — `cotizacion_tarjeta()`: lo que dibujan la tarjeta y el PDF de una versión, con la plantilla publicada validada
  contra esa versión y sólo lo del nivel «todos». No es la **Tarjeta del total**.
- **Tarjeta por omisión** — `{estado: 'sin_plantilla'}` de `cotizacion_tarjeta()`: la plantilla no le sirve a esa versión y la tarjeta muestra
  sólo el total (encabezado, vehículo, logo; sin filas ni lo aparte, que podría ser de un nivel restringido).
- **Vista previa** — `?panel=vista-previa`, `<VistaPreviaDeLaHoja>`: modal con la tarjeta (`<TarjetaDeCotizacion>`, `modeloDeLaTarjeta()`)
  como la vería el cliente; en una guardada, lo guardado.
- **PDF de la cotización** — `GET /cotizaciones/<id>/pdf`, `pdfDeUnaGuardada()`: la tarjeta de lo guardado en A4; lo descarga quien la ve
  («Descargar PDF», junto a «Copiar texto»). No es «Compartir» (eso es de leads).
- **Revisión** — `cotizaciones_revisiones`: diff de cada edición.
- **Reporte** — `cotizaciones_reportes` / `cotizacion_reportar()`, `cotizacion_reporte_retirar()`: marca de problema, uno por persona, con
  motivo; no cambia estado ni versión. «Reportada» = activa con reportes (el valor `reportada` del enum no se usa).
- **Moderar** — `cotizacion_moderar()` (`cotizaciones.moderar`): «Invalidar» (`invalida`, conserva los reportes), «Descartar los reportes»
  (`activa`) o «Reactivar» una inválida (`activa`, borra sus reportes); pide verla y la versión, y en una final `cotizaciones.final.gestionar`
  del origen. Quien modera también borra comentarios y quita adjuntos ajenos.
- **Comentario / Respuesta** — `cotizaciones_comentarios` (`padre_id`) / `cotizacion_comentarios()`, `cotizacion_comentar()`: lo escribe quien
  ve la cotización; un nivel (la respuesta a una respuesta cuelga de su raíz). Raíz borrada con respuestas: «Comentario eliminado.»; respuesta
  o raíz sola se quitan.
- **Adjunto** — `cotizaciones_adjuntos` / `cotizacion_adjuntar()`, `cotizacion_adjunto_quitar()`: archivo del bucket `cotizaciones`; lo sube
  quien puede guardarla (`cotizacion_puede_adjuntar()`), hasta 20.
- **Comprobante** — `comprobantes`, `comprobantes_contadores`: comprobante de venta interno de una final activa, numeración sin huecos; congela
  en `datos` sólo lo del nivel «todos»; se anula, no se borra.
- **Comprobante vigente** — sin anular (`anulado_en is null`): a lo sumo uno por cotización (`comprobantes_un_vigente_por_cotizacion`); para
  emitir otro se anula el vigente; con uno vigente no se marca otra final del vehículo.
- **Tipo de cambio oficial / paralelo** — `tipos_cambio.clave` (`oficial`, `paralelo`): TCO y TCP; cada fila o grupo elige el suyo.
- **Modo de tipo de cambio** — `diseno.cabecera.modos[]` / `cotizaciones.modo_tc`: nombre (Aduana, Paralelo, Unificado…) y qué tipo de cambio
  llena cada bucket. La hoja abre con el marcado (`Entradas.modoTc`); con uno solo no se elige y el resumen lo nombra.
- **Grupo (de la hoja)** — `definicion.grupos[]` / `nodo.grupo`: filas con bucket, plazo de pago y tono, con subtotal en USD y Bs. No es un nodo.
- **Plazo de pago** — atributo del grupo: cuándo se paga, como texto («2 días», «4 meses (Aprox.)»).
- **Total en dólares** — `definicion.total_en`; en el motor `totales.usd` (y `totales.suma_usd`): total en Bs ÷ tipo de cambio de `total_en`.
- **Faltante** — `Resultado.faltantes`, `CODIGOS_DE_FALTANTE` (`entities/motor-contexto.ts`): por qué un valor quedó sin número.
- **Entrada del motor** — `Entrada`, `esquemaEntrada` (`entities/motor-entrada.ts`): lo que el motor recibe además de la fórmula: inputs,
  banderas, tipos de cambio, campos del vehículo, tablas.
- **Entradas de la persona** — `p_entradas` de `cotizacion_evaluar()`: `inputs`, `banderas`, `overrides` y `variante`.
- **Valor sugerido / modificado** — `cotizaciones.fuentes` (`sugerido` / `override`), `sobrescribible`: sugerido lo propone tabla, tramo o
  cálculo; modificado lo sobrescribió el asesor. No: `lookup`.
- **Par porcentaje-monto** — `calculo porcentaje_de` `sobrescribible` y su `pct`: celda editable por monto o %; manda el monto si se sobrescribió.
- **Fórmula como texto** — `compilarExpresion()` (`entities/compilador.ts`): `=(remate+fees)*4%`, `=SUMA(aduana)`; se compila a nodos.
- **Nodo auxiliar** — `<fila>__<n>` en `compilarExpresion()`: cada operación anidada o número de una fórmula como texto, numerado en
  post-orden; cuáles lo son, `auxiliaresDe()` (`compilador-auxiliares.ts`). La constante auxiliar no pide celda en el diseño.
- **Fila (de la fórmula)** — `Fila`, `filasDe()` (`entities/formula/filas.ts`): un nodo que no es auxiliar de otro, con sus auxiliares y su
  `texto`; una línea del editor.
- **Editor de la fórmula** — `EditorDeLaFormula` (`features/formula/components/editor/`), `?panel=editar-formula`: donde se escriben en texto
  las filas de la fórmula de un origen, sobre el borrador o la publicada; compila cada fila al aplicar.
- **Cifras de prueba** — `calcularLaVistaPrevia()`, «Vista previa» del editor: `evaluar()` con datos en 0, opciones apagadas, variante por
  defecto, tipos de cambio de hoy y tablas vivas; no se guarda.
- **Texto vigente** — `textoVigente()` (`entities/formula/texto-vigente.ts`): el texto de una fila con el valor del ⚙ de una constante escrito
  en su lugar (`al_dia`, `reescrito`) o «el texto ya no manda» (`no_manda`).
- **Tramo (de un error de texto)** — `Tramo`, `ErrorDeCompilacion` (`entities/motivos-del-compilador.ts`): dónde está el error (`desde`,
  `largo`; `linea`, `columna`).
- **Vigencia** — `ajustes_empresa.vigencia_dias` (7 por defecto, de 1 a 365): días que vale una cotización desde el día de su `creado_en`
  (ver «Ajustes de cotización»).
- **Vencida** — derivada: `creado_en` + vigencia < hoy, por día en la zona de la empresa (`vence_el`, `vencida` de
  `cotizacion_hoja_guardada()`). No es un estado guardado.
- **Cotizar encima (N+1)** — `cotizacion_encima()`, `cotizacion_padre_id`, `version`: la versión nueva de una cotización (otra cotización,
  preventa, con la publicada y las tarifas de hoy y lo tipeado de la anterior); la anterior no cambia; una viva por anterior.
- **Imagen del ítem** — `repuestos_items_imagenes` / `?panel=imagenes&item=<id>`: imagen de un repuesto (hasta 8, WebP ≤ 1600 px,
  `<item>/<sha-256>.webp` en el bucket `repuestos`); no se llama «foto» (las fotos son del vehículo).
- **Hoja de ítems** — tabla (tarjetas en el celular) de `/repuestos/[id]` (`HojaDeItems`, `features/items/`): una fila por ítem, editable
  celda a celda con `repuestos.editar`; hasta 200 ítems.
- **Hoja de una guardada** — `cotizacion_hoja_guardada()`: abre una guardada con SU versión, lo que quien mira puede guardar, la vigencia y la
  cadena (anterior y versión nueva).
- **Desactualizada** — `cotizacion_crear(… p_abierta …)` (PT409 `desactualizada`): la fórmula o un tipo de cambio cambió tras abrir la hoja:
  «Usar la versión N+1» o «Guardar con la N». No es «vencida».
- **Vehículo obligatorio al cotizar** — `ajustes_empresa.vehiculo_obligatorio_al_cotizar` (sí por defecto): con «no», una preventa se guarda
  sin vehículo (ver «Ajustes de cotización»).
- **Ajustes de cotización** — `AjustesDeCotizacion` (`empresa`): vigencia y vehículo obligatorio, de `ajustes_empresa`; los cambia
  `empresa_guardar_ajustes_de_cotizacion()` con `cotizaciones.configurar` en todos los orígenes y la versión de la fila (Configuración ›
  Cotización › Ajustes).
- **Intento (de una cotización)** — `id` uuid del cliente: `cotizacion_crear` (`p_id`), `cotizacion_guardar` (`p_intento`): repetirlo devuelve
  lo mismo (`repetido: true`); con otros datos, `intento_reusado`.
- **Hoja abierta (versión y hora)** — `abierta` de `cotizacion_hoja()`; `p_abierta` de `cotizacion_crear` y `cotizacion_evaluar`: versión,
  hora y huella de las tarifas que la base firma al abrir; vence a las 24 h (`abierta_invalida`).
- **Abrir la hoja** — `cotizacion_hoja(origen)` / `leerHojaParaCotizar()`: única lectura al cotizar: diseño recortado al nivel de quien mira,
  candados con motivo, versión y hora.
- **Recalcular (la hoja)** — `useRecalculo()` / `cotizacion_evaluar(…, p_origen, p_modo_tc, p_abierta)`: 150 ms tras la última confirmación,
  UNA llamada, aplicando la respuesta más nueva.
- **Candado (de una celda)** — `bloqueoDeLado()` / `textoDelCandado()` / `textoDelEstado()`: por qué una celda visible no se edita (se
  calcula, del vehículo, falta un nivel, interruptor apagado, otra variante).
- **Entradas (de la hoja)** — `Entradas` / `entradasDelPedido()`: lo tipeado que se manda a recalcular: `inputs`, `banderas`, `overrides`,
  variante.
- **Reconstruir lo guardado** — `_cotizacion_entradas_de()`, `_cotizacion_conservar()`: volver de `valores` y `fuentes` a lo tipeado, para
  completar lo que quien guarda no ve.
- **Huella de las tarifas (de la hoja abierta)** — `_cotizacion_huella_tarifas()`: `md5` de los tipos de cambio que nombra la versión con su
  valor al abrir la hoja; va firmada en `abierta` y `cotizacion_crear` la compara con la que reconstruye del historial.
- **Huella (de un guardado)** — `cotizaciones_revisiones.huella`: `md5` de lo que mandó quien guarda; compara el mismo intento con otros
  datos. No se lee.
- **Cargar a mano** — «+» del panel del vehículo: abre el alta del inventario en el panel; «Crear y elegir» crea el vehículo con
  `vehiculo_crear()` al confirmar (no al guardar la cotización) y la hoja lo elige. `p_vehiculo_nuevo` de `cotizacion_crear` queda sin uso
  desde la pantalla.
- **Moneda base de la cotización** — `total_base` / `ajustes_empresa.moneda_base`: sólo `USD` y `BOB`.
- **Serie de comprobantes** — `comprobantes_ajustes.serie` (la vigente, una por empresa, «A» por defecto; la cambia
  `comprobantes_serie_cambiar`) y `comprobantes_contadores` (último número de cada serie usada): numeración sin huecos.
- **Diseño de la hoja** — `formulas.diseno` / `entities/diseno.ts`, `validarDiseno()`, `validar_diseno()`: cómo se ve la hoja de un origen
  (secciones, celdas, atajos, variantes, interruptores, modos, tarjeta).
- **Dato del vehículo (de una celda)** — `dato_del_vehiculo` de una celda de `cotizacion_hoja()` / `datoDelVehiculo` (`entities/hoja.ts`),
  `_hoja_datos_del_vehiculo()`: qué columna de la tabla de una celda casa con qué campo del vehículo (`tipo` ← `tipo_vehiculo`); se elige
  entre las filas de `cotizacion_tabla` en el panel del vehículo (`datosParaElegirDe()`, `guardarDatoDelVehiculo`).
- **Nivel de acceso** — `cotizaciones_niveles` / permisos `cotizaciones.nivel.<clave>.ver|editar` (`permisos.nivel_clave`) /
  `nivel_crear|renombrar|retirar|restaurar|eliminar()`: quién ve y edita una celda o sección.
- **Retirar un nivel** — `nivel_retirar()` / `cotizaciones_niveles.retirado_en`: deja de ofrecerse.
- **Restaurar un nivel** — `nivel_restaurar()`: deshace un retiro; no cambia clave, permisos ni concesiones.
- **Motivo de uso (de un nivel)** — `_nivel_motivo_de_uso()` / `motivo_de_uso` de `niveles_con_uso()`: por qué un nivel no se elimina.
- **Nodos visibles** — `_nodos_visibles(formula_id)`: nodos de una versión que quien llama ve (y si edita) según `formulas.visibilidad`.
- **Variante** — nodo `opcion` y `solo_en`; `estados` y `se_dibuja` del motor: opciones que cambian filas y título de la tarjeta (Moto, Auto…).
- **Override descartado** — `overrides_descartados` del motor (`MOTIVOS_DE_DESCARTE`): valor del usuario no aplicado (nodo inexistente, fuera
  de variante, apagado, no sobrescribible).
- **Interruptor (de la hoja)** — ítem `interruptor` del diseño sobre un nodo `bandera`: «habilita» una fila o «muestra» algo (la garantía).
- **Atajos** — ítem `atajos` del diseño: chips que eligen una fila de una tabla de referencia y dejan su valor como sugerido.
- **Tono** — `tonos` / `tono_*()`, `definicion.grupos[].tono`: color de un grupo; por clave, nunca hex; contraste AA (4,5:1) en cada tema.
- **Planilla EE. UU.** — `origenes.clave = 'planilla_usa'`: origen de ejemplo del Excel (subasta; cuatro cotizaciones en una fórmula con variante).
- **Tipo de cambio unificado y aduana** — `tipos_cambio` (claves `unificado`, `aduana`): el unificado convierte lo pagado afuera.
- **Transporte (tabla por ruta)** — `transporte_usa_bolivia`, `transporte_usa_chile` (`tablas_referencia`): tarifa por tipo de vehículo.
- **Semilla del cotizador** — `supabase/semillas/cotizador-*.sql` / `_preparar_publicacion()`: fórmulas v1 de los tres orígenes de ejemplo,
  publicadas por el camino normal.
- **Avanzado** — `presentacion: 'avanzado'` de una sección: celdas que se editan en un modal aparte (los componentes del CIF y de la póliza).
- **Sección (de la hoja)** — `diseno.secciones[]`: bloque de ítems con título, presentación (`principal` o `avanzado`) y nivel opcional.
- **Celda (de la hoja)** — ítem `celda` del diseño: la `XCell` de un nodo: ancho (`completo`, `mitad`, `tercio`), ayuda y niveles.
- **Ayuda (de una celda)** — `ayuda` de una `celda`: texto o tabla de referencia que abre «Ayuda de X» en un panel de sólo lectura
  (`?ayuda=texto|tabla&nodo=<id>`); la tabla se lee con la hoja abierta.
- **Secundario (de una celda)** — `secundario` de una `celda`: el % (o monto) junto al valor en un `porcentaje_de`; obligatorio si el monto se
  sobrescribe.
- **Subtotal (de la hoja)** — ítem `subtotal` del diseño: un nodo de cálculo dibujado como franja (el «CIF» de «avanzado»).
- **Tarjeta del total** — `diseno.tarjeta_total`: resumen fijo (al pie en celular): nodo total y secundarios; no se ubica en el diseño.
- **Contexto del diseño** — `ContextoDeDiseno` / argumentos de `validar_diseno()`: niveles existentes y retirados y claves de tono; «todos»
  siempre existe.
- **Visibilidad (de un nodo)** — `formulas.visibilidad` / `_compilar_visibilidad()`: `{nodo: {ver, editar}}` por nivel, compilado al publicar.
- **Flujo** — `flujos`: la configuración de fases de un origen (o del de repuestos).
- **Fase** — `fases`: estado del ciclo; inicial, final, jubilada, logística.
- **Fase jubilada** — `fases.activa = false`: sigue en el historial y en las unidades que ya la tienen, pero deja de ser destino. Con uso se
  jubila; sin uso se elimina (`fase_eliminar`, `fase_impacto`).
- **Reactivar una fase** — `fase_reactivar`: vuelve a ser destino; valida las reglas del flujo sobre la fila y no toca el resto.
- **Fase inicial** — `fases.es_inicial` / `_vehiculo_fase_de_entrada()`: por donde un vehículo entra al flujo.
- **Transición** — `fases_transiciones`: paso permitido entre dos fases, con acción y nota obligatoria.
- **Salida de una fase** — en la interfaz, una transición vista desde la fase de la que parte («Salidas y quién mueve»); la que llega es una
  **entrada**. En tipos, tablas y RPC sigue siendo `transicion`.
- **Requisito** — `fases_requisitos` (documento | dato | espera): qué pide una fase para entrar; bloqueante o informativo.
- **Espera** — requisito `espera`: un vehículo espera a sus repuestos / un repuesto a su vehículo.
- **Regla del flujo** — `flujos_reglas`: capacidad encendida/apagada (vitrina, portal, aduana, esperas…).
- **Oferta de transporte** — `flujos_transporte_oferta` / `flujo_oferta_guardar`: puertos de origen y destino y navieras que ofrecen los
  selectores de un flujo con la regla «Transporte»; vacía = todo; filtra, nunca invalida lo guardado.
- **Jubilar** — `fases.activa = false` / `fase_eliminar`: sacar una fase de los destinos sin romper el historial.
- **Fuera de regla** — `flujo_fuera_de_regla()`: unidad en una fase cuyos requisitos bloqueantes ya no cumple; sólo quien configura el flujo
  la lee, con tope.
- **Revisar** — `revisar_flujo()`: avisos de coherencia del flujo (sin salida, inalcanzable, esperas cruzadas…), de nivel error, aviso o
  información (`AvisoDeRevision`); la franja sobre el flujo los resume.
- **Cadena** — `/logistica`: kanban de unidades por fase.
- **Mover** — `cambiar_fase()` / `previsualizar_cambio_fase()`: cambiar de fase, con vista previa de qué falta.
- **Alerta por demora** — `fases.demora_dias` / `alertas_demora()`: aviso cuando una unidad lleva más días de lo esperado en una fase. Job
  `alertas-demora` cada hora; se reabre pasado `fases.alerta_cada_horas` (nulo = 72 h) y mover la cierra.
- **Trabado** — `logistica_bandeja().trabados`: unidad demorada a la que le falta un requisito bloqueante de su fase siguiente (la activa de
  menor orden con transición desde la suya); se miran las primeras 50 demoradas. No: «bloqueado», «atascado».
- **Documento por vencer** — aviso `documento_por_vencer` / `documentos_vencimientos()`: un documento aprobado entró en su ventana
  (`vence_el - tipos_documento.aviso_dias`); una vez por persona y documento.
- **Documento** — `documentos`, `tipos_documento`: archivo del ciclo con estado pendiente/subido/aprobado/rechazado y vencimiento.
- **Visible en el portal** — `documentos.visible_portal`: lo ve la persona compradora en el portal. Sólo lo enciende quien aprueba documentos y
  si el tipo lo admite (`tipos_documento.visible_portal_permitido`); apagarlo siempre se puede. No: «público», «compartido».
- **Tipo de documento** — `tipos_documento` / `tipo_documento_crear()`: qué documento pide el ciclo (Título, BL…); de la empresa (`flujo_id`
  nulo) o de un flujo; formatos y vencimiento (`ninguno`, `solicitar`, `renovar`, con `aviso_dias`). En uso se desactiva. No: «clase de documento».
- **Transporte** — `transportes`: naviera, puertos, contenedor, booking y fechas de UNA unidad.
- **Puerto** — `puertos`: origen o destino de un transporte; nombre, país y código opcionales, `orden`, `activo`. Catálogo en Configuración ›
  Logística › Puertos; se desactiva, no se elimina. No: «terminal», «destino».
- **Naviera** — `navieras`: la empresa que lleva el contenedor; nombre y `activo`. Catálogo en Configuración › Logística › Navieras; se
  desactiva; cada flujo ofrece las suyas (`flujos_transporte_oferta`). No: «línea marítima», «carrier».
- **Embarque / Contenedor** — grupo por `transportes.booking` / `contenedor`: agrupación, no entidad.
- **Grupo (de transporte)** — unidades que comparten `booking` o `contenedor`; no es entidad: `transporte_grupos()` lo cuenta y
  `transporte_grupo()` lo lista (las visibles, hasta 200). No: «lote», «carga».
- **Declaración aduanera** — `declaraciones_aduana`, `declaraciones_vehiculos`: DUI: número, canal de aforo, vencimiento de tributos; N:M.
- **Gasto** — `gastos`, `categorias_gasto`: costo real imputado a una unidad, en su moneda y en base.
- **Pago** — `pagos`: pago del cliente; confirmar es un acto sellado.
- **Desviación / Margen** — `margen_vehiculo()`: cotizado − real / venta − real (null sin venta); `por_categoria` reparte el real por
  categoría de gasto.
- **Margen del proyecto** — `repuestos_proyecto_margen()`: por moneda, Σ precios de los ítems − Σ compras; nulo si falta un precio.
- **Nota** — `notas`: bloc de notas de una unidad; la del cambio de fase apunta a su historial.
- **Proyecto de repuestos** — `repuestos_proyectos`: un proyecto por vehículo (o externo).
- **Ítem de repuesto** — `repuestos_items`: el repuesto que recorre el flujo de repuestos.
- **Stock** — `repuestos_items.stock_cantidad`, `_stock_movimientos`: sobrantes disponibles; se mueve sólo por `repuesto_stock_mover` y
  `repuesto_stock_reasignar`; nunca negativo.
- **Movimiento de stock** — `repuestos_stock_movimientos`: entrada o salida del stock de un ítem con motivo (`sobrante`, `vendido`,
  `devuelto`, `ajuste`, `reasignado`) y nota opcional; sólo lo escriben esas dos RPC. No: «ajuste de inventario», «transacción».
- **Sobrante** — lo que de un ítem entra a stock (motivo `sobrante`, «Pasar a stock»): como mucho su cantidad menos lo que ya entró.
- **Vender suelto** — sacar del stock lo vendido fuera de un proyecto (motivo `vendido`); no registra precio: el cobro es un pago del proyecto.
- **Devolver al proveedor** — sacar del stock lo que se devuelve (motivo `devuelto`, botón «Devolver»).
- **Reasignar** — pasar unidades del stock de un ítem a otro proyecto abierto (motivo `reasignado`): nace un ítem nuevo allá, en la fase de
  entrada.
- **Compra** — `repuestos_compras`: costo de un repuesto (permiso aparte).
- **Catálogo de repuestos** — `repuestos_catalogos.catalogo` (`CATALOGOS_DE_REPUESTOS`): tipo de pieza, condición, vía de transporte o país
  de origen. Cada fila es un **valor** (`ValorDeCatalogo`); en uso se desactiva. La clave `modo_transporte` se muestra «Vía de transporte».
- **Cotizador de repuestos** — `repuestos_cotizador_config`, `_tramos_logistica`, `_cajas`, `repuestos_cotizaciones`: fórmula propia
  importado/local con tramos y cajas.
  - **Tramo de logística** — `repuestos_tramos_logistica` (`TramoDeLogistica`): monto por moneda para `costo_min ≤ costo < costo_max` (nulo:
    en adelante); dos activos de una moneda no se cruzan.
  - **Logística sugerida** — `logistica_sugerida`: el monto del tramo del costo; sin tramo no hay (nunca 0); la escrita la reemplaza.
  - **Caja** — `repuestos_cajas`: embalaje fijo por moneda, elegido por línea («Sin caja» = 0).
  - **Snapshot de configuración** — `repuestos_cotizaciones.config_snapshot` (`SnapshotDelCotizador`): configuración, tramos y cajas de la
    moneda congelados al crear; todo total sale de él.
- **Evento** — `eventos`, `eventos_destinatarios`: cita con visibilidad privada/pública/seleccionados.
- **Destinatario** — `eventos_destinatarios`: persona que ve un evento «seleccionados» (1 a 50); en pantalla «Destinatarios» y «¿Con quién?».
  Sólo lo ve quien creó el evento.
- **Tarea** — `tareas` / `reasignar_tarea`: pendiente con responsable y vencimiento.
- **Tareas sin fecha** — `agenda_tareas_sin_fecha()`: mis tareas sin vencimiento, en una sección plegable bajo el calendario de `/agenda`.
- **Conversación / Mensaje** — `conversaciones`, `mensajes`: directa, grupo o canal global; mensajes de texto o fichas.
- **Cita (de un mensaje)** — `mensajes.responde_a_id` / `CitaDeMensaje`: el mensaje al que responde otro; «Respondiendo a…» y, en la burbuja,
  autor y primeras palabras del original.
- **Mención** — `mensajes_menciones`: `#` a vehículo, lead, cotización o persona; no otorga acceso.
- **No leídos** — `chat_conversaciones().no_leidos`, `chat_no_leidos()`: mensajes ajenos posteriores a tu última lectura
  (`conversaciones_miembros.ultimo_leido_en`), contados entre las 100 entradas más nuevas (las propias ocupan lugar y no suman); 100 se
  muestra «99+». El total no suma las silenciadas.
- **Notificación** — `notificaciones` / `notificar()`: aviso en la campana; `requiere_accion` para lo que pide clic.
- **Campana** — `notificaciones/features/campana`, `<Campana>`: botón de la barra superior con las no leídas y el popover de las que piden
  acción; se suscribe diferida y otra vez al volver la red.
- **Widget del chat** — `chat/features/widget`, `<WidgetChat>`: botón flotante con los no leídos que abre el chat fuera de `/chat` (en el
  celular, enlace a `/chat`); docs y pruebas le dicen «la burbuja», que no es la **burbuja de un mensaje**.
- **Push** — `suscripciones_push`: suscripción web push del navegador.
- **Actividad** — `actividad` / `registrar_actividad()`: auditoría inmutable, 14 días.
- **Turno web** — `solicitudes_contacto_web` / `web.solicitar_asesor`: cada «Contactar asesor» en la web pública.
- **Rueda / Cola web** — `cola_web_asesores` / `estado_cola_web`: quién recibe turnos. Elegible = `habilitado` y permiso
  `web.cola.participar` (`puede_estar_en_la_rueda()`). Matriz: «Recibir turnos de la web».
- **Contacté** — `web_confirmar_contacto`: el asesor confirma que atendió el turno (y lo vincula a un lead).
- **Pegajoso** — `ajustes_web.dias_pegajoso`: un visitante vuelve al mismo asesor dentro del plazo.
- **Disponible** — `cola_web_asesores.disponible` / «Disponible para recibir turnos» de Mi perfil: acepta turnos ahora. La ruleta sólo elige
  a quien lo tiene; el pegajoso no lo mira. No: «activo», «en línea».
- **Respaldo** — `ajustes_web.whatsapp_respaldo`: número que recibe cuando nadie está disponible.
- **Sin asignar** — `solicitudes_contacto_web.estado = 'sin_asignar'` / `cola_web_solicitudes`: turno que no encontró asesor (el visitante
  fue al respaldo); se ve arriba de Configuración › Cola web.
- **Ficha pública** — «Tu ficha en la web»: `perfiles.whatsapp_web`, `handle`, `cargo_web`, `bio_web`, `especialidades`, `publico_web`. Sin
  WhatsApp no hay turnos; con `publico_web` y `handle` la web la muestra. No: «perfil público», «tarjeta».
- **Guía / FAQ / Testimonio** — `web_guias`, `web_faqs`, `web_testimonios`: contenido de la web pública; nace despublicado.
- **Programada** — guía con `web_guias.publicada_en` futura: aún no se ve (`estadoDeGuia()`: «Borrador», «Programada» o «Publicada»).
- **Consentimiento (de un testimonio)** — `web_testimonio_consentir` / `web_testimonio_retirar`: quién lo registró, cuándo, por qué canal, y si
  se muestran ciudad, vehículo y foto. Cambiar nombre, texto o foto lo anula.
- **Superficie pública** — esquema `web`: vistas y RPC que consume el repo de la web.
- **Bandeja** — `/` / `<Bandeja>`: pantalla de inicio; lo que hay que hacer ahora.
- **Bloque de la bandeja** — `BLOQUES_BANDEJA` / `bloquesVisibles()`: lista de pendientes del Inicio, según los permisos.
- **Bloque** — `<Bloque>`: sección plegable de un formulario o ficha.
- **Atajo** — `ATAJOS` / `useAtajo()`: tecla global (`Esc`, `N`, `Ctrl/Cmd+K`…); responde el panel de más arriba.
- **Filtro** — `EsquemaDeFiltros`, `DefFiltro` / `<FilterShell>`: lo que acota un listado; cada uno declara los suyos y viven en la URL.
- **Chip** — `chipsDe()` / `<ChipsDeFiltros>`: un filtro activo a la vista, que se quita solo.
- **Cursor** — `lib/paginacion.ts` / `?cursor=`: dónde quedó la página de un listado (keyset `creado_en, id`).
- **Tope de lo cargado** — `TOPE_DE_LO_CARGADO` / `enElTope()` (`lib/paginacion.ts`): máximo que carga una lista con «Ver más» (500).
- **Ir a una fecha** — `<IrAUnaFecha>` / `irAUnaFecha()`, `cursorDeUnaFecha()`, `hastaDeUnDia()`: mirar una línea de tiempo desde un día
  sembrando el cursor de «Ver más»; no va a la URL.
- **Conflicto** — `PT409` / `<AvisoDeConflicto>`: otra persona guardó antes; quién y cuándo, con «Ver cómo quedó» y «Recargar».
- **Borrador** — `useBorrador()`, `useBorradorDeEstado()`: lo escrito y no guardado de un formulario, en la pestaña; se repone al volver.
- **Tablero** — `/tablero`: métricas y gráficas por rol con widgets.
- **Vista guardada** — `vistas_guardadas` / `VistaGuardada`, `<MenuDeVistas>`: filtros de un listado con nombre, por persona; aplicarla es navegar.
- **Importación** — `importaciones`: carga CSV con vista previa por fila.
- **Importación total** — `importacion_crear()`, `importaciones` con `archivo_ruta`: la de `/datos`, que `importar-csv` procesa por lotes a
  nombre de quien importa y para un destino (`asignar_a`).
- **Archivo normalizado** — `PLANTILLAS`, `escribirArchivo`, `filaDelLote` (`datos/entities/plantillas.ts`): el CSV de una importación total,
  con `rechazo_motivo`, `rechazo_campo` y las claves de la entidad; `importar-csv` lo valida y lo borra al terminar.
- **Fila de la importación** — `importaciones_filas`: fila que no entró (ya existe o error), con campo y motivo, para «Descargar las rechazadas».
- **Exportar leads** — `leads.exportar`, `POST /leads/exportar`: CSV de los leads de la cartera del listado con sus filtros; hasta 5.000 y 5
  por hora.
- **Importar leads** — `/leads/importar`, `leads_importar_lote()`: asistente de CSV: empareja, valida con las reglas del alta e importa por lotes.
- **Archivo de errores** — `leads-rechazados.csv`: las filas que no entraron con su motivo y las mismas columnas, para corregir y resubir.
- **Deshacer la importación** — `leads_importacion_deshacer()`, `<DeshacerImportacion>`: 24 h; manda a la papelera lo importado que sigue
  intacto. Una importación total: sólo terminada o fallida, ≤ 2.000 leads y, si tuvo destino, con `datos.importar.todo`.
- **Intacto (lead importado)** — `_lead_motivo_para_deshacer()`: sólo en la cartera de quien importó (con destino, del destino), sin editar y
  sin nada colgado; las marcas no cuentan.
- **Tus importaciones recientes** — `leads_importaciones_recientes()`, `<ImportacionesRecientes>`: las propias de 24 h, con «Deshacer», en
  `/leads/importar`. No lista las totales de `/datos`.
- **Subasta (de un vehículo)** — `SubastaDeVehiculo` / `<BloqueDeSubasta>`, `leerSubasta()`: cuándo es, en qué está, cuánto va y cuándo se
  consultó.
- **Cierre (de una subasta)** — `vehiculos.cierre_subasta_en` (generada): `coalesce(subasta_fin_en, subasta_en)` de una subasta abierta o en
  vivo; nula si no está viva. Ordena «Cierre subasta» del panel del vehículo, desde ahora menos 24 h.
- **Estado de subasta** — `vehiculos.estado_subasta` / `EstadoDeSubasta`: `abierta`, `en vivo`, `terminada` o `vendida`; lo deriva la base.
- **Puja actual** — `atributos.<campo de pricing.current_bid_usd>` / `columnaDePrecio()`, `precioDeLaFila()`: lo que va de la subasta, en
  USD. En un origen de subasta con ese campo, la columna «Precio» del inventario se llama así; nunca es el precio del vehículo.
- **Puja final** — la puja actual de una subasta `terminada` o `vendida`: la celda lleva «final» y la tarjeta dice «Puja final».
- **Respuesta guardada** — `vehiculos.apibara_raw` / `leerSubasta().raw`: lo que apibara devolvió, entero; sólo el servidor la lee.
- **Consulta de apibara** — `apibara_consultas` / `apibara_consulta_guardar()`, `FichaDeApibara.consulta`: cada respuesta de la edge function,
  a nombre de quien consultó.
- **Importado por apibara** — `vehiculos.importado_apibara`: nació de una consulta a apibara; no cambia; decide a quién alcanza la limpieza
  automática.
- **Catálogo de apibara** — `_apibara_catalogo()` / `CATALOGO_APIBARA`: cada dato normalizado de la API (ruta, etiqueta, tipo, sección).
- **Ruta de apibara** — `origenes_campos.clave_apibara`: dónde está un dato en la respuesta (`vehicle_specs.engine.raw`); una por origen.
- **Datos nuevos de apibara** — `DatoNuevoDeApibara` / `origen_apibara_rutas_sin_campo()`: datos que la API trajo y aún no son campo.
- **Refrescar** — `refrescarSubasta` / `vehiculo_subasta_refrescar()`: volver a preguntar a apibara; siempre actualiza fecha, estado y respuesta.
- **Línea pegada** — `Linea` / `lineasDePegado()`: renglón pegado para alta desde apibara (enlace Copart/IAAI, VIN o lote); hasta 20.
- **Fotos de la subasta** — `fotosDeSubasta()` / `<BotonTraerFotos>`: las primeras 24 imágenes de la respuesta (la primera, portada).
- **Cuota de apibara** — `UsoDeApibara` / `<UsoDeApibara>`: consultas hechas y restantes en el período; agotada (429), la API calla hasta que
  vence.
- **Limpieza automática** — `limpieza_automatica_correr()`, `ajustes_empresa.limpieza_automatica`: cada madrugada manda a la papelera, en un
  lote, los importados de subasta terminada hace más de los días de gracia y sin ancla.
- **Ancla** — `_limpieza_ancla()`: lo que retiene de la limpieza: «Conservar», vínculo con lead, fase posterior a la inicial, documentos,
  gastos o pagos, estar publicado, una cotización final activa.
- **Conservar** — `vehiculos_conservados` / `vehiculo_conservar()`, `<BotonConservar>`: marca que saca un vehículo de la limpieza.
- **Días de gracia** — `ajustes_empresa.limpieza_dias_gracia`: días desde que terminó la subasta hasta que se limpia: 7 por defecto, de 1 a 90.
- **Se limpiará pronto** — `FILTRO_LIMPIEZA`, `limpieza_el()`, `VENTANA_DE_AVISO_DIAS`: filtro e insignia «Se limpia el dd/mm» de lo que se
  limpia en 3 días.
- **Aviso de limpieza** — `limpieza_avisar()`, `limpieza_avisos`, notificación `limpieza_pronto`: aviso al creador de un importado al entrar
  en «Se limpiará pronto»; una vez por vehículo.
- **Lote de limpieza** — `lotes_papelera.es_limpieza`: lote nocturno sin autor; lo restauran quienes pueden vaciar la papelera.
- **Corrida de limpieza** — `limpieza_corridas` / `limpieza_ultima()`: lo que dejó una noche: movidos, retenidos por ancla y en espera.
- **Conteo acotado** — `ConteoAcotado` (`src/shared/lib/conteo.ts`), `conteoAcotado()`: número sin total exacto: «más de N» o «N+».
- **Diferido** — `diferido()` (`src/shared/ui/diferido.tsx`), `diferidos.tsx` de cada caso de uso: código de modal, panel o pestaña pedido al
  usarse. No: `next/dynamic` suelto.
- **Shell** — `shell.ts` y `shell.client.ts` de un módulo, `src/app/(app)/layout.tsx`: marco de toda pantalla.
- **Pantalla (entrada)** — `pantallas/<pantalla>.ts` de un módulo: entrada por la que `src/app` trae los componentes de una pantalla.
- **Carril** — un worktree con su propia pila de Supabase (`scripts/worktree/preparar.sh`, `docs/FLUJO.md`).
- **Área (de un módulo)** — una parte de un módulo: sus carpetas `features/<área>/`, `entities/<área>/`, `infra/<área>/`, sus entradas
  `areas/<área>/` y `pantallas/<área>.ts`. No importa otra área (`cotizaciones`).
- **Núcleo (de un módulo)** — lo que comparten las áreas de un módulo (en `cotizaciones`: la hoja, guardar, el motor…); no importa ningún área.
- **Hueco (de una pantalla del núcleo)** — `HuecosDeLaHoja`, `HuecosDeLaGuardada`, `HuecosDelListado` (`features/hoja/components/huecos.ts`):
  lo que un área llena en una pantalla del núcleo sin que el núcleo la importe; la página de `src/app` lo une por
  `pantallas/<área>-<pantalla>.ts`; vacío es un objeto sin componentes y no dibuja nada.
- **Pestaña de un área (de Configuración › Empresa)** — `PestanaDeEmpresa` que viene de la lista de un área (`PESTANAS_DE_COMPROBANTES`), con
  sus permisos; Empresa la dibuja sin importar el área (`esPestanaDeUnArea`).
- **Hoja de contacto** — `scripts/hoja-de-contacto.mjs`, `<carpeta>/hojas/`: capturas de e2e montadas en una imagen.
- **Captura quieta** — `capturar()` / `capturarEn()` (`e2e/soporte/`): captura tomada sin animación ni transición con fin en curso.
- **Pregunta al descartar** — `useCierreConCambios()`, `<ConfirmarDescarte>`, `useCambiosSinGuardar()` (`preguntaAlCerrar`): «Tienes cambios
  sin guardar.» con «Seguir editando» / «Descartar».
- **Recorte (de una cotización)** — `_cotizacion_recorte()`, `_cotizacion_contexto()` / `cotizacion_leer()`, `cotizacion_evaluar()`,
  `cotizacion_revisiones()`, `cotizacion_tabla()`: lo que viaja según el nivel de quien lee.
- **Inventario de lo oculto** — `pg_temp.cv_registro()` en `supabase/tests/cotizaciones-visibilidad.sql`: funciones que pueden devolver
  `valores`, `fuentes`, `totales` o `formulas.*`, con su clase y sonda.
- **Ver total Bs** — `diseno.cabecera.ver_total_bs` (la versión lo ofrece) / `cotizaciones.ver_total_bs` (lo eligió quien cotizó),
  `_cotizacion_ver_total_bs()`, `p_ver_total_bs`: sumar el total en Bs al resumen, la tarjeta y el PDF; sólo si la versión lo ofrece, nace en
  falso. En pantalla «Ver total en moneda local», sólo con `cabecera.moneda_bs` (sin ella se guarda en falso).
- **Moneda del total en Bs** — `cabecera.moneda_bs` de `cotizacion_hoja()` / `HojaLista.cabecera.monedaBs`: el `moneda_a` del tipo de cambio
  activo de `definicion.total_en`; nula sin `total_en` o sin ese tipo de cambio activo, aunque `totales.bs` tenga valor (el Bs sale del tipo de
  cambio de cada bucket). Con ella se escribe `totales.bs`.
- **Unidad** — `Unidad` (`logistica/entities/nucleo/unidad.ts`): el vehículo o repuesto sobre el que se opera en logística (`tipo`);
  documentos, gastos, pagos, notas y transporte cuelgan por `vehiculo_id` o `repuesto_id`, uno y sólo uno (`refDeUnidad`).
- **Panel de la unidad** — `<PanelDeLaUnidad>` (`logistica/features/nucleo`): cabecera y huecos de cada área en orden fijo
  (`ORDEN_DE_HUECOS`); drawer `?vehiculo=<id>` sobre la cadena y página en `/logistica/vehiculo/<id>`.
- **Despliegue en seco** — `pnpm despliegue:en-seco` / `scripts/despliegue/en-seco.sh`, `revisar-base.mjs`: ensayo local de un despliegue
  (base, pruebas, advisors, jobs, buckets, Vault, funciones, variables, build) sin tocar la nube; termina en «listo» o con lo que falta y las
  líneas «Para la persona» (`docs/DESPLIEGUE.md`). No: «deploy de prueba».
