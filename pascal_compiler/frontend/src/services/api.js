// services/api.js
import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const client = axios.create({ baseURL: BASE, timeout: 30000 });

client.interceptors.response.use(
  r => r,
  err => {
    const msg = err.response?.data?.error || err.message || 'Request failed';
    return Promise.reject(new Error(msg));
  }
);

function upload(endpoint, file, onProgress) {
  const form = new FormData();
  form.append('file', file);
  return client.post(endpoint, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: e => onProgress && onProgress(Math.round(e.loaded * 100 / e.total))
  });
}

export const api = {
  health:  ()           => client.get('/api/health'),
  compile: (file, onP)  => upload('/api/compile',  file, onP),
  lex:     (file, onP)  => upload('/api/lex',      file, onP),
  parse:   (file, onP)  => upload('/api/parse',    file, onP),
  lrParse: (file, onP)  => upload('/api/lr-parse', file, onP),
  ll1Parse: (file, onP) => upload('/api/ll1-parse', file, onP),
  symbols: (file, onP)  => upload('/api/symbols',  file, onP),
};

export default api;