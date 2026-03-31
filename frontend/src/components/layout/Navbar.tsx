import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path: string) =>
    location.pathname === path
      ? 'text-indigo-600 font-semibold'
      : 'text-gray-600 hover:text-gray-900'

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="font-bold text-gray-900 text-lg">SlidesAI</span>
            </Link>

            <nav className="hidden sm:flex items-center gap-6">
              <Link to="/dashboard" className={`text-sm transition-colors ${isActive('/dashboard')}`}>
                Dashboard
              </Link>
              <Link to="/settings" className={`text-sm transition-colors ${isActive('/settings')}`}>
                Settings
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500 hidden sm:block">
              {user?.username}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-red-600 transition-colors font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
