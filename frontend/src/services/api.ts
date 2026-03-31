import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  register: (data: { email: string; username: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
}

export const presentationsApi = {
  list: () => api.get('/presentations/'),
  get: (id: string) => api.get(`/presentations/${id}`),
  upload: (formData: FormData) =>
    api.post('/presentations/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  delete: (id: string) => api.delete(`/presentations/${id}`),
  generateImages: (id: string) => api.post(`/presentations/${id}/generate-images`),
}

export const apiKeysApi = {
  list: () => api.get('/api-keys/'),
  save: (data: { provider: string; key: string }) => api.post('/api-keys/', data),
  update: (provider: string, data: { key?: string; is_active?: boolean }) =>
    api.put(`/api-keys/${provider}`, data),
  delete: (provider: string) => api.delete(`/api-keys/${provider}`),
  validate: (provider: string) => api.post(`/api-keys/${provider}/validate`),
}

export default api
