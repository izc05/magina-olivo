import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  Heart,
  MessageCircle,
  Plus,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import '../../styles/community.css';

type CommunityPost = {
  id: number;
  initials: string;
  name: string;
  town: string;
  age: string;
  title: string;
  text: string;
  replies: number;
  likes: number;
  tag: string;
};

const posts: CommunityPost[] = [
  { id: 1, initials: 'AM', name: 'Antonio M.', town: 'Bedmar', age: 'Hace 35 min', title: '¿Cómo veis el estado del fruto en zonas altas?', text: 'En mi parcela por encima de 700 m todavía noto bastante diferencia con las zonas más bajas. ¿Os pasa igual?', replies: 8, likes: 14, tag: 'Campo' },
  { id: 2, initials: 'LR', name: 'Lucía R.', town: 'Jimena', age: 'Hace 2 h', title: 'Recomendación para revisar el atomizador antes de campaña', text: 'He preparado una lista sencilla con boquillas, filtros, presión y juntas. Puede venir bien antes de empezar.', replies: 5, likes: 21, tag: 'Maquinaria' },
  { id: 3, initials: 'JM', name: 'José M.', town: 'Huelma', age: 'Ayer', title: 'Ruta corta para enseñar el olivar a unos amigos', text: 'Busco una ruta tranquila, sin mucha dificultad y con buenas vistas para una mañana.', replies: 11, likes: 9, tag: 'Mágina' },
];

const sampleReplies = [
  { initials: 'MC', name: 'María C.', town: 'Bedmar', age: 'Hace 18 min', text: 'En la zona alta de mi finca también va algo más retrasado. La humedad se está manteniendo mejor que abajo.' },
  { initials: 'FR', name: 'Francisco R.', town: 'Jódar', age: 'Hace 9 min', text: 'Yo compararía también orientación y carga del árbol. En dos parcelas cercanas estoy viendo diferencias importantes.' },
];

export function CommunityPanel() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedPost = useMemo(() => posts.find((post) => post.id === selectedId) ?? null, [selectedId]);

  if (selectedPost) {
    return (
      <section className="section-block hub-panel hub-panel--flush section-block--last community-v2 community-detail">
        <div className="community-detail__topbar">
          <button type="button" className="secondary-button" onClick={() => setSelectedId(null)}><ChevronLeft size={17} /> Volver</button>
          <button type="button" className="community-report-button"><Flag size={16} /> Reportar</button>
        </div>

        <article className="community-detail__post">
          <div className="community-post__author">
            <div className="community-avatar">{selectedPost.initials}</div>
            <div><strong>{selectedPost.name}</strong><span>{selectedPost.town} · {selectedPost.age}</span></div>
            <small>{selectedPost.tag}</small>
          </div>
          <h2>{selectedPost.title}</h2>
          <p>{selectedPost.text}</p>
          <div className="community-detail__actions">
            <button type="button"><Heart size={17} /><span>{selectedPost.likes} me gusta</span></button>
            <button type="button"><MessageCircle size={17} /><span>{selectedPost.replies} respuestas</span></button>
          </div>
        </article>

        <div className="section-heading community-detail__heading">
          <div><span className="eyebrow">Conversación</span><h2>Respuestas</h2></div>
        </div>

        <div className="community-reply-list">
          {sampleReplies.map((reply) => (
            <article className="community-reply" key={`${reply.name}-${reply.age}`}>
              <div className="community-avatar">{reply.initials}</div>
              <div><strong>{reply.name}</strong><span>{reply.town} · {reply.age}</span><p>{reply.text}</p></div>
            </article>
          ))}
        </div>

        <button className="community-reply-cta" type="button"><MessageCircle size={17} /> Escribir una respuesta</button>

        <article className="community-safety-card community-safety-card--detail">
          <ShieldCheck size={22} />
          <div><strong>Opinión de la comunidad</strong><span>Esta conversación refleja experiencias personales. Los avisos agronómicos oficiales y recomendaciones técnicas verificadas se mostrarán diferenciados.</span></div>
        </article>
      </section>
    );
  }

  return (
    <section className="section-block hub-panel hub-panel--flush section-block--last community-v2">
      <div className="community-head">
        <div><span className="eyebrow">Comunidad Mágina</span><h2>Compartir para ayudarnos</h2><p>Preguntas, experiencias y recomendaciones de la comarca con una estructura sencilla y moderada.</p></div>
        <div className="community-head__icon"><UsersRound size={27} /></div>
      </div>

      <button className="community-create-card" type="button">
        <div className="community-avatar community-avatar--self">IS</div>
        <div><strong>Comparte algo con la comunidad</strong><span>Pregunta, experiencia, aviso o recomendación</span></div>
        <div className="community-create-card__plus"><Plus size={18} /></div>
      </button>

      <div className="community-filter-row">
        <button className="community-filter community-filter--active" type="button">Para ti</button>
        <button className="community-filter" type="button">Campo</button>
        <button className="community-filter" type="button">Maquinaria</button>
        <button className="community-filter" type="button">Mágina</button>
      </div>

      <div className="community-feed">
        {posts.map((post) => (
          <article className="community-post" key={post.id}>
            <div className="community-post__author">
              <div className="community-avatar">{post.initials}</div>
              <div><strong>{post.name}</strong><span>{post.town} · {post.age}</span></div>
              <small>{post.tag}</small>
            </div>
            <h3>{post.title}</h3>
            <p>{post.text}</p>
            <div className="community-post__actions">
              <button type="button"><MessageCircle size={17} /><span>{post.replies}</span></button>
              <button type="button"><Heart size={17} /><span>{post.likes}</span></button>
              <button className="community-post__open" type="button" onClick={() => setSelectedId(post.id)}>Abrir <ChevronRight size={16} /></button>
            </div>
          </article>
        ))}
      </div>

      <article className="community-safety-card">
        <ShieldCheck size={22} />
        <div><strong>Comunidad útil y cercana</strong><span>Las publicaciones deberán poder reportarse y moderarse. La información agronómica sensible se distinguirá de opiniones personales.</span></div>
      </article>
    </section>
  );
}
