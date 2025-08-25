import AuthForm from "@/components/AuthForm"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center p-4 dark:from-blue-950 dark:to-blue-900">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-blue-600 mb-2 dark:text-blue-300">Blue Collar Connect</h1>
          <p className="text-gray-600 dark:text-gray-300">Connecting skilled workers with opportunities</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg overflow-hidden dark:bg-gray-800 dark:text-white">
          <AuthForm />
        </div>
      </div>
    </main>
  )
}

