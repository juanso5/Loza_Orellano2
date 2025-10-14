-- Migración: Agregar campo 'nombre' a la tabla fondo
-- Fecha: 2025-01-14
-- Descripción: Permite asignar nombres personalizados a los fondos

-- Agregar columna nombre
ALTER TABLE fondo 
ADD COLUMN IF NOT EXISTS nombre VARCHAR(255);

-- Agregar comentario a la columna
COMMENT ON COLUMN fondo.nombre IS 'Nombre personalizado del fondo (ej: "Auto", "Viaje a Europa", etc.)';

-- Crear índice para búsquedas por nombre
CREATE INDEX IF NOT EXISTS idx_fondo_nombre ON fondo(nombre);

-- Nota: El campo es opcional (nullable) para mantener compatibilidad con fondos existentes
-- Si no tiene nombre, se usará tipo_cartera.descripcion como fallback
