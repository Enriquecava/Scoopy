import { Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { LoginPage } from '../features/auth/pages/LoginPage'
import { ProductsPage } from '../features/products/pages/ProductsPage'
import { MainLayout } from './layouts/MainLayout'
import { useAuth } from './providers/AuthProvider'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <Navigate to="/login" replace />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/products"
        element={
          <ProtectedRoute>
            <MainLayout>
              <ProductsPage />
            </MainLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/products" replace />} />
      <Route path="*" element={<Navigate to="/products" replace />} />
    </Routes>
  )
}
