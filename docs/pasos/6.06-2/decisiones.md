## 2026-11-12 — Paso 6.06-2: subir documentos con una bandeja

- **D14 · El tipo se elige antes que los archivos y manda.** El selector de tipo va arriba de la zona porque de él salen el `accept` y el aviso de formatos. Un archivo que el tipo
  no admite no se pierde: sale de lo que se sube con su motivo y vuelve si se elige otro tipo (`repartirLaBandeja`).
- **D15 · El id del intento va por archivo y atado a lo escrito** (hash + tipo + fechas + nota). Reintentar sin cambiar nada manda el mismo id y la base devuelve las mismas filas; si
  la persona cambia el tipo o una fecha entre un intento y otro, es otro registro y no choca con `23505/id`.
- **D16 · Se sube uno por vez y se corta ante lo que fallaría igual:** sin red o con un campo rechazado por la base no se insiste con los demás; los que quedan se reintentan con su
  motivo. Los registrados salen de la bandeja y avisan a «Qué falta» con `logistica:unidad-cambio`.
- **D17 · Los campos del formulario que la base nombra por `hint`** son `vence_el`, `tipo` y `nota`; ruta, formato, peso y unidad no tienen campo y se dicen junto al archivo. `42501` dice
  siempre «No puedes subir documentos a esta unidad.».
- **D18 · El e2e de subir se adelanta a la parte 2** (el plan lo traía en la 3): subir contra el bucket real es lo único que prueba la policy de carpeta y el registro juntos. La 3 lo extiende con aprobar.
- **D19 · «Emitido el» sólo se pregunta si el tipo vence.** Un tipo `ninguno` no lleva fechas (la base rechaza un vencimiento) y no se ofrece ni una emisión.
