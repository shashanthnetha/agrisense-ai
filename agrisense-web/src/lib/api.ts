import axios from 'axios';
import { ScanResponse } from './types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const analyzeCrop = async (imageFile: File, language: string = "English"): Promise<ScanResponse> => {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('language', language);

  const response = await api.post<ScanResponse>('/scan/analyze', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
};

// Placeholder for history - we'll need to implement the backend endpoint for this
export const getScanHistory = async (): Promise<unknown[]> => {
  // const response = await api.get('/scan/history');
  // return response.data;
  return []; // Mock for now
};

export default api;

export const generateVoice = async (analysis: unknown, treatment: unknown, language: string): Promise<string | null> => {
  const response = await api.post<{ voice_data?: string | null }>('/voice/generate', { analysis, treatment, language });
  return response.data?.voice_data ?? null;
};
