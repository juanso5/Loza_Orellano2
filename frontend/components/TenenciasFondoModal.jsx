"use client";

import { useState, useEffect } from 'react';

export default function TenenciasFondoModal({ fondo, onClose, onSelectEspecie, onDeleteFondo }) {
  const [tenencias, setTenencias] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [movimientosLiquidez, setMovimientosLiquidez] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detalleMovimiento, setDetalleMovimiento] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [filtroEspecie, setFiltroEspecie] = useState('');
  
  useEffect(() => {
    if (!fondo?.id_fondo) return;
    
    setLoading(true);
    setError(null);
    
    // Cargar tenencias
    const tenenciasPromise = fetch(`/api/fondo/${fondo.id_fondo}/tenencias`)
      .then(r => {
        if (!r.ok) throw new Error('Error al cargar tenencias');
        return r.json();
      })
      .then(data => {
        if (data.success) {
          setTenencias(data.data.tenencias || []);
          setResumen(data.data.resumen || null);
        } else {
          throw new Error(data.error || 'Error desconocido');
        }
      });
    
    // Cargar movimientos de liquidez (depósitos y extracciones)
    const liquidezPromise = fetch(`/api/liquidez/movimientos?fondo_id=${fondo.id_fondo}`)
      .then(r => {
        if (!r.ok) throw new Error('Error al cargar movimientos');
        return r.json();
      })
      .then(data => {
        if (data.success) {
          setMovimientosLiquidez(data.data || []);
        }
      })
      .catch(err => {
        console.error('Error cargando movimientos liquidez:', err);
      });
    
    Promise.all([tenenciasPromise, liquidezPromise])
      .catch(err => {
        console.error('Error cargando datos:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [fondo?.id_fondo]);
  
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };
  
  const nombreFondo = fondo?.nombre || fondo?.tipo_cartera?.descripcion || `Fondo #${fondo?.id_fondo}`;
  
  // Detectar si es estrategia con tipo de cambio (viajes u objetivo)
  const estrategia = fondo?.metadata?.estrategia;
  const tipoCambio = fondo?.metadata?.tipo_cambio;
  const mostrarDualCurrency = (estrategia === 'viajes' || estrategia === 'objetivo') && tipoCambio > 0;
  const liquidezUSD = fondo?.liquidez_disponible || 0;
  const liquidezARS = mostrarDualCurrency ? liquidezUSD * tipoCambio : 0;
  
  return (
    <div 
      className="modal" 
      style={{ display: 'flex' }}
      onClick={handleOverlayClick}
    >
      <div className="modal-dialog" style={{ maxWidth: '1000px', width: '90%' }}>
        <header className="modal-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '2px solid #e5e7eb',
          gap: '1rem'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700', color: '#111827', flex: 1 }}>
            📊 Tenencias - {nombreFondo}
          </h2>
          
          {fondo?.liquidez_disponible !== undefined && (
            <div style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#dcfce7',
              border: '2px solid #86efac',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '0.25rem',
              minWidth: mostrarDualCurrency ? '200px' : 'auto'
            }}>
              <div style={{ 
                fontSize: '0.7rem', 
                color: '#15803d', 
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                💵 Liquidez Disponible
              </div>
              <div style={{ 
                fontSize: '1.125rem', 
                fontWeight: '800', 
                color: '#166534',
                lineHeight: '1'
              }}>
                ${Number(liquidezUSD).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: '600' }}>USD</div>
              
              {mostrarDualCurrency && (
                <>
                  <div style={{ 
                    width: '100%', 
                    height: '1px', 
                    backgroundColor: '#86efac', 
                    margin: '0.25rem 0' 
                  }} />
                  <div style={{ 
                    fontSize: '0.9375rem', 
                    fontWeight: '700', 
                    color: '#166534',
                    lineHeight: '1'
                  }}>
                    ${Number(liquidezARS).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: '#16a34a', fontWeight: '500' }}>
                    ARS (TC: ${tipoCambio.toLocaleString('es-AR')})
                  </div>
                </>
              )}
            </div>
          )}
          
          <button 
            onClick={onClose}
            className="modal-close"
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '0.25rem 0.5rem',
              lineHeight: '1'
            }}
          >
            &times;
          </button>
        </header>
        
        <div className="modal-body" style={{ padding: '1.5rem' }}>
          {loading && (
            <div style={{ 
              padding: '3rem', 
              textAlign: 'center', 
              color: '#6b7280',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '3px solid #e5e7eb',
                borderTopColor: '#3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <p>Cargando tenencias...</p>
            </div>
          )}
          
          {error && (
            <div style={{ 
              padding: '1rem', 
              background: '#fee2e2', 
              border: '1px solid #ef4444',
              borderRadius: '8px',
              color: '#991b1b',
              marginBottom: '1rem'
            }}>
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {!loading && !error && (
            <>
              {/* Barra de filtro */}
              {tenencias.length > 0 && (
                <div style={{ marginBottom: '1rem', position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="🔍 Buscar especie..."
                    value={filtroEspecie}
                    onChange={(e) => setFiltroEspecie(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 40px 10px 16px',
                      fontSize: '0.875rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  {filtroEspecie && (
                    <button
                      onClick={() => setFiltroEspecie('')}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#6b7280',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        padding: '4px'
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}

              {/* Contador de resultados filtrados */}
              {filtroEspecie && tenencias.length > 0 && (
                <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                  Mostrando {tenencias.filter(t => 
                    (t.especie_nombre || '').toLowerCase().includes(filtroEspecie.toLowerCase())
                  ).length} de {tenencias.length} especies
                </p>
              )}

              {/* Tabla de Tenencias con scroll */}
              {tenencias.length > 0 ? (
                <div style={{ 
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    maxHeight: '400px',
                    overflowY: 'auto',
                    overflowX: 'auto'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>
                            Especie
                          </th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>
                            Cantidad
                          </th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>
                            Precio Promedio
                          </th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>
                            Precio Actual
                          </th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>
                            Valor Total
                          </th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>
                            Rendimiento
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {tenencias
                          .filter(t => 
                            !filtroEspecie || 
                            (t.especie_nombre || '').toLowerCase().includes(filtroEspecie.toLowerCase())
                          )
                          .map((t, idx) => (
                        <tr 
                          key={idx}
                          onClick={() => onSelectEspecie?.(t)}
                          style={{ 
                            cursor: 'pointer', 
                            borderBottom: '1px solid #f3f4f6',
                            transition: 'background 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <td style={{ 
                            padding: '0.875rem 1rem', 
                            fontWeight: '600', 
                            color: '#111827',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: t.precio_actual ? '#10b981' : '#9ca3af'
                            }}></div>
                            {t.especie_nombre}
                          </td>
                          <td style={{ padding: '0.875rem 1rem', textAlign: 'right', color: '#6b7280', fontWeight: '500' }}>
                            {t.cantidad_actual?.toLocaleString('es-AR') || 0}
                          </td>
                          <td style={{ padding: '0.875rem 1rem', textAlign: 'right', color: '#6b7280', fontSize: '0.875rem' }}>
                            {t.precio_promedio_compra_usd 
                              ? (
                                <div>
                                  <div style={{ fontWeight: '600', color: '#111827' }}>
                                    US$ {t.precio_promedio_compra_usd.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                  {mostrarDualCurrency && tipoCambio && (
                                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '2px' }}>
                                      $ {(t.precio_promedio_compra_usd * tipoCambio).toLocaleString('es-AR', { minimumFractionDigits: 2 })} ARS
                                    </div>
                                  )}
                                </div>
                              )
                              : <span style={{ color: '#9ca3af' }}>-</span>
                            }
                          </td>
                          <td style={{ padding: '0.875rem 1rem', textAlign: 'right', color: '#6b7280' }}>
                            {t.precio_actual_usd 
                              ? (
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                    {t.dias_desde_actualizacion > 7 && (
                                      <span title={`Precio desactualizado (${t.dias_desde_actualizacion} días)`}>⚠️</span>
                                    )}
                                    <span style={{ fontWeight: '600', color: '#111827' }}>
                                      US$ {t.precio_actual_usd.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  {mostrarDualCurrency && tipoCambio && (
                                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginTop: '2px' }}>
                                      $ {(t.precio_actual_usd * tipoCambio).toLocaleString('es-AR', { minimumFractionDigits: 2 })} ARS
                                    </div>
                                  )}
                                </div>
                              )
                              : <span style={{ color: '#9ca3af' }}>Sin precio</span>
                            }
                          </td>
                          <td style={{ padding: '0.875rem 1rem', textAlign: 'right', fontWeight: '600', color: '#111827' }}>
                            <div>
                              <div>US$ {t.valor_total_usd?.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</div>
                              {mostrarDualCurrency && tipoCambio && (
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '500', marginTop: '2px' }}>
                                  $ {((t.valor_total_usd || 0) * tipoCambio).toLocaleString('es-AR', { minimumFractionDigits: 2 })} ARS
                                </div>
                              )}
                            </div>
                          </td>
                          <td style={{ 
                            padding: '0.875rem 1rem', 
                            textAlign: 'right', 
                            fontWeight: '600',
                            color: (t.ganancia_perdida_usd || 0) >= 0 ? '#10b981' : '#ef4444'
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.125rem' }}>
                              <span>
                                {(t.ganancia_perdida_usd || 0) >= 0 ? '+' : ''}
                                ${Math.abs(t.ganancia_perdida_usd || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                                ({(t.rendimiento_porcentaje || 0) >= 0 ? '+' : ''}{t.rendimiento_porcentaje?.toFixed(2) || '0.00'}%)
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              ) : (
                <div style={{ 
                  padding: '3rem', 
                  textAlign: 'center', 
                  color: '#6b7280',
                  background: '#f9fafb',
                  borderRadius: '12px',
                  border: '1px dashed #d1d5db'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📊</div>
                  <p style={{ margin: 0, fontSize: '1rem', fontWeight: '500' }}>
                    No hay especies en este fondo
                  </p>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#9ca3af' }}>
                    Las especies aparecerán aquí cuando realices operaciones de compra
                  </p>
                </div>
              )}
              
              {/* Historial de Depósitos y Extracciones */}
              <div style={{ marginTop: '2rem' }}>
                <h3 style={{ 
                  fontSize: '1rem', 
                  fontWeight: '600', 
                  color: '#111827',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  💰 Depósitos y Extracciones
                </h3>
                
                {movimientosLiquidez.length > 0 ? (
                  <div style={{ 
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    overflow: 'hidden'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                            Fecha
                          </th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                            Tipo
                          </th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                            Monto
                          </th>
                          <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>
                            Observaciones
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {movimientosLiquidez.map((mov, idx) => {
                          const esDeposito = mov.tipo_operacion === 'asignacion' || mov.tipo_mov === 'deposito';
                          const monto = mov.monto_usd || mov.monto || 0;
                          
                          return (
                            <tr key={mov.id || idx} style={{ 
                              borderBottom: idx < movimientosLiquidez.length - 1 ? '1px solid #f3f4f6' : 'none',
                              transition: 'background 0.15s',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                            onClick={() => setDetalleMovimiento(mov)}
                            >
                              <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#374151' }}>
                                {new Date(mov.fecha).toLocaleDateString('es-AR', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </td>
                              <td style={{ padding: '0.75rem 1rem' }}>
                                <span style={{
                                  display: 'inline-block',
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '9999px',
                                  fontSize: '0.75rem',
                                  fontWeight: '600',
                                  background: esDeposito ? '#dcfce7' : '#fee2e2',
                                  color: esDeposito ? '#166534' : '#991b1b',
                                  border: `1px solid ${esDeposito ? '#86efac' : '#fca5a5'}`
                                }}>
                                  {esDeposito ? '⬇ Depósito' : '⬆ Extracción'}
                                </span>
                              </td>
                              <td style={{ 
                                padding: '0.75rem 1rem', 
                                textAlign: 'right',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                color: esDeposito ? '#10b981' : '#ef4444'
                              }}>
                                {esDeposito ? '+' : '-'}${Math.abs(monto).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td style={{ 
                                padding: '0.75rem 1rem', 
                                fontSize: '0.875rem', 
                                color: '#6b7280',
                                maxWidth: '300px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {mov.comentario || mov.observaciones || '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ 
                    padding: '2rem', 
                    textAlign: 'center', 
                    color: '#6b7280',
                    background: '#f9fafb',
                    borderRadius: '12px',
                    border: '1px dashed #d1d5db',
                    fontSize: '0.875rem'
                  }}>
                    No hay movimientos de depósitos o extracciones registrados
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        
        <footer className="modal-footer" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          gap: '0.75rem',
          padding: '1rem 1.5rem',
          borderTop: '1px solid #e5e7eb',
          background: '#f9fafb'
        }}>
          {/* Botón de eliminar a la izquierda */}
          <button 
            onClick={() => setShowDeleteConfirm(true)} 
            className="btn"
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '8px',
              border: '2px solid #ef4444',
              background: '#fff',
              color: '#ef4444',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ef4444';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#fff';
              e.currentTarget.style.color = '#ef4444';
            }}
          >
            🗑️ Eliminar Fondo
          </button>

          {/* Botón de cerrar a la derecha */}
          <button 
            onClick={onClose} 
            className="btn"
            style={{
              padding: '0.5rem 1.5rem',
              borderRadius: '8px',
              border: '1px solid #d1d5db',
              background: '#fff',
              color: '#374151',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
          >
            Cerrar
          </button>
        </footer>

        {/* Mini-modal de confirmación de eliminación */}
        {showDeleteConfirm && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000
            }}
            onClick={() => setShowDeleteConfirm(false)}
          >
            <div 
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '400px',
                width: '90%',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '0.5rem' }}>
                  ¿Eliminar este fondo?
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>
                  Se eliminará <strong>{nombreFondo}</strong>. Esta acción no se puede deshacer.
                </p>
                {(tenencias.length > 0 || movimientosLiquidez.length > 0) && (
                  <p style={{ 
                    fontSize: '0.875rem', 
                    color: '#ef4444', 
                    marginTop: '0.75rem',
                    padding: '0.75rem',
                    background: '#fee2e2',
                    borderRadius: '8px',
                    border: '1px solid #fca5a5'
                  }}>
                    ⚠️ Este fondo tiene {tenencias.length} especie(s) y {movimientosLiquidez.length} movimiento(s)
                  </p>
                )}
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    padding: '0.5rem 1.5rem',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    background: '#fff',
                    color: '#374151',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    onDeleteFondo?.(fondo.id_fondo);
                    onClose?.();
                  }}
                  style={{
                    padding: '0.5rem 1.5rem',
                    borderRadius: '8px',
                    border: '2px solid #ef4444',
                    background: '#ef4444',
                    color: '#fff',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#dc2626'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#ef4444'}
                >
                  Sí, Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Modal de Detalle de Movimiento */}
      {detalleMovimiento && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDetalleMovimiento(null);
          }}
        >
          <div style={{
            background: '#fff',
            borderRadius: '16px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: detalleMovimiento.tipo_operacion === 'asignacion' ? '#dcfce7' : '#fee2e2'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: '700', color: '#111827' }}>
                {detalleMovimiento.tipo_operacion === 'asignacion' ? '⬇ Depósito' : '⬆ Extracción'}
              </h3>
              <button
                onClick={() => setDetalleMovimiento(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0',
                  lineHeight: '1'
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              {/* Monto Principal */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: '#6b7280', 
                  marginBottom: '0.5rem',
                  textTransform: 'uppercase',
                  fontWeight: '600'
                }}>
                  Monto
                </div>
                <div style={{ 
                  fontSize: '2rem', 
                  fontWeight: '800',
                  color: detalleMovimiento.tipo_operacion === 'asignacion' ? '#10b981' : '#ef4444'
                }}>
                  {detalleMovimiento.tipo_operacion === 'asignacion' ? '+' : '-'}
                  ${Math.abs(detalleMovimiento.monto_usd || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span style={{ fontSize: '1rem', marginLeft: '0.5rem', color: '#6b7280' }}>USD</span>
                </div>
              </div>
              
              {/* Conversión de Moneda y Tipo de Cambio */}
              {(detalleMovimiento.moneda || detalleMovimiento.tipo_cambio) && (
                <div style={{ 
                  background: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '12px',
                  padding: '1rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '1rem' 
                  }}>
                    {/* Monto Original */}
                    <div>
                      <div style={{ 
                        fontSize: '0.7rem', 
                        color: '#0369a1', 
                        marginBottom: '0.25rem',
                        textTransform: 'uppercase',
                        fontWeight: '600'
                      }}>
                        Monto Original
                      </div>
                      <div style={{ 
                        fontSize: '1.125rem', 
                        fontWeight: '700',
                        color: '#0c4a6e'
                      }}>
                        {detalleMovimiento.moneda === 'ARS' ? '$' : 'US$'}
                        {Math.abs(detalleMovimiento.monto || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span style={{ fontSize: '0.75rem', marginLeft: '0.25rem', color: '#0369a1' }}>
                          {detalleMovimiento.moneda}
                        </span>
                      </div>
                    </div>
                    
                    {/* Tipo de Cambio */}
                    <div>
                      <div style={{ 
                        fontSize: '0.7rem', 
                        color: '#0369a1', 
                        marginBottom: '0.25rem',
                        textTransform: 'uppercase',
                        fontWeight: '600'
                      }}>
                        Tipo de Cambio
                      </div>
                      <div style={{ 
                        fontSize: '1.125rem', 
                        fontWeight: '700',
                        color: '#0c4a6e'
                      }}>
                        ${Number(detalleMovimiento.tipo_cambio).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  
                  {/* Cálculo de conversión */}
                  {detalleMovimiento.moneda === 'ARS' && (
                    <div style={{ 
                      marginTop: '0.75rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid #bae6fd',
                      fontSize: '0.75rem',
                      color: '#0369a1',
                      textAlign: 'center'
                    }}>
                      ${Math.abs(detalleMovimiento.monto || 0).toLocaleString('es-AR')} ARS ÷ {Number(detalleMovimiento.tipo_cambio).toFixed(2)} = ${Math.abs(detalleMovimiento.monto_usd || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })} USD
                    </div>
                  )}
                  {detalleMovimiento.moneda === 'USD' && (
                    <div style={{ 
                      marginTop: '0.75rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid #bae6fd',
                      fontSize: '0.75rem',
                      color: '#0369a1',
                      textAlign: 'center'
                    }}>
                      ${Math.abs(detalleMovimiento.monto || 0).toLocaleString('es-AR')} USD × {Number(detalleMovimiento.tipo_cambio).toFixed(2)} = ${(Math.abs(detalleMovimiento.monto || 0) * Number(detalleMovimiento.tipo_cambio)).toLocaleString('es-AR', { minimumFractionDigits: 2 })} ARS
                    </div>
                  )}
                </div>
              )}
              
              
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: '#6b7280', 
                  marginBottom: '0.25rem',
                  textTransform: 'uppercase',
                  fontWeight: '600'
                }}>
                  Fecha
                </div>
                <div style={{ fontSize: '0.875rem', color: '#374151' }}>
                  {new Date(detalleMovimiento.fecha).toLocaleString('es-AR', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
              
              {(detalleMovimiento.comentario || detalleMovimiento.observaciones) && (
                <div>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: '#6b7280', 
                    marginBottom: '0.25rem',
                    textTransform: 'uppercase',
                    fontWeight: '600'
                  }}>
                    Comentario
                  </div>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    color: '#374151',
                    background: '#f9fafb',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    lineHeight: '1.5'
                  }}>
                    {detalleMovimiento.comentario || detalleMovimiento.observaciones}
                  </div>
                </div>
              )}
            </div>
            
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e5e7eb',
              background: '#f9fafb',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setDetalleMovimiento(null)}
                style={{
                  padding: '0.5rem 1.5rem',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  color: '#374151',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
