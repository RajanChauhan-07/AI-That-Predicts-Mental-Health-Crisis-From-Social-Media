import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

export default function AuthCallback() {
  const navigate = useNavigate()
  const { setToken, setUser } = useAuthStore()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const error = params.get('error')

    if (error) {
      navigate(`/?error=${error}`, { replace: true })
      return
    }
    if (token) {
      setToken(token)
      axios.get(`${API_URL}/api/auth/me?token=${token}`)
        .then((res) => {
          setUser(res.data)
          navigate('/dashboard', { replace: true })
        })
        .catch(() => {
          navigate('/?error=session_error', { replace: true })
        })
    } else {
      navigate('/?error=missing_code', { replace: true })
    }
  }, [navigate, setToken, setUser])

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white text-xl font-medium">Signing you in...</p>
        <p className="text-gray-400 text-sm mt-2">Setting up your MindWatch profile</p>
      </div>
    </div>
  )
}