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
  'san-francisco-albanchez': {
    address: 'Plaza de la Constitución, 5 · 23538 Albanchez de Mágina (Jaén)',
    phones: ['953 358 353', '661 903 335'],
    publicHours: ['Atención al cliente · lunes a viernes · 10:00–14:00'],
    contactSourceUrl: 'https://www.aovesierramagina.com/',
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
  'san-sebastian-guardia': {
    address: 'Ctra. de Jaén 3,200 Km 5,800 · 23170 La Guardia de Jaén',
    phones: ['953 327 123', '661 160 781'],
    emails: [{ label: 'Contacto', value: 'info@senoriodemesia.es' }],
    contactSourceUrl: 'https://senoriodemesia.es/contacto/',
    memberAccessUrl: 'https://sansebastian.almazaras.com/',
  },
  'san-roque-carchelejo': {
    address: 'Belenes Altos, 6 · 23192 Carchelejo (Jaén)',
    phones: ['953 30 20 09'],
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
