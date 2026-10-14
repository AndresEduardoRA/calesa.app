-- Enums: SÓLO para conjuntos que decide el código. Todo lo que el dueño configura es tabla.

create type public.alcance_permiso as enum ('propios', 'todos');
create type public.tipo_origen as enum ('subasta', 'manual');
create type public.estado_subasta as enum ('abierta', 'en_vivo', 'terminada', 'vendida');
create type public.genero_gramatical as enum ('m', 'f');
create type public.tipo_campo as enum ('texto', 'texto_largo', 'numero', 'moneda', 'booleano', 'fecha', 'fecha_hora', 'opcion', 'multi_opcion', 'url', 'vin', 'lote', 'correo', 'documento');
create type public.ambito_flujo as enum ('vehiculos', 'repuestos');
create type public.tipo_requisito as enum ('documento', 'dato', 'espera');
create type public.ambito_espera as enum ('padre', 'hijos');
create type public.estado_documento as enum ('pendiente', 'subido', 'aprobado', 'rechazado');
create type public.modo_vencimiento as enum ('ninguno', 'renovar', 'solicitar');
create type public.tipo_lead as enum ('prospecto', 'cliente');
create type public.tipo_acceso_lead as enum ('dueno', 'compartido', 'adoptado');
create type public.visibilidad_seguimiento as enum ('privado', 'publico');
create type public.estado_oportunidad as enum ('abierta', 'ganada', 'perdida', 'cancelada');
create type public.estado_version as enum ('borrador', 'publicada', 'archivada');
create type public.clase_cotizacion as enum ('preventa', 'final');
create type public.estado_cotizacion as enum ('activa', 'reportada', 'invalida');
create type public.canal_aforo as enum ('verde', 'amarillo', 'rojo');
create type public.estado_agenda as enum ('pendiente', 'completado', 'cancelado');
create type public.visibilidad_evento as enum ('privado', 'publico', 'seleccionados');
create type public.tipo_conversacion as enum ('directa', 'grupo');
create type public.tipo_mensaje as enum ('texto', 'evento', 'tarea', 'vehiculo', 'lead', 'cotizacion');
create type public.tipo_lote_papelera as enum ('vehiculos', 'leads', 'cotizaciones');
create type public.estado_solicitud_web as enum ('asignada', 'contactada', 'vencida', 'sin_asignar', 'cancelada');
create type public.estado_importacion as enum ('pendiente', 'procesando', 'terminada', 'fallida');
create type public.estado_cotizacion_repuestos as enum ('borrador', 'aceptada', 'anulada');
