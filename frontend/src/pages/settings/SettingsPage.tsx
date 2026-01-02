import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { useAuth } from '../../features/auth/useAuth'
import { useUiStore } from '../../stores/uiStore'

export function SettingsPage() {
  const { signOut, user } = useAuth()
  const addToast = useUiStore((state) => state.addToast)

  const handleLogout = async () => {
    const { error } = await signOut()
    if (error) {
      addToast(error, 'error')
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-600">
          Verwalte Konto, App-Infos und Sicherheit.
        </p>
      </header>

      <Card title="Account">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">
              {user?.email ?? 'Nicht eingeloggt'}
            </p>
            <p className="text-xs text-gray-500">Profil und Firma verwalten</p>
          </div>
          <Link to="/settings/profile">
            <Button variant="secondary">Profil</Button>
          </Link>
        </div>
      </Card>

      <Card title="App">
        <p className="text-sm text-gray-600">Version 0.1.0</p>
      </Card>

      <Card>
        <Button variant="danger" onClick={handleLogout}>
          Logout
        </Button>
      </Card>
    </div>
  )
}
