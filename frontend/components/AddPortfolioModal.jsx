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
  const [nombreFondo, setNombreFondo] = useState('');
  
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

    if (!nombreFondo || nombreFondo.trim() === '') {
      errs.nombre = 'El nombre del fondo es requerido';
    }

    if (nombreFondo && nombreFondo.length > 255) {
      errs.nombre = 'El nombre no puede superar los 255 caracteres';
    }

    if (liquidezInicial && parseFloat(liquidezInicial) < 0) {
      errs.liquidez_inicial = 'La liquidez debe ser mayor o igual a 0';
    }

    if (liquidezInicial && liquidezDisponible !== null && parseFloat(liquidezInicial) > liquidezDisponible) {
      errs.liquidez_inicial = `Solo hay $${liquidezDisponible.toFixed(2)} USD disponibles`;
    }

    // Validaciones por estrategia
  if (categoriaSeleccionada === 'jubilacion') {
      if (!metadata.anos) errs.anos = 'Requerido';
      if (metadata.anos && Number(metadata.anos) <= 0) {
        errs.anos = 'Debe ser mayor a 0';
      }
  } else if (categoriaSeleccionada === 'largo_plazo') {
      // No hay campos obligatorios
  } else if (categoriaSeleccionada === 'viajes') {
      if (!metadata.monto_objetivo) errs.monto_objetivo = 'Requerido';
      if (!metadata.moneda) errs.moneda = 'Requerido';
  } else if (categoriaSeleccionada === 'objetivo') {
      if (!metadata.fecha_objetivo) errs.fecha_objetivo = 'Requerido';
      if (!metadata.monto_objetivo) errs.monto_objetivo = 'Requerido';
      if (!metadata.moneda) errs.moneda = 'Requerido';
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
        nombre: nombreFondo.trim(),
        deposito_inicial: 0,
        rend_esperado: metadata.rend_esperado ? parseFloat(metadata.rend_esperado) : null,
        plazo: null,
        tipo_plazo: null,
        liquidez_inicial: liquidezInicial ? parseFloat(liquidezInicial) : 0,
        metadata: null,
      };

      // Agregar metadata según la estrategia
      if (categoriaSeleccionada) {
        const metadataParsed = { estrategia: categoriaSeleccionada };
        
        // Parsear campos según estrategia
        if (categoriaSeleccionada === 'jubilacion') {
          const anosNum = Number(metadata.anos);
          if (!isNaN(anosNum) && anosNum > 0) {
            metadataParsed.anos = anosNum;
          } else {
            throw new Error('Años objetivo es requerido y debe ser mayor a 0');
          }
          if (metadata.comentario) metadataParsed.comentario = metadata.comentario;
        } else if (categoriaSeleccionada === 'largo_plazo') {
          if (metadata.comentario) metadataParsed.comentario = metadata.comentario;
        } else if (categoriaSeleccionada === 'viajes') {
          const montoNum = Number(metadata.monto_objetivo);
          if (!isNaN(montoNum) && montoNum > 0) {
            metadataParsed.monto_objetivo = montoNum;
          } else {
            throw new Error('Monto objetivo es requerido y debe ser mayor a 0');
          }
          metadataParsed.moneda = metadata.moneda || 'USD';
          if (metadata.comentario) metadataParsed.comentario = metadata.comentario;
        } else if (categoriaSeleccionada === 'objetivo') {
          if (!metadata.fecha_objetivo) {
            throw new Error('Fecha objetivo es requerida');
          }
          metadataParsed.fecha_objetivo = metadata.fecha_objetivo;
          const montoNum = Number(metadata.monto_objetivo);
          if (!isNaN(montoNum) && montoNum > 0) {
            metadataParsed.monto_objetivo = montoNum;
          } else {
            throw new Error('Monto objetivo es requerido y debe ser mayor a 0');
          }
          metadataParsed.moneda = metadata.moneda || 'USD';
          if (metadata.comentario) metadataParsed.comentario = metadata.comentario;
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

          {/* Nombre del Fondo */}
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span>Nombre del Fondo <span style={{ color: '#d32f2f' }}>*</span></span>
            <input
              type="text"
              value={nombreFondo}
              onChange={(e) => setNombreFondo(e.target.value)}
              required
              disabled={loading}
              placeholder="Ej: Auto 0km, Viaje a Europa, Casa propia, etc."
              maxLength={255}
            />
            <small style={{ color: '#666' }}>
              Nombre personalizado para identificar este fondo
            </small>
            {errors.nombre && <small style={{ color: '#d32f2f' }}>{errors.nombre}</small>}
          </label>

          {/* Campos dinámicos según estrategia */}
          {categoriaSeleccionada === 'jubilacion' && (
            <>
              <div style={{ 
                padding: 12, 
                backgroundColor: '#f0f9ff', 
                borderLeft: '4px solid #4CAF50',
                borderRadius: 4 
              }}>
                <strong style={{ color: '#2e7d32' }}>📊 Cartera Jubilación (USD)</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#1b5e20' }}>
                  Planificá tu retiro a largo plazo
                </p>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>Años Objetivo <span style={{ color: '#d32f2f' }}>*</span></span>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={metadata.anos || ''}
                  onChange={(e) => setMetadata({ ...metadata, anos: e.target.value })}
                  required
                  disabled={loading}
                  placeholder="Ej: 20"
                />
                <small style={{ color: '#666' }}>¿Cuántos años faltan para tu jubilación?</small>
                {errors.anos && <small style={{ color: '#d32f2f' }}>{errors.anos}</small>}
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>Rendimiento Esperado (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={metadata.rend_esperado || ''}
                  onChange={(e) => setMetadata({ ...metadata, rend_esperado: e.target.value })}
                  disabled={loading}
                  placeholder="Ej: 8.5"
                />
                <small style={{ color: '#666' }}>Opcional: Rendimiento anual esperado</small>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>Comentario</span>
                <textarea
                  value={metadata.comentario || ''}
                  onChange={(e) => setMetadata({ ...metadata, comentario: e.target.value })}
                  rows={3}
                  disabled={loading}
                  placeholder="Notas adicionales sobre esta cartera..."
                />
              </label>
            </>
          )}

          {categoriaSeleccionada === 'largo_plazo' && (
            <>
              <div style={{ 
                padding: 12, 
                backgroundColor: '#eff6ff', 
                borderLeft: '4px solid #2196F3',
                borderRadius: 4 
              }}>
                <strong style={{ color: '#1565c0' }}>📈 Cartera Largo Plazo (USD)</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#0d47a1' }}>
                  Inversiones a largo plazo sin fecha específica
                </p>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>Comentario</span>
                <textarea
                  value={metadata.comentario || ''}
                  onChange={(e) => setMetadata({ ...metadata, comentario: e.target.value })}
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
                borderLeft: '4px solid #FF9800',
                borderRadius: 4 
              }}>
                <strong style={{ color: '#e65100' }}>✈️ Cartera Viajes (ARS o USD)</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#bf360c' }}>
                  Ahorro para viajes y experiencias
                </p>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>Moneda <span style={{ color: '#d32f2f' }}>*</span></span>
                <select
                  value={metadata.moneda || 'USD'}
                  onChange={(e) => setMetadata({ ...metadata, moneda: e.target.value })}
                  required
                  disabled={loading}
                >
                  <option value="USD">USD - Dólares</option>
                  <option value="ARS">ARS - Pesos</option>
                </select>
                {errors.moneda && <small style={{ color: '#d32f2f' }}>{errors.moneda}</small>}
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>Monto Objetivo <span style={{ color: '#d32f2f' }}>*</span></span>
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
                <span>Comentario</span>
                <textarea
                  value={metadata.comentario || ''}
                  onChange={(e) => setMetadata({ ...metadata, comentario: e.target.value })}
                  rows={3}
                  disabled={loading}
                  placeholder="Ej: Viaje a Europa 2026"
                />
              </label>
            </>
          )}

          {categoriaSeleccionada === 'objetivo' && (
            <>
              <div style={{ 
                padding: 12, 
                backgroundColor: '#faf5ff', 
                borderLeft: '4px solid #9C27B0',
                borderRadius: 4 
              }}>
                <strong style={{ color: '#6a1b9a' }}>🎯 Cartera Objetivo (ARS o USD)</strong>
                <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#4a148c' }}>
                  Ahorro con fecha y monto específico
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
                  min={new Date().toISOString().split('T')[0]}
                />
                {errors.fecha_objetivo && <small style={{ color: '#d32f2f' }}>{errors.fecha_objetivo}</small>}
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>Moneda <span style={{ color: '#d32f2f' }}>*</span></span>
                <select
                  value={metadata.moneda || 'USD'}
                  onChange={(e) => setMetadata({ ...metadata, moneda: e.target.value })}
                  required
                  disabled={loading}
                >
                  <option value="USD">USD - Dólares</option>
                  <option value="ARS">ARS - Pesos</option>
                </select>
                {errors.moneda && <small style={{ color: '#d32f2f' }}>{errors.moneda}</small>}
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>Monto Objetivo <span style={{ color: '#d32f2f' }}>*</span></span>
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
                <span>Comentario</span>
                <textarea
                  value={metadata.comentario || ''}
                  onChange={(e) => setMetadata({ ...metadata, comentario: e.target.value })}
                  rows={3}
                  disabled={loading}
                  placeholder="Ej: Compra de auto 0km"
                />
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