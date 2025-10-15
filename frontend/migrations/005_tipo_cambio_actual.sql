-- Tabla para guardar el tipo de cambio actual (último usado)
CREATE TABLE IF NOT EXISTS tipo_cambio_actual (
  id SERIAL PRIMARY KEY,
  valor NUMERIC(10, 2) NOT NULL,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_por VARCHAR(100),
  comentario TEXT
);

-- Insertar valor inicial si no existe
INSERT INTO tipo_cambio_actual (valor, comentario)
SELECT 1500.00, 'Valor inicial del sistema'
WHERE NOT EXISTS (SELECT 1 FROM tipo_cambio_actual LIMIT 1);

-- Índice para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_tipo_cambio_fecha ON tipo_cambio_actual(fecha_actualizacion DESC);

-- Comentarios de documentación
COMMENT ON TABLE tipo_cambio_actual IS 'Almacena el tipo de cambio USD/ARS actual usado en el sistema. Se actualiza cada vez que un usuario registra un movimiento con un nuevo tipo de cambio.';
COMMENT ON COLUMN tipo_cambio_actual.valor IS 'Tipo de cambio USD/ARS (cuántos pesos vale un dólar)';
COMMENT ON COLUMN tipo_cambio_actual.fecha_actualizacion IS 'Fecha y hora de la última actualización del tipo de cambio';
COMMENT ON COLUMN tipo_cambio_actual.actualizado_por IS 'Usuario que actualizó el tipo de cambio';
COMMENT ON COLUMN tipo_cambio_actual.comentario IS 'Observaciones sobre la actualización';
