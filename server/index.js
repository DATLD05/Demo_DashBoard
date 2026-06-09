import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import reportRoutes from './routes/reportRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = process.env.PORT || 3000;
const distPath = path.resolve(__dirname, '..', 'dist');

app.use(express.json());
app.use(express.static(distPath));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/reports', reportRoutes);

app.use((_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Dashboard server is running at http://localhost:${port}`);
});
