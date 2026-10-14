export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Event Production Management API',
    version: '0.1.0',
    description:
      'REST API for the Event Production Management System. Stage 2 exposes health only. Auth, events, allocations, and concurrency-safe reservations follow in later stages.',
  },
  servers: [{ url: '/api/v1', description: 'Versioned API prefix' }],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Service and database health',
        responses: {
          '200': {
            description: 'API and MySQL are reachable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
              },
            },
          },
          '503': {
            description: 'API is up but the database ping failed',
          },
        },
      },
    },
  },
  components: {
    schemas: {
      HealthResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['ok', 'degraded'] },
              service: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
              database: {
                type: 'object',
                properties: {
                  connected: { type: 'boolean' },
                  engine: { type: 'string', nullable: true },
                  version: { type: 'string', nullable: true },
                },
              },
            },
          },
        },
      },
    },
  },
};
