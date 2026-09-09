import { useState, useEffect } from 'react';
import { Camera, MapPin, Check, AlertCircle, X } from 'lucide-react';

type FieldCameraModalProps = {
  plotId?: string;
  plotName?: string;
  onCaptured?: (data: { photoDataUrl: string; latitude: number | null; longitude: number | null; accuracy: number | null; timestamp: string; notes: string }) => void;
  onClose: () => void;
};

export function FieldCameraModal({ plotId: _plotId, plotName, onCaptured, onClose }: FieldCameraModalProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [locating, setLocating] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('GPS no soportado en este navegador.');
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        });
        setLocating(false);
      },
      (_err) => {
        setGeoError('No se pudo obtener la posición GPS exacta.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhoto(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!photo) return;
    const timestamp = new Date().toISOString();
    if (onCaptured) {
      onCaptured({
        photoDataUrl: photo,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        accuracy: coords?.accuracy ?? null,
        timestamp,
        notes,
      });
    }
    onClose();
  };

  return (
    <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div className="card modal-card" style={{ maxWidth: '28rem', width: '100%', padding: '1.25rem', background: '#fff', borderRadius: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Camera size={20} />
            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Cámara de Campo {plotName ? `· ${plotName}` : ''}</h3>
          </div>
          <button type="button" className="text-button" onClick={onClose} aria-label="Cerrar"><X size={20} /></button>
        </div>

        {/* GPS Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', marginBottom: '1rem', color: coords ? '#26301f' : '#66705c' }}>
          <MapPin size={16} />
          {locating ? <span>Obteniendo ubicación GPS del olivar...</span> : coords ? <span>GPS: {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)} (±{coords.accuracy}m)</span> : <span>{geoError || 'Sin posición GPS'}</span>}
        </div>

        {!photo ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', border: '2px dashed #ccc', borderRadius: '0.5rem', marginBottom: '1rem' }}>
            <label className="primary-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <Camera size={18} /> Tomar foto en el olivar
              <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: 'none' }} />
            </label>
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#666' }}>Abre la cámara del teléfono o selecciona una foto</p>
          </div>
        ) : (
          <div style={{ marginBottom: '1rem' }}>
            <img src={photo} alt="Foto de campo" style={{ width: '100%', maxHeight: '14rem', objectFit: 'cover', borderRadius: '0.5rem', marginBottom: '0.5rem' }} />
            <textarea
              className="magina-ai-input"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Añade una nota rápida sobre la foto (ej. síntomas de plaga, riego...)"
              style={{ width: '100%', borderRadius: '0.35rem', padding: '0.5rem', fontSize: '0.85rem' }}
            />
          </div>
        )}

        {photo ? (
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" className="ghost-button" onClick={() => setPhoto(null)}>Repetir</button>
            <button type="button" className="primary-button" onClick={handleSave} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Check size={18} /> Guardar foto con GPS
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
