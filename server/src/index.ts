import express from 'express';
// Server reloaded with updated .env API key
import cors from 'cors';
import dotenv from 'dotenv';
import { publishRouter } from './routes/publish.js';
import { generateRouter } from './routes/generate.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Blog Syndicator API is running' });
});

app.use('/api/publish', publishRouter);
app.use('/api/generate', generateRouter);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
