/**
 * OpenAPI 3.0 spec, written by hand as a plain TypeScript object.
 *
 * Rationale: the brief says "Swagger or OpenAPI" and "keep it simple". Generating
 * the spec from Zod requires an extra library and keeps the spec and validation
 * tightly coupled in ways that are hard to explain in an interview. A hand-written
 * spec is trivial to walk through line by line and never drifts silently.
 *
 * Swagger UI is served from unpkg CDN so no npm package is needed.
 */

export const openApiSpec = {
    openapi: '3.0.0',
    info: {
      title: 'FOBOH Pricing API',
      version: '0.1.0',
      description:
        'Bespoke pricing profiles for food and beverage wholesale suppliers.',
    },
    servers: [{ url: 'http://localhost:3001' }],

    // ── Reusable schemas ────────────────────────────────────────────────────
    components: {
      schemas: {
        Product: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            sku: { type: 'string' },
            brand: { type: 'string' },
            subCategory: { type: 'string' },
            segment: { type: 'string' },
            basePrice: { type: 'number' },
          },
        },
        Customer: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            groupIds: { type: 'array', items: { type: 'string' } },
          },
        },
        CustomerGroup: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
          },
        },
        Adjustment: {
          oneOf: [
            {
              title: 'Fixed',
              type: 'object',
              required: ['kind', 'direction', 'amount'],
              properties: {
                kind: { type: 'string', enum: ['FIXED'] },
                direction: { type: 'string', enum: ['INCREASE', 'DECREASE'] },
                amount: { type: 'number', minimum: 0 },
              },
            },
            {
              title: 'Percentage',
              type: 'object',
              required: ['kind', 'direction', 'percent'],
              properties: {
                kind: { type: 'string', enum: ['PERCENTAGE'] },
                direction: { type: 'string', enum: ['INCREASE', 'DECREASE'] },
                percent: { type: 'number', minimum: 0, maximum: 100 },
              },
            },
            {
              title: 'CustomPrice',
              type: 'object',
              required: ['kind', 'price'],
              properties: {
                kind: { type: 'string', enum: ['CUSTOM_PRICE'] },
                price: { type: 'number', minimum: 0 },
              },
            },
          ],
          discriminator: { propertyName: 'kind' },
        },
        CustomerScope: {
          oneOf: [
            {
              title: 'AllCustomers',
              type: 'object',
              required: ['type'],
              properties: { type: { type: 'string', enum: ['ALL_CUSTOMERS'] } },
            },
            {
              title: 'SingleCustomer',
              type: 'object',
              required: ['type', 'customerId'],
              properties: {
                type: { type: 'string', enum: ['CUSTOMER'] },
                customerId: { type: 'string' },
              },
            },
            {
              title: 'CustomerGroup',
              type: 'object',
              required: ['type', 'groupId'],
              properties: {
                type: { type: 'string', enum: ['GROUP'] },
                groupId: { type: 'string' },
              },
            },
          ],
          discriminator: { propertyName: 'type' },
        },
        ProductScope: {
          oneOf: [
            {
              title: 'AllProducts',
              type: 'object',
              required: ['type'],
              properties: { type: { type: 'string', enum: ['ALL_PRODUCTS'] } },
            },
            {
              title: 'ProductIds',
              type: 'object',
              required: ['type', 'productIds'],
              properties: {
                type: { type: 'string', enum: ['PRODUCT_IDS'] },
                productIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
              },
            },
            {
              title: 'Filter',
              type: 'object',
              required: ['type', 'filter'],
              properties: {
                type: { type: 'string', enum: ['FILTER'] },
                filter: {
                  type: 'object',
                  description:
                    'At least one field must be set. An empty filter is rejected — use ALL_PRODUCTS instead.',
                  properties: {
                    brand: { type: 'string' },
                    subCategory: { type: 'string' },
                    segment: { type: 'string' },
                  },
                },
              },
            },
          ],
          discriminator: { propertyName: 'type' },
        },
        PricingProfile: {
          type: 'object',
          required: [
            'id', 'name', 'customerScope', 'productScope',
            'adjustment', 'priority', 'createdAt', 'updatedAt',
          ],
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            customerScope: { $ref: '#/components/schemas/CustomerScope' },
            productScope: { $ref: '#/components/schemas/ProductScope' },
            adjustment: { $ref: '#/components/schemas/Adjustment' },
            priority: { type: 'integer', minimum: -100, maximum: 100 },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateProfileRequest: {
          type: 'object',
          required: ['name', 'customerScope', 'productScope', 'adjustment'],
          description:
            'createdAt and updatedAt are controlled by the server and must not be sent.',
          properties: {
            name: { type: 'string', minLength: 1 },
            customerScope: { $ref: '#/components/schemas/CustomerScope' },
            productScope: { $ref: '#/components/schemas/ProductScope' },
            adjustment: { $ref: '#/components/schemas/Adjustment' },
            priority: { type: 'integer', minimum: -100, maximum: 100, default: 0 },
          },
        },
        PreviewRequest: {
          type: 'object',
          required: ['productIds', 'adjustment'],
          properties: {
            productIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
            adjustment: { $ref: '#/components/schemas/Adjustment' },
          },
        },
        PreviewResponse: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productId: { type: 'string' },
                  title: { type: 'string' },
                  sku: { type: 'string' },
                  basePrice: { type: 'number' },
                  newPrice: { type: 'number' },
                },
              },
            },
          },
        },
        ResolveResponse: {
          type: 'object',
          properties: {
            customerId: { type: 'string' },
            productId: { type: 'string' },
            basePrice: { type: 'number' },
            finalPrice: { type: 'number' },
            winningProfile: {
              nullable: true,
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
              },
            },
            matchedProfiles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  profileId: { type: 'string' },
                  profileName: { type: 'string' },
                  candidatePrice: { type: 'number' },
                  specificity: {
                    type: 'array',
                    items: { type: 'number' },
                    description: '[customerScore, productScore, adjustmentScore, priority, updatedAtEpoch]',
                  },
                },
              },
            },
            explanation: { type: 'string' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },

    // ── Paths ───────────────────────────────────────────────────────────────
    paths: {
      '/api/products': {
        get: {
          summary: 'List and filter products',
          tags: ['Catalog'],
          parameters: [
            { name: 'q', in: 'query', description: 'Substring match on title or SKU', schema: { type: 'string' } },
            { name: 'subCategory', in: 'query', schema: { type: 'string' } },
            { name: 'segment', in: 'query', schema: { type: 'string' } },
            { name: 'brand', in: 'query', schema: { type: 'string' } },
          ],
          responses: {
            200: {
              description: 'Array of products',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Product' } } } },
            },
          },
        },
      },
      '/api/customers': {
        get: {
          summary: 'List all customers',
          tags: ['Catalog'],
          responses: {
            200: { description: 'Array of customers', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Customer' } } } } },
          },
        },
      },
      '/api/customer-groups': {
        get: {
          summary: 'List all customer groups',
          tags: ['Catalog'],
          responses: {
            200: { description: 'Array of groups', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/CustomerGroup' } } } } },
          },
        },
      },
      '/api/profiles': {
        get: {
          summary: 'List all pricing profiles',
          tags: ['Profiles'],
          responses: {
            200: { description: 'Array of profiles', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/PricingProfile' } } } } },
          },
        },
        post: {
          summary: 'Create a pricing profile',
          tags: ['Profiles'],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateProfileRequest' } } },
          },
          responses: {
            201: { description: 'Created profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/PricingProfile' } } } },
            400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/profiles/{id}': {
        get: {
          summary: 'Get a profile by ID',
          tags: ['Profiles'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/PricingProfile' } } } },
            404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
        put: {
          summary: 'Replace a pricing profile (full update)',
          tags: ['Profiles'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateProfileRequest' } } },
          },
          responses: {
            200: { description: 'Updated profile', content: { 'application/json': { schema: { $ref: '#/components/schemas/PricingProfile' } } } },
            400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
        delete: {
          summary: 'Delete a pricing profile',
          tags: ['Profiles'],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            204: { description: 'Deleted' },
            404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/pricing/preview': {
        post: {
          summary: 'Preview prices for a set of products under a given adjustment',
          tags: ['Pricing'],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PreviewRequest' } } },
          },
          responses: {
            200: { description: 'Computed new prices', content: { 'application/json': { schema: { $ref: '#/components/schemas/PreviewResponse' } } } },
            400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
      '/api/pricing/resolve': {
        get: {
          summary: 'Resolve the winning price for a customer + product pair',
          tags: ['Pricing'],
          parameters: [
            { name: 'customerId', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'productId', in: 'query', required: true, schema: { type: 'string' } },
          ],
          responses: {
            200: { description: 'Resolution result with explanation', content: { 'application/json': { schema: { $ref: '#/components/schemas/ResolveResponse' } } } },
            400: { description: 'Missing params', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
            404: { description: 'Customer or product not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          },
        },
      },
    },
};
