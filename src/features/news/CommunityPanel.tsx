import { ChevronRight, Heart, MessageCircle, Plus, ShieldCheck, UsersRound } from 'lucide-react';
import '../../styles/community.css';

const posts = [
  { initials: 'AM', name: 'Antonio M.', town: 'Bedmar', age: 'Hace 35 min', title: '¿Cómo veis el estado del fruto en zonas altas?', text: 'En mi parcela por encima de 700 m todavía noto bastante diferencia con las zonas más bajas. ¿Os pasa igual?', replies: 8, likes: 14, tag: 'Campo' },
  { initials: 'LR', name: 'Lucía R.', town: 'Jimena', age: 'Hace 2 h', title: 'Recomendación para revisar el atomizador antes de campaña', text: 'He preparado una lista sencilla con boquillas, filtros, presión y juntas. Puede venir bien antes de empezar.', replies: 5, likes: 21, tag: 'Maquinaria' },
  { initials: 'JM', name: 'José M.', town: 'Huelma', age: 'Ayer', title: 'Ruta corta para enseñar el olivar a unos amigos', text: 'Busco una ruta tranquila, sin mucha dificultad y con buenas vistas para una mañana.', replies: 11, likes: 9, tag: 'Mágina' },
];

export function CommunityPanel() {
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
          <article className="community-post" key={post.title}>
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
              <button className="community-post__open" type="button">Abrir <ChevronRight size={16} /></button>
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
