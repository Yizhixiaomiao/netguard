const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiService {
  async request(url, options = {}) {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || error.message || 'Request failed');
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  }

  async get(url) {
    return this.request(url, { method: 'GET' });
  }

  async post(url, data) {
    return this.request(url, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put(url, data) {
    return this.request(url, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete(url) {
    return this.request(url, { method: 'DELETE' });
  }

  async download(url, filename) {
    const response = await fetch(`${API_BASE_URL}${url}`);
    if (!response.ok) {
      throw new Error('Download failed');
    }

    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}

const api = new ApiService();

export const deviceApi = {
  getAll: () => api.get('/api/devices/'),
  getById: (id) => api.get(`/api/devices/${id}`),
  create: (data) => api.post('/api/devices/', data),
  update: (id, data) => api.put(`/api/devices/${id}`, data),
  delete: (id) => api.delete(`/api/devices/${id}`),
  batchDelete: (deviceIds) => api.post('/api/devices/batch-delete', { device_ids: deviceIds }),
};

export const backupApi = {
  getAll: () => api.get('/api/backups/'),
  getById: (id) => api.get(`/api/backups/${id}`),
  create: (data) => api.post('/api/backups/', data),
  delete: (id) => api.delete(`/api/backups/${id}`),
  download: (id, filename) => api.download(`/api/backups/${id}/download`, filename),
};

export const templateApi = {
  getAll: () => api.get('/api/templates/'),
  create: (data) => api.post('/api/templates/', data),
  update: (id, data) => api.put(`/api/templates/${id}`, data),
  delete: (id) => api.delete(`/api/templates/${id}`),
};

export const backupJobApi = {
  execute: (data) => api.post('/api/backup-jobs/', data),
};

export default api;
