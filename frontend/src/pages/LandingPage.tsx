export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          CrewInventurKI
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          KI-gestützte Inventur für die Gastronomie
        </p>
        <div className="flex gap-4 justify-center">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-4xl mb-2">📸</p>
            <p className="text-sm text-gray-600">Foto machen</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-4xl mb-2">🤖</p>
            <p className="text-sm text-gray-600">KI erkennt</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-4xl mb-2">✅</p>
            <p className="text-sm text-gray-600">Fertig</p>
          </div>
        </div>
        <p className="mt-8 text-sm text-gray-500">
          Phase 0 Setup - Coming Soon
        </p>
      </div>
    </div>
  )
}
