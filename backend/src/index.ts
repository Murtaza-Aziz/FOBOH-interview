import { app } from './app.js';

const PORT = Number(process.env['PORT'] ?? 3001);

app.listen(PORT, () => {
  console.log(`Backend:    http://localhost:${PORT}`);
  console.log(`Swagger UI: http://localhost:${PORT}/docs`);
  console.log(`OpenAPI:    http://localhost:${PORT}/openapi.json`);
});
