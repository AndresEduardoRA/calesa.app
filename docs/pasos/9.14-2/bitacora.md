## Paso 9.14-2 · El cierre de la Fase 9, parte 2 de 3: el recorrido con dos cuentas (2026-11-13)

- **Un solo spec nuevo, en serie y de escritorio:** `e2e/fase-9-recorrido.spec.ts`, con su terreno `e2e/soporte/fase-9-recorrido.ts` y
  `e2e/soporte/fase-9-pasos.ts` (los lectores que cada pieza tiene **privados** en su propio spec: las cifras del tablero, el doble de
  `beforeinstallprompt`, la barra del cliente de la hoja, el CSV; copiados con su cita en vez de abrir specs verdes en un cierre de fase, D3).
  Diez tramos encadenados y **nada sembrado de lo que el recorrido produce**: el lead, la cotización, la final, el pago, el turno contactado,
  el cambio del nombre y la importación los hace la interfaz; `sql()` sólo prepara personas, rol, vehículo y cola, y limpia.
- **Los tramos.** R1 la asesora registra el lead con «N» y su seguimiento (queda en su cartera); R2 lo cotiza con un vehículo del inventario
  (remate y grúa, `Ctrl+S`, y en la base la cotización con su lead, su vehículo y su autora); R3 la marca final, el lead pasa a **cliente** y
  el vehículo queda vinculado; R4 la asesora carga el pago de esa unidad y **la dueña lo confirma** (quien carga no ve «Confirmar pago»: el
  sello prueba que fueron dos personas); R5 la dueña ve subir «Convertidos» y «Margen del mes» (se compara el aumento, nunca un total);
  R5b un visitante pide turno por la API pública, la asesora lo cierra con «Contacté» en un toque y el widget «Cola de la web» lo cuenta;
  R6 la dueña encuentra en `/actividad` el cambio con su diff; R6b lo ajeno sale recortado; R7 la dueña exporta los leads y vuelve a importar
  el del recorrido, que regresa a la cartera de su asesora; R8 «Instalar la app» llama a `prompt()` una vez y desaparece.
- **Dos hallazgos que cambiaron el plan, y los dos son la regla, no un defecto** (D11, D12). (1) **Marcar final y editar un lead exigen estar
  en la cartera del lead:** `puede_actuar_lead` pide `en_cartera`, así que `leads.editar` con alcance «todos» no alcanza y la dueña **no** puede
  marcar final la cotización de un lead que registró su asesora (la pantalla lo dice: «No encontramos este lead o no tienes acceso.»). El
  recorrido se corrigió: cada cambio lo hace quien tiene el lead, y la asesora lleva `cotizaciones.final.gestionar` en el origen. (2) **En la
  actividad de un lead ajeno el recorte no esconde que hubo un cambio, esconde el qué:** la fila se ve con su persona y su hora, y los campos
  dicen «Sin acceso al detalle», sin botón para abrir el diff. R6b afirma eso, que es más fuerte que «no ve nada», con el control de que de lo
  suyo sí ve los campos y abre el diff.
- **Lo que no era factible del plan de la parte 1** (D13): «exportar y volver a importar el mismo archivo» no se puede tal cual, porque el CSV
  que exporta la dueña trae el lead de su asesora con el **teléfono enmascarado** (`•`), que es justo lo que promete el 9.05. R7 afirma la
  máscara y el «Dueño» en el archivo, borra el lead y lo importa con los encabezados de ese mismo archivo y el teléfono que tipeó R1.
- **Tres corridas seguidas en verde** antes de commitear (`.piloto/salidas/9.14-2/recorrido-{1,2,3}.log`): **10 de 10** en las tres, 37,8 s,
  36,4 s y 36,8 s. Ningún inestable nuevo. Las guardas, en verde (`guardas.log`, 40 archivos y 1.177 pruebas; `sin-celular.test.ts` valida la
  marca de archivo del spec nuevo: 262 pruebas).
- **Ningún código de producto cambió**: los cuatro rojos del camino fueron del spec (una cuenta que no se soltaba al cambiar de persona dentro
  de una prueba, un `boolean::text`, un filtro de fila y los dos hallazgos de arriba). No hizo falta ningún `fix`.
- **Lo que queda del 9.14:** la parte 3 (la tabla de criterios del «Terminado cuando», «lista para desplegar», el Nivel 3 con los dos proyectos,
  ESTADO, la «Partición» marcada, los abiertos y la reconciliación de los «No entra»). Esta parte no corre el completo a propósito.
- e2e completo: no (9.14-2, Nivel 1: el recorrido de la fase 9 con dos cuentas en escritorio; el completo lo corre el 9.14-3; dirigidos: fase-9-recorrido ×3)
