## 6.12-2 — La bandeja de logística en Inicio (2026-11-12)

- **D16 · «Ver todas».** «Alertas por demora» → `/logistica?origen=<origen de la primera fila>&demoradas=si`: sin `origen` la cadena abre la primera
  pestaña y cambiar de pestaña suelta los filtros, así que una demora de otro origen no se vería. «Documentos por aprobar» → `/logistica?por_aprobar=si`
  (sus filas no traen el origen). «Vehículos trabados» **no lleva** «Ver todas»: la cadena no tiene un filtro de trabados, y mandar a las demoradas
  mostraría unidades que no están trabadas.
- **D17 · Una lectura para los tres bloques:** `bandejaLogistica(tope)` va memorizada por request con `cache()` de React, así los tres bloques de la misma
  pantalla hacen una sola llamada a `logistica_bandeja`. El `tope` lo pasa el bloque (`TOPE_DE_BLOQUE`): `logistica` no importa `tablero`.
- **D18 · El título es el de la base** (`vehiculos.titulo`), sin el campo principal de 6.13: para nombrarlo habría que leer los atributos de cada fila. La
  fase y el enlace al panel identifican la unidad.
- **D19 · Textos de las filas:** demorada, `«<fase>» · Desde hace N días en esta fase` (el texto del panel de la unidad, del núcleo: el de la tarjeta es del
  área `cadena` y un área no importa otra); trabado, `Falta para «<fase siguiente>»: <motivo>` (el motivo de la base ya dice «Documento: <tipo>»); por
  aprobar, `<tipo> · subido <hace…>`. Las rutas de «Ver todas» las arma cada bloque en `tablero` con las claves de URL que exporta el área `cadena`.
- **D20 · Un fallo de la lectura apaga los tres bloques** (es una sola llamada): cada uno dibuja `<ErrorDeBloque/>` con «Reintentar».
- **D21 · El spec viejo de Inicio** («un bloque de otra fase todavía muestra su vacío») miraba «Vehículos trabados», que ahora depende de la base; pasa a
  mirar «Esperas que destraban vehículos», que sigue hueco hasta la Fase 8.
- **D22 · El e2e corre en `escritorio` y `movil`** (Inicio no es Configuración). En el celular la cadena muestra una fase a la vez: el spec elige la pestaña
  de la unidad si está la lista «Fases», sin preguntar por el proyecto.
- **D23 · `documento_por_vencer` en el catálogo:** icono `FileClock`, `accionAlAbrir: true` (abrirlo lleva al panel donde se sube el nuevo), etiqueta
  «Vencimientos», descripción «Cuando un documento de una unidad está por vencer.». Las preferencias de push suman la fila solas.
