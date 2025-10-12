'use client';
import { useState, useEffect, useMemo } from 'react';

/**
 * AddPortfolioModal - Crear nueva cartera con campos dinámicos según estrategia
 * 
 * Props:
 * - onClose: función para cerrar el modal
 * - onSave: función callback que recibe el payload para crear el fondo
 * - clienteId: ID del cliente (opcional, si no se pasa se pide seleccionar)
 */
export default function AddPortfolioModal({ onClose, onSave, clienteId = null }) {
  // Estados
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState([]);
  const [tiposCartera, setTiposCartera] = useState([]);
  const [liquidezDisponible, setLiquidezDisponible] = useState(null);
  
  // Formulario base
  const [clienteIdForm, setClienteIdForm] = useState(clienteId || '');
  const [tipoCarteraId, setTipoCarteraId] = useState('');
  const [liquidezInicial, setLiquidezInicial] = useState('');
  
  // Campos de metadata dinámicos
  const [metadata, setMetadata] = useState({});

  // Cargar clientes
  useEffect(() => {
    if (clienteId) return; // Si ya tenemos cliente, no cargamos
    
    fetch('/api/cliente', { cache: 'no-store' })
      .then(r => r.json())
      .then(j => {
        const list = Array.isArray(j?.data) ? j.data : [];
        setClientes(list.map(c => ({
          id: Number(c.id ?? c.id_cliente),
          nombre: c.name || c.nombre || 'Sin nombre'
        })));
      })
      .catch(err => console.error('Error cargando clientes:', err));
  }, [clienteId]);

  // Cargar tipos de cartera
  useEffect(() => {
    fetch('/api/tipo-cartera', { cache: 'no-store' })
      .then(r => r.json())
      .then(j => {
        const list = Array.isArray(j?.data) ? j.data : [];
        // Filtrar solo los activos y ordenar
        setTiposCartera(list.filter(t => t.activo));
      })
      .catch(err => console.error('Error cargando tipos de cartera:', err));
  }, []);

  // Cargar liquidez disponible cuando se selecciona cliente
  useEffect(() => {
    const cid = clienteIdForm || clienteId;
    if (!cid) {
      setLiquidezDisponible(null);
      return;
    }

    fetch(`/api/liquidez/estado?cliente_id=${cid}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          setLiquidezDisponible(j.data.liquidezDisponible || 0);
        }
      })
      .catch(err => console.error('Error cargando liquidez:', err));
  }, [clienteIdForm, clienteId]);

  // Limpiar metadata cuando cambia el tipo de cartera
  useEffect(() => {
    setMetadata({});
  }, [tipoCarteraId]);

  // Obtener la categoría del tipo de cartera seleccionado
  const categoriaSeleccionada = useMemo(() => {
    const tipo = tiposCartera.find(t => Number(t.id) === Number(tipoCarteraId));
    if (!tipo?.categoria) return null;
    // Normalizar categoría a minúsculas para comparación
    return tipo.categoria.trim().toLowerCase();
  }, [tipoCarteraId, tiposCartera]);

  // Validaciones
  const errors = useMemo(() => {
    const errs = {};
    
    if (!clienteIdForm && !clienteId) {
      errs.cliente = 'Debe seleccionar un cliente';
    }
    
    if (!tipoCarteraId || tipoCarteraId === '' || tipoCarteraId === '0') {
      errs.tipo_cartera = 'Debe seleccionar un tipo de cartera';
    }

    if (liquidezInicial && parseFloat(liquidezInicial) < 0) {
      errs.liquidez_inicial = 'La liquidez debe ser mayor o igual a 0';
    }

    if (liquidezInicial && liquidezDisponible !== null && parseFloat(liquidezInicial) > liquidezDisponible) {
      errs.liquidez_inicial = `Solo hay $${liquidezDisponible.toFixed(2)} USD disponibles`;
    }

    // Validaciones por estrategia
  if (categoriaSeleccionada === 'jubilacion') {
      if (!metadata.edad_actual) errs.edad_actual = 'Requerido';
      if (!metadata.edad_objetivo) errs.edad_objetivo = 'Requerido';
      if (!metadata.aporte_mensual) errs.aporte_mensual = 'Requerido';
      if (metadata.edad_actual && metadata.edad_objetivo && Number(metadata.edad_objetivo) <= Number(metadata.edad_actual)) {
        errs.edad_objetivo = 'Debe ser mayor a la edad actual';
      }
  } else if (categoriaSeleccionada === 'largo_plazo') {
      // No hay campos obligatorios
  } else if (categoriaSeleccionada === 'viajes') {
      if (!metadata.monto_objetivo) errs.monto_objetivo = 'Requerido';
      if (!metadata.descripcion) errs.descripcion = 'Requerido';
  } else if (categoriaSeleccionada === 'objetivo') {
      if (!metadata.fecha_objetivo) errs.fecha_objetivo = 'Requerido';
      if (!metadata.monto_objetivo) errs.monto_objetivo = 'Requerido';
      if (!metadata.descripcion) errs.descripcion = 'Requerido';
    }

    return errs;
  }, [clienteIdForm, clienteId, tipoCarteraId, liquidezInicial, liquidezDisponible, categoriaSeleccionada, metadata]);

  const canSubmit = Object.keys(errors).length === 0 && !loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    try {
      // Validar que tipo_cartera_id no esté vacío
      if (!tipoCarteraId || tipoCarteraId === '') {
        alert('Debe seleccionar una estrategia');
        setLoading(false);
        return;
      }

      const payload = {
        cliente_id: Number(clienteIdForm || clienteId),
        tipo_cartera_id: Number(tipoCarteraId),
        deposito_inicial: 0,
        rend_esperado: null,
        plazo: null,
        tipo_plazo: null,
        liquidez_inicial: liquidezInicial ? parseFloat(liquidezInicial) : 0,
        metadata: null,
      };

      // Agregar metadata según la estrategia
      if (categoriaSeleccionada && Object.keys(metadata).length > 0) {
        const metadataParsed = { estrategia: categoriaSeleccionada };
        
        // Parsear campos numéricos según estrategia
        if (categoriaSeleccionada === 'jubilacion') {
          metadataParsed.edad_actual = Number(metadata.edad_actual);
          metadataParsed.edad_objetivo = Number(metadata.edad_objetivo);
          metadataParsed.aporte_mensual = Number(metadata.aporte_mensual);
          if (metadata.fecha_objetivo) metadataParsed.fecha_objetivo = metadata.fecha_objetivo;
        } else if (categoriaSeleccionada === 'largo_plazo') {
          metadataParsed.permite_acciones = metadata.permite_acciones || false;
          if (metadata.descripcion) metadataParsed.descripcion = metadata.descripcion;
        } else if (categoriaSeleccionada === 'viajes') {
          metadataParsed.monto_objetivo = Number(metadata.monto_objetivo);
          metadataParsed.descripcion = metadata.descripcion;
        } else if (categoriaSeleccionada === 'objetivo') {
          metadataParsed.fecha_objetivo = metadata.fecha_objetivo;
          metadataParsed.monto_objetivo = Number(metadata.monto_objetivo);
          metadataParsed.descripcion = metadata.descripcion;
        }
        
        payload.metadata = metadataParsed;
      }

      console.log('Payload a enviar:', payload);
      await onSave(payload);
      onClose();
    } catch (err) {
      console.error('Error al crear cartera:', err);
      alert(err.message || 'Error al crear la cartera');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="modal" 
      style={{ display: 'flex' }}
      aria-hidden="false"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div className="modal-dialog">
        <header className="modal-header">
          <h2>Agregar Nuevo Fondo</h2>
          <button type="button" className="modal-close" onClick={onClose} disabled={loading}>×</button>
        </header>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Cliente */}
          {!clienteId && (
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span>Cliente <span style={{ color: '#d32f2f' }}>*</span></span>
              <select 
                value={clienteIdForm} 
                onChange={(e) => setClienteIdForm(e.target.value)}
                required
                disabled={loading}
              >
                <option value="">Seleccionar cliente</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
              {errors.cliente && <small style={{ color: '#d32f2f' }}>{errors.cliente}</small>}
            </label>
          )}

          {/* Tipo de Cartera */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span>Estrategia <span style={{ color: '#d32f2f' }}>*</span></span>
            <select 
              value={tipoCarteraId} 
              onChange={(e) => setTipoCarteraId(e.target.value)}
              required
              disabled={loading}
            >
              <option value="">Seleccionar estrategia</option>
              {tiposCartera.map(t => (
                <option key={t.id} value={t.id}>
                  {t.descripcion}
                </option>
              ))}
            </select>
            {errors.tipo_cartera && <small style={{ color: '#d32f2f' }}>{errors.tipo_cartera}</small>}
          </label>

          {/* Campos dinámicos según estrategia */}
          {categoriaSeleccionada === 'jubilacion' && (
            <>
              <div style={{ 
                padding: 12, 
                backgroundColor: '#f0f9ff', 
                borderLeft: '4px solid #0284c7',
                borderRadius: 4 
              }}>
                <strong style={{ color: '#0369a1' }}>📊 Cartera Jubilación</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#0c4a6e' }}>
                  Planificá tu retiro con aportes mensuales y proyecciones a largo plazo
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span>Edad Actual <span style={{ color: '#d32f2f' }}>*</span></span>
                  <input
                    type="number"
                    min="18"
                    max="100"
                    value={metadata.edad_actual || ''}
                    onChange={(e) => setMetadata({ ...metadata, edad_actual: e.target.value })}
                    required
                    disabled={loading}
                  />
                  {errors.edad_actual && <small style={{ color: '#d32f2f' }}>{errors.edad_actual}</small>}
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span>Edad Objetivo <span style={{ color: '#d32f2f' }}>*</span></span>
                  <input
                    type="number"
                    min="18"
                    max="100"
                    value={metadata.edad_objetivo || ''}
                    onChange={(e) => setMetadata({ ...metadata, edad_objetivo: e.target.value })}
                    required
                    disabled={loading}
                  />
                  {errors.edad_objetivo && <small style={{ color: '#d32f2f' }}>{errors.edad_objetivo}</small>}
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>Aporte Mensual (USD) <span style={{ color: '#d32f2f' }}>*</span></span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={metadata.aporte_mensual || ''}
                  onChange={(e) => setMetadata({ ...metadata, aporte_mensual: e.target.value })}
                  required
                  disabled={loading}
                  placeholder="500.00"
                />
                {errors.aporte_mensual && <small style={{ color: '#d32f2f' }}>{errors.aporte_mensual}</small>}
              </label>
            </>
          )}

          {categoriaSeleccionada === 'largo_plazo' && (
            <>
              <div style={{ 
                padding: 12, 
                backgroundColor: '#eff6ff', 
                borderLeft: '4px solid #2563eb',
                borderRadius: 4 
              }}>
                <strong style={{ color: '#1e40af' }}>📈 Cartera Largo Plazo</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#1e3a8a' }}>
                  Inversiones a largo plazo sin fecha específica de vencimiento
                </p>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={metadata.permite_acciones || false}
                  onChange={(e) => setMetadata({ ...metadata, permite_acciones: e.target.checked })}
                  disabled={loading}
                />
                <span>Permite inversión en acciones</span>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>Descripción (opcional)</span>
                <textarea
                  value={metadata.descripcion || ''}
                  onChange={(e) => setMetadata({ ...metadata, descripcion: e.target.value })}
                  rows={3}
                  disabled={loading}
                  placeholder="Describe el objetivo de esta cartera..."
                />
              </label>
            </>
          )}

          {categoriaSeleccionada === 'viajes' && (
            <>
              <div style={{ 
                padding: 12, 
                backgroundColor: '#fff7ed', 
                borderLeft: '4px solid #f97316',
                borderRadius: 4 
              }}>
                <strong style={{ color: '#c2410c' }}>✈️ Cartera Viajes</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#9a3412' }}>
                  Ahorro para viajes y experiencias, monto flexible
                </p>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>Monto Objetivo (USD) <span style={{ color: '#d32f2f' }}>*</span></span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={metadata.monto_objetivo || ''}
                  onChange={(e) => setMetadata({ ...metadata, monto_objetivo: e.target.value })}
                  required
                  disabled={loading}
                  placeholder="10000.00"
                />
                {errors.monto_objetivo && <small style={{ color: '#d32f2f' }}>{errors.monto_objetivo}</small>}
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>Descripción <span style={{ color: '#d32f2f' }}>*</span></span>
                <input
                  type="text"
                  value={metadata.descripcion || ''}
                  onChange={(e) => setMetadata({ ...metadata, descripcion: e.target.value })}
                  required
                  disabled={loading}
                  placeholder="Ej: Viaje a Europa"
                />
                {errors.descripcion && <small style={{ color: '#d32f2f' }}>{errors.descripcion}</small>}
              </label>
            </>
          )}

          {categoriaSeleccionada === 'objetivo' && (
            <>
              <div style={{ 
                padding: 12, 
                backgroundColor: '#faf5ff', 
                borderLeft: '4px solid #9333ea',
                borderRadius: 4 
              }}>
                <strong style={{ color: '#7e22ce' }}>🎯 Cartera Objetivo</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#6b21a8' }}>
                  Ahorro con fecha y monto específico de cumplimiento
                </p>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>Fecha Objetivo <span style={{ color: '#d32f2f' }}>*</span></span>
                <input
                  type="date"
                  value={metadata.fecha_objetivo || ''}
                  onChange={(e) => setMetadata({ ...metadata, fecha_objetivo: e.target.value })}
                  required
                  disabled={loading}
                />
                {errors.fecha_objetivo && <small style={{ color: '#d32f2f' }}>{errors.fecha_objetivo}</small>}
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>Monto Objetivo (USD) <span style={{ color: '#d32f2f' }}>*</span></span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={metadata.monto_objetivo || ''}
                  onChange={(e) => setMetadata({ ...metadata, monto_objetivo: e.target.value })}
                  required
                  disabled={loading}
                  placeholder="50000.00"
                />
                {errors.monto_objetivo && <small style={{ color: '#d32f2f' }}>{errors.monto_objetivo}</small>}
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>Descripción <span style={{ color: '#d32f2f' }}>*</span></span>
                <input
                  type="text"
                  value={metadata.descripcion || ''}
                  onChange={(e) => setMetadata({ ...metadata, descripcion: e.target.value })}
                  required
                  disabled={loading}
                  placeholder="Ej: Compra de auto"
                />
                {errors.descripcion && <small style={{ color: '#d32f2f' }}>{errors.descripcion}</small>}
              </label>
            </>
          )}

          {/* Liquidez Inicial */}
          {liquidezDisponible !== null && (
            <div style={{ 
              padding: 12, 
              backgroundColor: '#f0fdf4', 
              borderRadius: 4,
              border: '1px solid #86efac'
            }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontWeight: 500 }}>💰 Asignar Liquidez Inicial (opcional)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={liquidezInicial}
                  onChange={(e) => setLiquidezInicial(e.target.value)}
                  disabled={loading}
                  placeholder="0.00"
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                  <span style={{ color: '#15803d' }}>
                    Disponible: ${liquidezDisponible.toFixed(2)} USD
                  </span>
                  {liquidezInicial > 0 && (
                    <span style={{ color: '#6366f1' }}>
                      Quedará: ${(liquidezDisponible - (parseFloat(liquidezInicial) || 0)).toFixed(2)} USD
                    </span>
                  )}
                </div>
                {errors.liquidez_inicial && <small style={{ color: '#d32f2f' }}>{errors.liquidez_inicial}</small>}
              </label>
              <small style={{ display: 'block', marginTop: 8, color: '#166534' }}>
                💡 <strong>Tip:</strong> Podés asignar liquidez ahora o después desde la página de Liquidez
              </small>
            </div>
          )}

        </form>

        <footer className="modal-footer">
          <button type="button" className="btn-close" onClick={onClose} disabled={loading}>
            <i className="fas fa-times"></i> Cancelar
          </button>
          <button 
            onClick={handleSubmit} 
            className="btn-save" 
            disabled={!canSubmit}
          >
            {loading ? (
              <><i className="fas fa-spinner fa-spin"></i> Guardando...</>
            ) : (
              <><i className="fas fa-check"></i> Guardar</>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}