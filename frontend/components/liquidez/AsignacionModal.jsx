"use client";

import { useState, useEffect } from "react";

export default function AsignacionModal({
  isOpen,
  onClose,
  onSave,
  clienteId,
  fondo,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [liquidezDisponible, setLiquidezDisponible] = useState(null);
  const [formData, setFormData] = useState({
    monto: "",
    moneda: "USD",
    tipo_cambio_usado: "1500",
    tipo_operacion: "asignacion",
    comentario: "",
  });

  useEffect(() => {
    if (isOpen && clienteId) {
      // Cargar liquidez disponible
      fetch(`/api/liquidez/estado?cliente_id=${clienteId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success) {
            setLiquidezDisponible(data.data.liquidezDisponible);
          }
        })
        .catch((err) => console.error("Error cargando liquidez:", err));
    }
  }, [isOpen, clienteId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const payload = {
        cliente_id: clienteId,
        fondo_id: fondo.id_fondo,
        monto: parseFloat(formData.monto),
        moneda: formData.moneda,
        tipo_cambio_usado: formData.moneda === "ARS" ? parseFloat(formData.tipo_cambio_usado) : null,
        tipo_operacion: formData.tipo_operacion,
        comentario: formData.comentario,
      };

      const resp = await fetch("/api/liquidez/asignar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        throw new Error(data.error || "Error al procesar la asignación");
      }

      setSuccess("Asignación realizada correctamente");
      setTimeout(() => {
        onSave();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  // Calcular monto en USD
  const monto = parseFloat(formData.monto) || 0;
  const tc = parseFloat(formData.tipo_cambio_usado) || 1;
  const montoUSD = formData.moneda === "ARS" ? monto / tc : monto;
  
  const excedeDisponible =
    formData.tipo_operacion === "asignacion" &&
    liquidezDisponible !== null &&
    montoUSD > liquidezDisponible;
  
  // Calcular equivalencia
  const calcularEquivalencia = () => {
    if (!monto) return null;
    if (formData.moneda === "USD") {
      return {
        principal: `USD ${monto.toFixed(2)}`,
        equivalente: `ARS ${(monto * tc).toFixed(2)}`
      };
    } else {
      return {
        principal: `ARS ${monto.toFixed(2)}`,
        equivalente: `USD ${montoUSD.toFixed(2)}`
      };
    }
  };
  
  const equivalencia = calcularEquivalencia();

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "2rem",
          borderRadius: "8px",
          maxWidth: "500px",
          width: "90%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h2 style={{ margin: 0 }}>
            {formData.tipo_operacion === "asignacion" ? "Asignar" : "Desasignar"} Liquidez
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
            }}
          >
            Ô£ò
          </button>
        </div>

        {/* Info del fondo */}
        <div
          style={{
            backgroundColor: "#f3f4f6",
            padding: "1rem",
            borderRadius: "6px",
            marginBottom: "1.5rem",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#6b7280" }}>
            Fondo seleccionado:
          </p>
          <p style={{ margin: "0.25rem 0 0 0", fontWeight: "bold" }}>
            {fondo.tipo_cartera || `Fondo #${fondo.id_fondo}`}
          </p>
        </div>

        {/* Liquidez disponible */}
        {formData.tipo_operacion === "asignacion" && liquidezDisponible !== null && (
          <div
            style={{
              backgroundColor: excedeDisponible ? "#fee2e2" : "#f0f9ff",
              padding: "1rem",
              borderRadius: "8px",
              marginBottom: "1.5rem",
              border: excedeDisponible ? "1px solid #dc2626" : "1px solid #3b82f6",
            }}
          >
            <p style={{ margin: 0, fontSize: "0.875rem", color: excedeDisponible ? "#991b1b" : "#1e40af", fontWeight: "600" }}>
              Liquidez Disponible
            </p>
            <div style={{ display: "flex", gap: "1rem", alignItems: "baseline", marginTop: "0.5rem" }}>
              <p style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700", color: excedeDisponible ? "#dc2626" : "#1d4ed8" }}>
                USD ${liquidezDisponible.toFixed(2)}
              </p>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>
                | ARS ${(liquidezDisponible * parseFloat(formData.tipo_cambio_usado || "1500")).toFixed(2)} <span style={{ fontSize: "0.75rem" }}>(histórico)</span>
              </p>
            </div>
            {excedeDisponible && (
              <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "#991b1b" }}>
                El monto ingresado excede la liquidez disponible
              </p>
            )}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit}>
          {/* Tipo de operaci├│n */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem", fontSize: "0.875rem", color: "#374151" }}>
              Tipo de Operación
            </label>
            <select
              name="tipo_operacion"
              value={formData.tipo_operacion}
              onChange={handleChange}
              style={{
                width: "100%",
                padding: "0.625rem",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "0.875rem"
              }}
            >
              <option value="asignacion">Asignación</option>
              <option value="desasignacion">Desasignación</option>
            </select>
          </div>

          {/* Monto */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem", fontSize: "0.875rem", color: "#374151" }}>
              Monto *
            </label>
            <input
              type="number"
              name="monto"
              value={formData.monto}
              onChange={handleChange}
              step="0.01"
              min="0"
              required
              style={{
                width: "100%",
                padding: "0.625rem",
                border: `1px solid ${excedeDisponible ? "#dc2626" : "#d1d5db"}`,
                borderRadius: "6px",
                fontSize: "0.875rem"
              }}
              placeholder="0.00"
            />
          </div>

          {/* Moneda */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem", fontSize: "0.875rem", color: "#374151" }}>
              Moneda
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, moneda: "USD" })}
                style={{
                  padding: "0.625rem",
                  borderRadius: "6px",
                  border: formData.moneda === "USD" ? "2px solid #3b82f6" : "2px solid #d1d5db",
                  backgroundColor: formData.moneda === "USD" ? "#eff6ff" : "white",
                  color: formData.moneda === "USD" ? "#1d4ed8" : "#374151",
                  fontWeight: "500",
                  cursor: "pointer",
                  fontSize: "0.875rem"
                }}
              >
                USD
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, moneda: "ARS" })}
                style={{
                  padding: "0.625rem",
                  borderRadius: "6px",
                  border: formData.moneda === "ARS" ? "2px solid #3b82f6" : "2px solid #d1d5db",
                  backgroundColor: formData.moneda === "ARS" ? "#eff6ff" : "white",
                  color: formData.moneda === "ARS" ? "#1d4ed8" : "#374151",
                  fontWeight: "500",
                  cursor: "pointer",
                  fontSize: "0.875rem"
                }}
              >
                ARS
              </button>
            </div>
          </div>

          {/* Tipo de Cambio (solo si es ARS) */}
          {formData.moneda === "ARS" && (
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem", fontSize: "0.875rem", color: "#374151" }}>
                Tipo de Cambio (USD/ARS) *
              </label>
              <input
                type="number"
                name="tipo_cambio_usado"
                value={formData.tipo_cambio_usado}
                onChange={handleChange}
                step="0.01"
                min="0"
                required
                style={{
                  width: "100%",
                  padding: "0.625rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "0.875rem"
                }}
                placeholder="1500.00"
              />
              <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem", margin: "0.25rem 0 0 0" }}>
                Tipo de cambio del día
              </p>
            </div>
          )}

          {/* Equivalencia */}
          {equivalencia && (
            <div style={{
              backgroundColor: "#f9fafb",
              borderRadius: "8px",
              padding: "1rem",
              marginBottom: "1rem",
              border: "1px solid #e5e7eb"
            }}>
              <p style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem", margin: "0 0 0.25rem 0" }}>
                Equivalencia:
              </p>
              <p style={{ fontSize: "1.125rem", fontWeight: "700", color: "#111827", margin: "0.25rem 0" }}>
                {equivalencia.principal}
              </p>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: "0.25rem 0 0 0" }}>
                {equivalencia.equivalente}
              </p>
            </div>
          )}

          {/* Comentario */}
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", fontWeight: "600", marginBottom: "0.5rem", fontSize: "0.875rem", color: "#374151" }}>
              ­Comentario (opcional)
            </label>
            <textarea
              name="comentario"
              value={formData.comentario}
              onChange={handleChange}
              rows={3}
              style={{
                width: "100%",
                padding: "0.625rem",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "0.875rem",
                fontFamily: "inherit",
                resize: "vertical"
              }}
              placeholder="Ej: Asignaci├│n inicial, Ajuste de estrategia..."
            />
          </div>

          {/* Mensajes */}
          {error && (
            <div
              style={{
                backgroundColor: "#fee2e2",
                color: "#dc2626",
                padding: "0.75rem",
                borderRadius: "4px",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span>ÔÜá´©Å</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              style={{
                backgroundColor: "#d1fae5",
                color: "#059669",
                padding: "0.75rem",
                borderRadius: "4px",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span>Ô£ô</span>
              <span>{success}</span>
            </div>
          )}

          {/* Botones */}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || excedeDisponible}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: excedeDisponible || loading ? "#9ca3af" : "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: excedeDisponible || loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Procesando..." : "Confirmar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
