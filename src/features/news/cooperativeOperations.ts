export type CooperativeOperationalProfile = {
  address?: string;
  phones?: string[];
  emails?: Array<{ label: string; value: string }>;
  publicHours?: string[];
  contactSourceUrl: string;
  memberAccessUrl?: string;
};

const profiles: Record<string, CooperativeOperationalProfile> = {
  'cristo-misericordia-jodar': {
    address: 'Camino del Canónigo s/n · 23500 Jódar (Jaén)',
    phones: ['953 785 031'],
    emails: [
      { label: 'Administración', value: 'info@laquintaesencia.com' },
      { label: 'Ventas y pedidos', value: 'comercial@laquintaesencia.com' },
    ],
    publicHours: ['Lunes a viernes · 09:00–14:00', 'Lunes a viernes · 16:00–19:00'],
    contactSourceUrl: 'https://laquintaesencia.com/contact/',
  },
  'paz-belmez': {
    address: 'Pol. 3 Parcela 242 · Paraje La Vega · 23568 Bélmez de la Moraleda (Jaén)',
    phones: ['953 394 052', '619 254 391'],
    contactSourceUrl: 'https://laperlademagina.es/contacto/',
    memberAccessUrl: 'https://laperlademagina.es/socios/',
  },
  'san-francisco-albanchez': {
    address: 'Plaza de la Constitución, 5 · 23538 Albanchez de Mágina (Jaén)',
    phones: ['953 358 353', '661 903 335'],
    publicHours: ['Atención al cliente · lunes a viernes · 10:00–14:00'],
    contactSourceUrl: 'https://www.aovesierramagina.com/',
  },
  'santa-isabel-torres': {
    address: 'Ctra. Jimena-Torres, km 7,8 · 23540 Torres (Jaén)',
    phones: ['953 363 030', '687 713 092'],
    emails: [{ label: 'Contacto y ventas', value: 'info@santaisabeldetorres.com' }],
    contactSourceUrl: 'https://santaisabeldetorres.com/',
  },
  'union-santo-cristo-cabra': {
    address: 'C/ Virgen de la O s/n · 23550 Cabra del Santo Cristo (Jaén)',
    phones: ['953 397 027'],
    emails: [{ label: 'Administración', value: 'administracion@saludsierra.es' }],
    contactSourceUrl: 'https://saludsierra.es/',
  },
  'union-oleicola-cambil': {
    address: 'Ctra. Córdoba-Almería, km 138 · 23120 Cambil (Jaén)',
    phones: ['953 300 355'],
    emails: [{ label: 'Contacto', value: 'info@esmeraldamagina.es' }],
    publicHours: [
      'Lunes · 09:00–14:00 y 16:00–20:30',
      'Martes a viernes · 09:00–14:00 y 16:00–19:00',
      'Sábados · 09:00–13:30',
    ],
    contactSourceUrl: 'https://esmeraldamagina.es/almazara/',
  },
  'cabeza-campillo': {
    address: 'A-44, km 74 · 23130 Campillo de Arenas (Jaén)',
    phones: ['953 309 027'],
    emails: [{ label: 'Contacto', value: 'info@cooperativacampillodearenas.com' }],
    contactSourceUrl: 'https://cooperativacampillodearenas.com/',
  },
  'san-isidro-huelma': {
    address: 'Ctra. Córdoba-Almería, A-324, Km 26 · 23560 Huelma (Jaén)',
    phones: ['953 390 110 / 363'],
    emails: [
      { label: 'Contacto', value: 'correo@scasanisidro.es' },
      { label: 'Ventas', value: 'ventasscasanisidro@gmail.com' },
    ],
    contactSourceUrl: 'https://www.scasanisidro.es/contactenos',
  },
  'rosario-arbuniel': {
    address: 'Paseo de Andalucía, 15 · 23193 Arbuniel (Jaén)',
    phones: ['953 304 073'],
    emails: [{ label: 'Contacto', value: 'info@albilia.es' }],
    contactSourceUrl: 'https://tienda.aceitesierradearbuniel.com/',
  },
  'san-sebastian-guardia': {
    address: 'Ctra. de Jaén 3,200 Km 5,800 · 23170 La Guardia de Jaén',
    phones: ['953 327 123', '661 160 781'],
    emails: [{ label: 'Contacto', value: 'info@senoriodemesia.es' }],
    contactSourceUrl: 'https://senoriodemesia.es/contacto/',
    memberAccessUrl: 'https://sansebastian.almazaras.com/',
  },
  'san-roque-carchelejo': {
    address: 'Belenes Altos, 6 · 23192 Carchelejo (Jaén)',
    phones: ['953 302 009'],
    emails: [{ label: 'Contacto', value: 'info@scasanroque.com' }],
    publicHours: [
      'Invierno · lunes a viernes · 09:00–14:00 y 16:00–18:00',
      'Verano · lunes a viernes · 08:00–15:00',
    ],
    contactSourceUrl: 'https://tierrasdelmarquesado.com/contacto/',
  },
};

export function getCooperativeOperationalProfile(id: string): CooperativeOperationalProfile | null {
  return profiles[id] ?? null;
}
