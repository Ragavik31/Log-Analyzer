// src/api/client.js
import axios from 'axios'

const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: backendUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

export { api }