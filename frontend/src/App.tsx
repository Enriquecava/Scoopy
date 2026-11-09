import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppRouter } from './app/router'
import { AuthProvider } from './app/providers/AuthProvider'
import { LanguageProvider } from './shared/i18n'
import { useErrorHandler } from './shared/useErrorHandler'
import { logger, LOG_EVENT } from './shared/logger'

const queryClient = new QueryClient()

function AppContent() {
  useErrorHandler()

  return (
    <AppRouter />
  )
}

export default function App() {
  logger.info('App initialized', { event: LOG_EVENT.APP_INITIALIZED })

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LanguageProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </LanguageProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
