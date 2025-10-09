// components/AddPortfolioModal.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";

// YYYY-MM-DD para <input type="date">
function toDateInputValue(d) {
  if (!d) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// DD-MM-YYYY para mostrar
function toDisplayDMY(d) {
  if (!d) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

// Parse seguro desde YYYY-MM-DD a Date (local)
function parseDateInput(v) {
  if (!v || typeof v !== "string") return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d, 0, 0, 0, 0);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function computeEndDate(fechaAltaInput, tipoPlazo, periodo) {
  if (!fechaAltaInput || !periodo) return null;
  const start = parseDateInput(fechaAltaInput);
  if (!start) return null;

  const end = new Date(start);
  const p = Number(periodo) || 0;
  if (p <= 0) return null;

  const t = String(tipoPlazo || "").toLowerCase();
  if (t === "meses") {
    end.setMonth(end.getMonth() + p);
  } else if (t === "dias" || t === "días") {
    end.setDate(end.getDate() + p);
  } else if (t === "año" || t === "años" || t === "anio" || t === "anios") {
    end.setFullYear(end.getFullYear() + p);
  } else {
    return null;
  }
  return end;
}

const AddPortfolioModal = ({ onClose, onSave, uid, existingNames = [], tipos = [], clienteId = null }) => {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    tipo_cartera_id: "",
    name: "",
    period: "",
    tipoPlazo: "meses",
    fechaAlta: toDateInputValue(new Date()),
    rendEsperado: "",
    depositoInicial: "",
    liquidez_inicial: "",
  });
  const [liquidezDisponible, setLiquidezDisponible] = useState(null);

  const nameRef = useRef(null);

  // Autofocus en nombre
  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  // Cargar liquidez disponible del cliente
  useEffect(() => {
    if (!clienteId) return;
    
    fetch(`/api/liquidez/estado?cliente_id=${clienteId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setLiquidezDisponible(data.data.liquidezDisponible);
        }
      })
      .catch(err => console.error('Error cargando liquidez:', err));
  }, [clienteId]);

  // Cerrar con Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Validaciones
  const periodNum = Number.isFinite(parseInt(form.period, 10)) ? parseInt(form.period, 10) : NaN;
  const fechaValida = useMemo(() => !!parseDateInput(form.fechaAlta), [form.fechaAlta]);

  const errors = useMemo(() => {
    const es = {};
    if (form.name && existingNames.map((n) => n.toLowerCase().trim()).includes(form.name.toLowerCase().trim())) {
      es.name = "Ya existe una cartera con ese nombre.";
    }
    if (!Number.isFinite(periodNum) || periodNum < 1) es.period = "";
    if (!fechaValida) es.fechaAlta = "Ingresá una fecha válida.";
    if (form.rendEsperado !== "" && !Number.isFinite(Number(form.rendEsperado))) {
      es.rendEsperado = "Debe ser un número.";
    }
    if (form.depositoInicial !== "" && (!Number.isFinite(Number(form.depositoInicial)) || Number(form.depositoInicial) < 0)) {
      es.depositoInicial = "Debe ser un número mayor o igual a 0.";
    }
    if (form.liquidez_inicial !== "" && form.liquidez_inicial !== null) {
      const liq = parseFloat(form.liquidez_inicial);
      if (!Number.isFinite(liq) || liq < 0) {
        es.liquidez_inicial = "Debe ser un número mayor o igual a 0.";
      } else if (liquidezDisponible !== null && liq > liquidezDisponible) {
        es.liquidez_inicial = `Solo hay $${liquidezDisponible.toFixed(2)} USD disponibles.`;
      }
    }
    return es;
  }, [form.name, existingNames, periodNum, fechaValida, form.rendEsperado, form.depositoInicial, form.liquidez_inicial, liquidezDisponible]);

  const isSaveDisabled = submitting || Object.keys(errors).length > 0;

  // Preview de fecha fin (DD-MM-YYYY)
  const endDate = useMemo(() => computeEndDate(form.fechaAlta, form.tipoPlazo, periodNum), [form.fechaAlta, form.tipoPlazo, periodNum]);

  const handleSave = async (e) => {
    e.preventDefault();

    // Validación frontal: asegurar tipo seleccionado
    if (!form.tipo_cartera_id || String(form.tipo_cartera_id).trim() === "") {
      alert("Seleccione un tipo de cartera válido.");
      return;
    }

    const payload = {
      tipo_cartera_id: Number(form.tipo_cartera_id),
      deposito_inicial: form.deposito_inicial ? Number(form.deposito_inicial) : 0,
      rend_esperado: form.rendEsperado ? Number(form.rendEsperado) : null,
      plazo: form.period ? Number(form.period) : null,
      tipo_plazo: form.tipoPlazo || null,
      liquidez_inicial: form.liquidez_inicial ? Number(form.liquidez_inicial) : 0,
    };

    console.log("Payload creando fondo:", payload);
    try {
      setSubmitting(true);
      await onSave?.(payload);
      onClose?.();
    } catch (error) {
      console.error("Error guardando cartera:", error);
      alert(error.message || "Error al crear la cartera");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isSaveDisabled) handleSave(e);
  };

  // Cerrar al hacer click fuera del modal (overlay)
  const handleOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget && !submitting) {
      onClose?.();
    }
  };

  return (
    <div
      className="modal"
      style={{ display: "flex" }}
      aria-hidden="false"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-portfolio-title"
      onMouseDown={handleOverlayMouseDown}
    >
      <div className="modal-dialog">
        <form onSubmit={handleSubmit} noValidate>
          <header className="modal-header">
            <h2 id="add-portfolio-title">Agregar nueva cartera</h2>
            <button
              type="button"
              className="modal-close"
              onClick={onClose}
              aria-label="Cerrar"
              disabled={submitting}
            >
              &times;
            </button>
          </header>

          <div className="modal-body">
            <div className="input-group">
              <label htmlFor="add-portfolio-name">
                Nombre de la cartera <span className="required">*</span>
              </label>
              <input
                id="add-portfolio-name"
                ref={nameRef}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                aria-invalid={errors.name ? "true" : "false"}
                aria-describedby={errors.name ? "err-name" : undefined}
                disabled={submitting}
              />
              {errors.name && (
                <div className="error-message" id="err-name">
                  {errors.name}
                </div>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="tipo-plazo">Tipo de plazo</label>
              <select
                id="tipo-plazo"
                value={form.tipoPlazo}
                onChange={(e) => setForm({ ...form, tipoPlazo: e.target.value })}
                disabled={submitting}
              >
                <option value="dias">Días</option>
                <option value="meses">Meses</option>
                <option value="años">Años</option>
              </select>
            </div>

            <div className="input-group">
              <label htmlFor="add-portfolio-period">
                Periodo objetivo ({form.tipoPlazo}) <span className="required">*</span>
              </label>
              <input
                id="add-portfolio-period"
                type="number"
                min="1"
                step="1"
                value={form.period}
                onChange={(e) => setForm({ ...form, period: e.target.value })}
                aria-invalid={errors.period ? "true" : "false"}
                aria-describedby={errors.period ? "err-period" : undefined}
                disabled={submitting}
              />
              {errors.period && (
                <div className="error-message" id="err-period">
                  {errors.period}
                </div>
              )}
              <div className="hint muted">
                {endDate ? `Termina el: ${toDisplayDMY(endDate)}` : ""}
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="fecha-alta">
                Fecha de alta <span className="required">*</span>
              </label>
              <input
                id="fecha-alta"
                type="date"
                value={form.fechaAlta}
                onChange={(e) => setForm({ ...form, fechaAlta: e.target.value })}
                aria-invalid={errors.fechaAlta ? "true" : "false"}
                aria-describedby={errors.fechaAlta ? "err-fecha" : undefined}
                disabled={submitting}
              />
              {errors.fechaAlta && (
                <div className="error-message" id="err-fecha">
                  {errors.fechaAlta}
                </div>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="rend-esperado">Rendimiento esperado (opcional)</label>
              <input
                id="rend-esperado"
                type="number"
                step="any"
                value={form.rendEsperado}
                onChange={(e) => setForm({ ...form, rendEsperado: e.target.value })}
                aria-invalid={errors.rendEsperado ? "true" : "false"}
                aria-describedby={errors.rendEsperado ? "err-rend" : undefined}
                disabled={submitting}
              />
              {errors.rendEsperado && (
                <div className="error-message" id="err-rend">
                  {errors.rendEsperado}
                </div>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="deposito-inicial">Depósito inicial (opcional)</label>
              <input
                id="deposito-inicial"
                type="number"
                step="any"
                min="0"
                value={form.depositoInicial}
                onChange={(e) => setForm({ ...form, depositoInicial: e.target.value })}
                aria-invalid={errors.depositoInicial ? "true" : "false"}
                aria-describedby={errors.depositoInicial ? "err-dep" : undefined}
                disabled={submitting}
              />
              {errors.depositoInicial && (
                <div className="error-message" id="err-dep">
                  {errors.depositoInicial}
                </div>
              )}
            </div>

            <div className="input-group">
              <label htmlFor="tipo-cartera">
                Tipo de cartera <span className="required">*</span>
              </label>
              <select
                id="tipo-cartera"
                value={form.tipo_cartera_id ?? ""}
                onChange={(e) => setForm({ ...form, tipo_cartera_id: e.target.value })}
                required
                disabled={submitting}
                style={{
                  padding: "0.75rem",
                  fontSize: "1rem",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db"
                }}
              >
                <option value="">-- Seleccionar tipo de cartera --</option>
                {tipos.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.icono || '📊'} {t.descripcion} {t.categoria === 'estrategia' ? '(Estrategia)' : t.categoria === 'reserva' ? '(Reserva)' : ''}
                  </option>
                ))}
              </select>
              {form.tipo_cartera_id && (() => {
                const tipoSeleccionado = tipos.find(t => t.id === Number(form.tipo_cartera_id));
                return tipoSeleccionado?.descripcion_larga ? (
                  <div style={{ 
                    marginTop: "0.5rem", 
                    padding: "0.75rem", 
                    backgroundColor: tipoSeleccionado.color + "15",
                    borderLeft: `3px solid ${tipoSeleccionado.color}`,
                    borderRadius: "4px",
                    fontSize: "0.875rem",
                    color: "#4b5563"
                  }}>
                    <strong style={{ color: tipoSeleccionado.color }}>
                      {tipoSeleccionado.icono} {tipoSeleccionado.descripcion}:
                    </strong>
                    {" "}{tipoSeleccionado.descripcion_larga}
                  </div>
                ) : null;
              })()}
            </div>

            {/* Liquidez inicial a asignar */}
            {form.tipo_cartera_id && liquidezDisponible !== null && (
              <div className="input-group">
                <label htmlFor="liquidez-inicial">
                  Liquidez inicial a asignar (USD)
                </label>
                <input
                  id="liquidez-inicial"
                  type="number"
                  step="0.01"
                  min="0"
                  max={liquidezDisponible}
                  value={form.liquidez_inicial}
                  onChange={(e) => setForm({ ...form, liquidez_inicial: e.target.value })}
                  placeholder="0.00"
                  disabled={submitting}
                  style={{
                    padding: "0.5rem",
                    fontSize: "1rem",
                    borderRadius: "6px",
                    border: errors.liquidez_inicial ? "1px solid #ef4444" : "1px solid #d1d5db"
                  }}
                />
                <div style={{ 
                  marginTop: "0.5rem", 
                  fontSize: "0.875rem",
                  color: "#6b7280",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <span>
                    <i className="fas fa-wallet" style={{ marginRight: '0.5rem' }}></i> Disponible: <strong style={{ color: "#10b981" }}>
                      ${liquidezDisponible.toFixed(2)} USD
                    </strong>
                  </span>
                  {form.liquidez_inicial > 0 && (
                    <span style={{ color: "#6366f1" }}>
                      Quedará: ${(liquidezDisponible - (parseFloat(form.liquidez_inicial) || 0)).toFixed(2)}
                    </span>
                  )}
                </div>
                {errors.liquidez_inicial && (
                  <div className="error-message" style={{ color: "#ef4444", fontSize: "0.875rem", marginTop: "0.25rem" }}>
                    {errors.liquidez_inicial}
                  </div>
                )}
                <div style={{ 
                  marginTop: "0.5rem", 
                  padding: "0.5rem", 
                  backgroundColor: "#eff6ff",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  color: "#1e40af"
                }}>
                  <i className="fas fa-lightbulb" style={{ marginRight: '0.5rem' }}></i> <strong>Tip:</strong> Puedes asignar liquidez ahora o después desde la página de Liquidez
                </div>
              </div>
            )}
          </div>

          <footer className="modal-footer">
            <button
              type="submit"
              className="btn-save"
              disabled={isSaveDisabled}
              aria-disabled={isSaveDisabled}
            >
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i> Guardando…
                </>
              ) : (
                <>
                  <i className="fas fa-check"></i> Guardar
                </>
              )}
            </button>
            <button type="button" className="btn-close" onClick={onClose} disabled={submitting}>
              <i className="fas fa-times"></i> Cancelar
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default AddPortfolioModal;