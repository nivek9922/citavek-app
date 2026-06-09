export const COLOMBIA_CITIES = [
  'Armenia', 'Barranquilla', 'Bello', 'Bogotá', 'Bucaramanga', 'Buenaventura',
  'Cali', 'Cartagena', 'Cúcuta', 'Floridablanca', 'Ibagué',
  'Manizales', 'Medellín', 'Montería', 'Neiva', 'Palmira',
  'Pasto', 'Pereira', 'Popayán', 'Riohacha', 'Santa Marta',
  'Sincelejo', 'Soacha', 'Soledad', 'Tunja', 'Valledupar',
  'Villavicencio',
] as const

export type ColombiaCity = typeof COLOMBIA_CITIES[number]
