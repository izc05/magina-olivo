import { useState, useRef, useEffect } from 'react';
import { Bot, Mic, MicOff, Send, Sparkles, Check, AlertCircle } from 'lucide-react';
import { api, type ActivityCreateBody, type DeliveryCreateBody } from './api.ts';

type MaginaAiAssistantProps = {
  holdingId?: string;
  campaignId?: string;
  onSaved?: () => void;
  onClose?: () => void;
};

type DraftState = {
  kind: 'activity' | 'delivery' | 'query';
  activityType?: string;
  occurredAt?: string;
  deliveredAt?: string;
  kilograms?: string;
  customDestination?: string;
  farmId?: string;
  plotId?: string;
  plotName?: string;
  productName?: string;
  quantity?: number;
  quantityUnit?: string;
  notes?: string;
};

export function MaginaAiAssistant({ holdingId, campaignId, onSaved, onClose }: MaginaAiAssistantProps) {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check Speech Recognition support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-ES';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setInputText((prev) => prev ? `${prev} ${transcript}` : transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError('El reconocimiento por voz no está disponible en este navegador.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setError(null);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        setIsListening(false);
      }
    }
  };

  const handleInterpret = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    setBusy(true);
    setError(null);
    setDraft(null);
    setExplanation(null);
    setSuccessNotice(null);

    try {
      const res = await api.parseIntent(text, holdingId);
      setDraft(res.draft as DraftState);
      setExplanation(res.humanExplanation);
    } catch (err: any) {
      setError(err.message || 'Error al interpretar el texto.');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmDraft = async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    setSuccessNotice(null);

    try {
      if (draft.kind === 'delivery') {
        if (!campaignId) {
          throw new Error('Se requiere una campaña activa para registrar la entrega.');
        }
        const deliveryBody: DeliveryCreateBody = {
          deliveredAt: draft.deliveredAt || new Date().toISOString(),
          kilograms: draft.kilograms || '0',
          clientGeneratedId: crypto.randomUUID(),
        };
        if (draft.customDestination) deliveryBody.customDestination = draft.customDestination;
        if (draft.plotId) deliveryBody.plotId = draft.plotId;
        if (draft.farmId) deliveryBody.farmId = draft.farmId;
        if (draft.notes) deliveryBody.notes = draft.notes;

        const idempotencyKey = `ai-delivery-${deliveryBody.clientGeneratedId}`;
        await api.createDelivery(campaignId, deliveryBody, idempotencyKey);
        setSuccessNotice(`Entrega de ${draft.kilograms} kg registrada correctamente.`);
      } else if (draft.kind === 'activity') {
        if (!holdingId) {
          throw new Error('Se requiere una explotación activa.');
        }
        const activityBody: ActivityCreateBody = {
          activityType: (draft.activityType as any) || 'observation',
          occurredAt: draft.occurredAt || new Date().toISOString(),
          clientGeneratedId: crypto.randomUUID(),
        };
        if (draft.farmId) activityBody.farmId = draft.farmId;
        if (draft.plotId) activityBody.plotId = draft.plotId;
        if (draft.productName) activityBody.productName = draft.productName;
        if (draft.quantity != null) activityBody.quantity = draft.quantity;
        if (draft.quantityUnit) activityBody.quantityUnit = draft.quantityUnit;
        if (draft.notes) activityBody.notes = draft.notes;

        await api.createActivity(holdingId, activityBody);
        setSuccessNotice(`Labor de ${draft.activityType || 'campo'} anotada en el cuaderno.`);
      }

      setDraft(null);
      setInputText('');
      if (onSaved) onSaved();
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar el registro.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card magina-ai-assistant" aria-labelledby="magina-ai-title">
      <div className="magina-ai-header">
        <div className="magina-ai-badge">
          <Sparkles aria-hidden="true" size={16} />
          <span>Mágina IA · Asistente</span>
        </div>
        {onClose ? (
          <button type="button" className="text-button magina-ai-close" onClick={onClose} aria-label="Cerrar asistente">
            ✕
          </button>
        ) : null}
      </div>

      <p className="magina-ai-intro" id="magina-ai-title">
        Dicta o escribe lo que has hecho o entregado en el olivar y la IA preparará el borrador para que lo confirmes.
      </p>

      <form className="magina-ai-form" onSubmit={handleInterpret}>
        <div className="magina-ai-input-wrap">
          <input
            type="text"
            className="magina-ai-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ej: Entregados 3400 kg en cooperativa San Sebastián"
            disabled={busy}
          />
          <button
            type="button"
            className={`magina-ai-mic-btn ${isListening ? 'listening' : ''}`}
            onClick={toggleListening}
            aria-label={isListening ? 'Detener escucha' : 'Hablar por micrófono'}
            title="Dictar por voz"
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <button
            type="submit"
            className="primary-button magina-ai-submit-btn"
            disabled={busy || !inputText.trim()}
            aria-label="Interpretar"
          >
            <Send size={18} />
          </button>
        </div>
      </form>

      {error ? (
        <div className="alert magina-ai-alert" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      ) : null}

      {successNotice ? (
        <div className="alert success magina-ai-alert" role="status">
          <Check size={18} />
          <span>{successNotice}</span>
        </div>
      ) : null}

      {draft && explanation ? (
        <div className="magina-ai-draft-card">
          <div className="magina-ai-draft-head">
            <Bot size={20} />
            <strong>Borrador propuesto por Mágina IA</strong>
          </div>
          <p className="magina-ai-draft-explanation">{explanation}</p>
          <div className="magina-ai-draft-details">
            {draft.kind === 'delivery' ? (
              <>
                <div><span>Tipo</span><strong>Entrega de aceituna</strong></div>
                <div><span>Kilos</span><strong>{draft.kilograms} kg</strong></div>
                {draft.customDestination ? <div><span>Destino</span><strong>{draft.customDestination}</strong></div> : null}
                {draft.plotName ? <div><span>Parcela</span><strong>{draft.plotName}</strong></div> : null}
              </>
            ) : draft.kind === 'activity' ? (
              <>
                <div><span>Labor</span><strong>{draft.activityType}</strong></div>
                {draft.productName ? <div><span>Producto</span><strong>{draft.productName}</strong></div> : null}
                {draft.quantity ? <div><span>Cantidad</span><strong>{draft.quantity} {draft.quantityUnit || ''}</strong></div> : null}
                {draft.plotName ? <div><span>Parcela</span><strong>{draft.plotName}</strong></div> : null}
              </>
            ) : null}
          </div>
          <div className="magina-ai-draft-actions">
            <button
              type="button"
              className="primary-button magina-ai-confirm-btn"
              onClick={handleConfirmDraft}
              disabled={busy}
            >
              <Check size={18} /> Confirmar y Guardar
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => setDraft(null)}
              disabled={busy}
            >
              Descartar
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
