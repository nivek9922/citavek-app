export const permissions = {
  'service:create':       ['owner'],
  'service:update':       ['owner'],
  'service:delete':       ['owner'],
  'service:read':         ['owner', 'barber'],
  'barber:create':        ['owner'],
  'barber:update':        ['owner'],
  'barber:delete':        ['owner'],
  'barber:read':          ['owner', 'barber'],
  'appointment:create':   ['owner', 'barber'],
  'appointment:update':   ['owner', 'barber'],
  'appointment:cancel':   ['owner', 'barber'],
  'appointment:read:all': ['owner'],
  'appointment:read:own': ['barber'],
  'branding:update':      ['owner'],
  'settings:update':      ['owner'],
  'analytics:revenue':    ['owner'],
  'analytics:agenda':     ['owner', 'barber'],
  'customer:update':      ['owner'],
} as const satisfies Record<string, string[]>

export type Permission = keyof typeof permissions
