# 9.05-1 · Datos: exportar todo, la base (2026-11-12)

- **D1 a D3 · Las dudas de la fila, con la recomendada.** Leads, vehículos y cotizaciones; «todo» no trae teléfonos ni lo privado de carteras ajenas;
  hasta 250.000 filas por archivo y 3 exportaciones por hora.
- **D4 · Las filas se registran antes del primer byte.** El route handler cuenta con un tope de 250.001 antes de llamar al registrar: con el CSV ya en
  camino no se puede cambiar el código de estado.
- **D5 · La lectura no pide el permiso.** `datos_exportar_leads()` devuelve lo mismo que `leads_vista` a esa sesión, así que no abre nada; pedirlo la
  volvería plpgsql y dejaría de inlinearse. El enforcement es el registrar, que el route handler llama antes de leer.
- **D6 · El candado es por persona** para las tres entidades; el tope, por entidad.
- **D7 · Sin script de carrera.** El candado es el patrón de `leads_exportacion_registrar` y una prueba de catálogo exige que vaya antes de leer
  `actividad`; lo que se perdería en una carrera es una exportación de más.
- **D8 · Filtros guardados:** sólo `desde`, `hasta` y `origen`. Vehículos exige origen (un archivo por origen), leads lo rechaza, cotizaciones lo admite.
- **D9 · El límite lee las 3 más recientes** (`order by creado_en desc limit 3`, por `actividad_actor_accion_idx`) en vez de contar: `libre_en` es la más
  vieja de las tres más una hora, y `escala.sql` no necesita otra excepción.
