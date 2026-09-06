import axios from 'axios'

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const requestUrl = typeof error.config?.url === 'string' ? error.config.url : ''
    const requestHeaders = error.config?.headers
    const hasAuthHeader = Boolean(requestHeaders?.Authorization || requestHeaders?.authorization)

    if (
      status === 401 &&
      hasAuthHeader &&
      typeof window !== 'undefined' &&
      !requestUrl.endsWith('/users/sign_in')
    ) {
      window.dispatchEvent(new Event('scoopy:unauthorized'))
    }

    return Promise.reject(error)
  },
)
