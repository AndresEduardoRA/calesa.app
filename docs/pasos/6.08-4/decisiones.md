## 6.08-4 — «Editar grupo» y cierre de la fila 6.08 (2026-11-12)

- **D36** El formulario de «Editar grupo» **tapa** al resumen (un solo drawer a la vez, como aduana D8); cancelar y guardar vuelven al resumen con `replace`. Dos drawers apilados son más difíciles de cerrar y de probar, y aduana ya tiene el patrón.
- **D37** Sin `logistica.transporte.editar` ni `repuestos.editar` en ningún origen no se dibuja el botón y `?panel=editar-grupo` se ignora. Con permiso pero con un grupo que no se puede editar desde aquí (más de 200 unidades, unidades que no se ven o que no se pueden editar), el botón sale apagado con el motivo y una URL escrita a mano abre el drawer con el motivo y sin campos. La base manda siempre.
- **D38** «Varios» = las unidades **vistas** difieren (`valoresComunes` sobre `transporte_grupo`). Un campo en «Varios» **no se vacía**: vacío = no tocar. Vaciar el dato de todas se hace en un campo común.
- **D39** `notas` queda fuera del grupo: la RPC no las admite y son de cada unidad.
- **D40** Campos propios del grupo (`campos-del-grupo.tsx`) y no los del hueco: no se toca 6.08-2, no hay notas ni enlace a Configuración, y las opciones son todos los activos (un grupo cruza flujos; la oferta y la fase las revisa la base por unidad y rechaza con «<título>»).
- **D41** Los rechazos se dicen «No se cambió ninguna: <motivo>» (es todo o nada); «Recargar» = `router.refresh()` y conserva lo escrito (borrador por campo tocado).
- **D42** Si se cambia el contenedor o el booking del tipo, el resumen sigue abierto bajo la clave nueva que devuelve la base; no se avisa de una fusión con otro grupo que ya la tuviera.
- **D43** El e2e de `configuracion-logistica` (crear una naviera y verla ofrecida) ya existe desde 6.08-1; no se repite.
- **D44** Sin migración y sin auditor: pantalla sobre una RPC existente, sin permiso ni dato nuevo.
- **D45** Las reglas van en `entities/transporte/edicion-del-grupo.ts` y no en `grupos.ts` (267 líneas: pasaría de 300). Se aparta de la fila sólo en el nombre del archivo.
- **D46** El e2e arma un grupo en el que difieren el ETA **y** el zarpe (sólo la primera unidad tiene zarpe), así que esperaba un «Varios» y hay dos: el plan lo había supuesto de un solo campo. La prueba comprueba los dos y que sólo se toca el ETA.
