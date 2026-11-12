## 6.08-3 — `/logistica/embarques`: embarques y contenedores (2026-11-12)

- **D22** Sin botón «Editar grupo» en esta parte: lo trae la 6.08-4 junto con su drawer (un control apagado sin destino confunde). Reversible.
- **D23** No se crea `pantallas/transporte-grupo.ts`: el área no declara ningún hueco propio en el grupo; lo que declaran `mover`, `documentos` y `dinero` se monta desde `src/app` (`embarques/huecos-del-grupo.ts`).
- **D24** Las vistas `?grupo=` son enlaces que no conservan filtros ni cursor (la clave de `q` y el cursor significan otra cosa en cada tipo), como las de Gastos.
- **D25** `DrawerDelGrupo` se registra `sinFormulario` (el resumen sólo muestra; cada hueco pregunta al cerrar por sí solo), con el argumento del panel de la unidad.
- **D26** Se omite «días en la fase» del resumen: `transporte_grupo` no lo trae y leerlo sería una lectura por fila (N+1, `escala.md`).
- **D27** Los huecos de grupo se dibujan por permiso en cualquier origen y sin mirar la regla de flujo: un grupo puede cruzar orígenes y flujos, y la base vuelve a exigirlo por unidad. Sólo con unidades visibles.
- **D28** El cursor de la lista es el `siguiente` opaco de la base (uuid) en `?cursor=`, validado con `z.guid()`; no se usa `leerCursor` de `shared` (su formato, instante + id, no aplica). No se toca `shared`.
- **D29** El filtro de estado se escribe «En tránsito» (sin fecha de arribo) / «Ya llegaron» (con arribo); «Todos» no manda nada.
- **D30** «Varias»/«Varios» y «—» se distinguen: un dato que difiere entre unidades se dice «Varias»; uno que ninguna tiene, «—». Un id de catálogo que no aparece (p. ej. un catálogo de más de 200) se dice «—», nunca el uuid.
- **D31** La unidad de repuesto aparece en el resumen como texto plano (sin enlace) hasta 8.13; la lista no las distingue.
- **D32** Sin migración: `transporte_grupos` y `transporte_grupo` (6.07) cubren la lista y el resumen.
- **D33** Sin `medir-*.sql`: no existe una sonda de volumen de transporte (sólo la prueba SQL de 6.07-3); la fila de `docs/RENDIMIENTO.md` dice «sin medir con volumen», como Gastos. Corrige la afirmación de la parte 1 de que la sonda ya existía.
- **D34** Los filtros de naviera y de puertos ofrecen sólo los activos de los catálogos (sin opciones, el filtro no se dibuja); el nombre de una fila sale de todos, activos o no. Un grupo cuya naviera se desactivó se ve por su nombre pero no se filtra por ella.
- **D35** La búsqueda `q` se manda como `prefijo` sólo si, además del mínimo del esquema, tiene tres `[A-Za-z0-9]` seguidos (la base los exige tras quitar espacios y pasar a mayúsculas): «ab-c» no filtra.
