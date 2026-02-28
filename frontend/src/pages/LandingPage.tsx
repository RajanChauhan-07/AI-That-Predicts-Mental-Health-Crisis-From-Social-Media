import { motion } from 'framer-motion'
import { Brain, Music, Activity, MessageCircle, Shield, Zap, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'You cancelled the sign in. Please try again.',
  invalid_client: 'OAuth configuration error. Please contact support.',
  invalid_grant: 'Sign in expired. Please try again.',
  missing_code: 'Sign in was interrupted. Please try again.',
  session_error: 'Could not load your account. Please try again.',
  userinfo_failed: 'Could not retrieve your Google profile. Please try again.',
  unknown_error: 'An unexpected error occurred. Please try again.',
}

export default function LandingPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const err = params.get('error')
    if (err) {
      setError(ERROR_MESSAGES[err] ?? `Sign in failed: ${err}`)
      window.history.replaceState({}, '', '/')
    }
  }, [])

  const handleGoogleLogin = () => {
    setLoading(true)
    setError(null)
    window.location.href = `${API_URL}/api/auth/google`
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-8 py-6 border-b border-[#2a2a4a]">
        <div className="flex items-center gap-2">
          <Brain className="text-indigo-500" size={28} />
          <span className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            MindWatch
          </span>
        </div>
        <button
          onClick={handleGoogleLogin}
          className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded-full text-sm font-medium transition-all"
        >
          Get Started
        </button>
      </nav>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 bg-red-900/30 border border-red-500/40 text-red-300 text-sm px-6 py-3 mx-8 mt-4 rounded-xl">
          <AlertCircle size={16} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center px-4 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-indigo-900/30 border border-indigo-500/30 rounded-full px-4 py-2 text-sm text-indigo-300 mb-8">
            <Zap size={14} />
            AI-Powered Mental Wellness Intelligence
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Understand Your
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              {" "}Mental Wellness{" "}
            </span>
            Before It's Too Late
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12">
            MindWatch analyzes your Spotify, Google Fit, WhatsApp, YouTube and more
            to give you a complete picture of your mental health — before you even feel it.
          </p>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex items-center gap-3 bg-white text-gray-900 px-8 py-4 rounded-full text-lg font-semibold hover:bg-gray-100 disabled:opacity-70 disabled:cursor-not-allowed transition-all mx-auto shadow-lg shadow-white/10"
          >
            <img
              src="https://www.google.com/favicon.ico"
              alt="Google"
              className="w-5 h-5"
            />
            Continue with Google
          </button>

          <p className="text-gray-500 text-sm mt-4">
            Free to use • Privacy first • No data sold ever
          </p>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="px-8 py-20 max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-16">
          Everything that defines your mental state
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: <Music className="text-green-400" size={24} />,
              title: "Music & Content",
              description: "Spotify listening patterns, YouTube history, and content consumption analyzed for emotional signals.",
              color: "green"
            },
            {
              icon: <Activity className="text-blue-400" size={24} />,
              title: "Physical Behavior",
              description: "Google Fit steps, sleep quality, screen time patterns and physical activity trends.",
              color: "blue"
            },
            {
              icon: <MessageCircle className="text-purple-400" size={24} />,
              title: "Expression Analysis",
              description: "WhatsApp chats, journal entries and personal notes analyzed for emotional drift over time.",
              color: "purple"
            },
            {
              icon: <Brain className="text-indigo-400" size={24} />,
              title: "AI Prediction",
              description: "Fuzzy logic + neural networks predict your mental state 7 days before you feel it.",
              color: "indigo"
            },
            {
              icon: <Shield className="text-yellow-400" size={24} />,
              title: "Privacy First",
              description: "All processing is local. Your data never leaves your device without explicit consent.",
              color: "yellow"
            },
            {
              icon: <Zap className="text-pink-400" size={24} />,
              title: "Instant Insights",
              description: "Connect once, get instant analysis. No forms, no manual input, no effort.",
              color: "pink"
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-2xl p-6 hover:border-indigo-500/50 transition-all"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center px-4 py-20 border-t border-[#2a2a4a]">
        <h2 className="text-3xl font-bold mb-4">
          Ready to understand yourself?
        </h2>
        <p className="text-gray-400 mb-8">
          Join thousands who use MindWatch to stay ahead of their mental health.
        </p>
        <button
          onClick={handleGoogleLogin}
          className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all mx-auto"
        >
          <Brain size={20} />
          Start Your Wellness Journey
        </button>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-600 text-sm border-t border-[#2a2a4a]">
        <p>© 2026 MindWatch • Not a medical device • For wellness awareness only</p>
      </footer>
    </div>
  )
}