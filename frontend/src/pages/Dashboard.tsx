import { Brain, Music, Activity, MessageCircle,
         LogOut, Settings, Bell, Upload, Youtube, Send, Bot, X } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

export default function Dashboard() {
  const { user, token, logout, setUser } = useAuthStore()
  const navigate = useNavigate()
  const [spotifyData, setSpotifyData] = useState<any>(null)
  const [youtubeData, setYoutubeData] = useState<any>(null)
  const [loadingSpotify, setLoadingSpotify] = useState(false)
  const [loadingYoutube, setLoadingYoutube] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const watchHistoryRef = useRef<HTMLInputElement>(null)
  const searchHistoryRef = useRef<HTMLInputElement>(null)

  // Chatbot state
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<any[]>([
    {
      role: 'assistant',
      content: "Hi! I'm MindWatch AI 🧠 I can analyze your mental wellness based on your Spotify and YouTube data. What would you like to know?"
    }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [starters, setStarters] = useState<string[]>([])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const spotifyJustConnected = params.get('spotify') === 'connected'
    if (spotifyJustConnected && token) {
      fetch(`${API_URL}/api/auth/me?token=${token}`)
        .then(r => r.json())
        .then((data) => {
          setUser(data)
          // Clear ?spotify=connected from URL so effect doesn't re-run unnecessarily
          window.history.replaceState({}, '', window.location.pathname)
        })
        .catch(() => {})
    }
    if (user?.spotify_connected && token) {
      setLoadingSpotify(true)
      axios.get(`${API_URL}/api/connectors/spotify/analysis?token=${token}`)
        .then(res => setSpotifyData(res.data))
        .catch(err => console.error(err))
        .finally(() => setLoadingSpotify(false))
    }
    if (token) {
      axios.get(`${API_URL}/api/chat/starters?token=${token}`)
        .then(res => setStarters(res.data.starters))
        .catch(() => {})
    }
  }, [token, user?.spotify_connected])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleLogout = () => { logout(); navigate('/') }

  const handleSpotifyConnect = () => {
    if (!token) return
    window.location.href = `${API_URL}/api/connectors/spotify/connect?token=${token}`
  }

  const handleYoutubeUpload = async () => {
    const watchFile = watchHistoryRef.current?.files?.[0]
    if (!watchFile) { alert('Please select your watch-history.html file!'); return }
    setLoadingYoutube(true)
    const formData = new FormData()
    formData.append('watch_history', watchFile)
    const searchFile = searchHistoryRef.current?.files?.[0]
    if (searchFile) formData.append('search_history', searchFile)
    try {
      const res = await axios.post(
        `${API_URL}/api/connectors/youtube/analyze?token=${token}`,
        formData
      )
      setYoutubeData(res.data)
    } catch (err) {
      alert('Error analyzing YouTube history. Please try again.')
    } finally {
      setLoadingYoutube(false)
    }
  }

  const handleSendMessage = async (message?: string) => {
    const msg = message || chatInput.trim()
    if (!msg || chatLoading || !token) return
    setChatInput('')
    const newMessages = [...chatMessages, { role: 'user', content: msg }]
    setChatMessages(newMessages)
    setChatLoading(true)
    try {
      const res = await axios.post(
        `${API_URL}/api/chat/message?token=${token}`,
        {
          message: msg,
          history: newMessages.slice(0, -1).slice(-10).map(m => ({
            role: m.role === 'assistant' ? 'model' : m.role,
            content: m.content
          })),
          spotify_data: spotifyData ?? undefined,
          youtube_data: youtubeData ?? undefined
        }
      )
      setChatMessages(prev => [...prev, { role: 'assistant', content: res.data.response }])
    } catch (err) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I had trouble connecting. Please try again!'
      }])
    } finally {
      setChatLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score > 65) return 'text-green-400'
    if (score > 40) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getValenceColor = (valence: number) => {
    if (valence > 60) return 'text-green-400'
    if (valence > 40) return 'text-yellow-400'
    return 'text-red-400'
  }

  const overallScore = (() => {
    const scores = []
    if (spotifyData) scores.push(spotifyData.avg_valence * 100)
    if (youtubeData) scores.push(youtubeData.emotional_diet_score)
    return scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b) / scores.length)
      : null
  })()

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-8 py-4 border-b border-[#2a2a4a]">
        <div className="flex items-center gap-2">
          <Brain className="text-indigo-500" size={24} />
          <span className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            MindWatch
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          >
            <Bot size={16} />
            Ask AI
          </button>
          <Bell size={20} className="text-gray-400 cursor-pointer hover:text-white" />
          <Settings size={20} className="text-gray-400 cursor-pointer hover:text-white" />
          {user?.picture && (
            <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
          )}
          <button onClick={handleLogout} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-gray-400 mt-1">Here's your mental wellness overview</p>
        </div>

        {/* Overall Score */}
        <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-2xl p-8 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm mb-2">Overall Wellness Score</p>
              <div className="flex items-end gap-3">
                <span className={`text-6xl font-bold ${overallScore !== null ? getScoreColor(overallScore) : 'text-indigo-400'}`}>
                  {overallScore !== null ? overallScore : '--'}
                </span>
                <span className="text-gray-400 mb-2">/100</span>
              </div>
              {overallScore !== null ? (
                <p className={`mt-2 font-medium ${getScoreColor(overallScore)}`}>
                  {overallScore > 65 ? '🟢 Good Mental Wellness' : overallScore > 40 ? '🟡 Moderate — Worth Monitoring' : '🔴 Needs Attention'}
                </p>
              ) : (
                <p className="text-yellow-400 mt-2">Connect data sources to get your score</p>
              )}
              <div className="flex gap-4 mt-3">
                {spotifyData && <span className="text-xs text-gray-400">🎵 Music: {Math.round(spotifyData.avg_valence * 100)}/100</span>}
                {youtubeData && <span className="text-xs text-gray-400">📺 Content: {youtubeData.emotional_diet_score}/100</span>}
              </div>
            </div>
            <div className="w-32 h-32 rounded-full border-4 border-indigo-500/30 flex items-center justify-center">
              <Brain size={48} className="text-indigo-500/50" />
            </div>
          </div>
        </div>

        {/* Connect Sources */}
        <h2 className="text-xl font-semibold mb-4">Connect Your Data Sources</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div onClick={handleSpotifyConnect}
            className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6 flex items-center justify-between hover:border-green-500/50 transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <Music size={24} className="text-green-400" />
              <span className="font-medium">Spotify</span>
            </div>
            <span className={`text-xs px-3 py-1 rounded-full ${user?.spotify_connected ? 'bg-green-900/30 text-green-400 border border-green-500/30' : 'bg-gray-900/30 text-gray-400 border border-gray-500/30'}`}>
              {loadingSpotify ? 'Loading...' : user?.spotify_connected ? '✓ Connected' : 'Connect'}
            </span>
          </div>
          <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6 flex items-center justify-between opacity-60">
            <div className="flex items-center gap-3">
              <Activity size={24} className="text-blue-400" />
              <span className="font-medium">Google Fit</span>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-gray-900/30 text-gray-400 border border-gray-500/30">Coming Soon</span>
          </div>
          <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6 flex items-center justify-between opacity-60">
            <div className="flex items-center gap-3">
              <MessageCircle size={24} className="text-purple-400" />
              <span className="font-medium">Notion</span>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-gray-900/30 text-gray-400 border border-gray-500/30">Coming Soon</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[#2a2a4a]">
          {['overview', 'music', 'youtube', 'predictions'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-all border-b-2 -mb-px ${activeTab === tab ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'}`}>
              {tab === 'youtube' ? '📺 YouTube' : tab === 'music' ? '🎵 Music' : tab === 'predictions' ? '🔮 Predictions' : '📊 Overview'}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6">
              <h3 className="font-semibold mb-4">🎵 Music Mood Summary</h3>
              {spotifyData ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Emotional Tone</span>
                    <span className={`font-medium ${getValenceColor(spotifyData.avg_valence * 100)}`}>{spotifyData.emotional_tone}</span>
                  </div>
                  {[
                    { label: 'Happiness', value: spotifyData.avg_valence * 100, color: 'bg-green-500' },
                    { label: 'Energy', value: spotifyData.avg_energy * 100, color: 'bg-yellow-500' },
                  ].map((m, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">{m.label}</span>
                        <span>{Math.round(m.value)}%</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div className={`${m.color} h-2 rounded-full`} style={{ width: `${m.value}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-[#2a2a4a]">
                    <span className="text-gray-400 text-sm">Late Night</span>
                    <span className={`text-sm ${spotifyData.late_night_listening_ratio > 0.3 ? 'text-red-400' : 'text-green-400'}`}>
                      {Math.round(spotifyData.late_night_listening_ratio * 100)}%
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center border border-dashed border-[#2a2a4a] rounded-lg">
                  <p className="text-gray-600 text-sm">Connect Spotify to see insights</p>
                </div>
              )}
            </div>

            <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6">
              <h3 className="font-semibold mb-4">📺 Content Diet Summary</h3>
              {youtubeData ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Emotional Diet Score</span>
                    <span className={`font-medium ${getScoreColor(youtubeData.emotional_diet_score)}`}>{youtubeData.emotional_diet_score}/100</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${youtubeData.emotional_diet_score}%` }} />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Dark Content</span>
                    <span className={`text-sm ${youtubeData.dark_content_percentage > 20 ? 'text-red-400' : 'text-green-400'}`}>{youtubeData.dark_content_percentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Videos Analyzed</span>
                    <span className="text-sm">{youtubeData.total_videos_analyzed}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-[#2a2a4a]">
                    <span className="text-gray-400 text-sm">Recovery vs Rumination</span>
                    <span className={`text-sm ${youtubeData.recovery_score > youtubeData.rumination_score ? 'text-green-400' : 'text-red-400'}`}>
                      {youtubeData.recovery_score > youtubeData.rumination_score ? '✅ Healthy' : '⚠️ Watch Out'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center border border-dashed border-[#2a2a4a] rounded-lg">
                  <p className="text-gray-600 text-sm">Upload YouTube history to see insights</p>
                </div>
              )}
            </div>

            <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6">
              <h3 className="font-semibold mb-4">🎧 Recently Played</h3>
              {spotifyData?.recently_played?.length > 0 ? (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {spotifyData.recently_played.slice(0, 8).map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#2a2a4a] transition-all">
                      {item.track?.album?.images?.[2]?.url && (
                        <img src={item.track.album.images[2].url} alt={item.track.name} className="w-8 h-8 rounded" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.track?.name}</p>
                        <p className="text-xs text-gray-400 truncate">{item.track?.artists?.[0]?.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center border border-dashed border-[#2a2a4a] rounded-lg">
                  <p className="text-gray-600 text-sm">Connect Spotify to see recent tracks</p>
                </div>
              )}
            </div>

            <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6">
              <h3 className="font-semibold mb-4">💡 Quick Insights</h3>
              <div className="space-y-3">
                {youtubeData?.insights?.slice(0, 3).map((insight: any, i: number) => (
                  <div key={i} className={`p-3 rounded-lg text-sm border ${insight.type === 'warning' ? 'bg-red-900/20 border-red-500/30 text-red-300' : 'bg-green-900/20 border-green-500/30 text-green-300'}`}>
                    {insight.message}
                  </div>
                ))}
                {spotifyData && (
                  <div className={`p-3 rounded-lg text-sm border ${spotifyData.avg_valence > 0.5 ? 'bg-green-900/20 border-green-500/30 text-green-300' : 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300'}`}>
                    🎵 {spotifyData.emotional_tone} — based on your recent {spotifyData.total_tracks_analyzed} tracks
                  </div>
                )}
                {!spotifyData && !youtubeData && (
                  <div className="h-32 flex items-center justify-center border border-dashed border-[#2a2a4a] rounded-lg">
                    <p className="text-gray-600 text-sm">Connect data sources to see insights</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MUSIC TAB */}
        {activeTab === 'music' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6">
              <h3 className="font-semibold mb-4">🎵 Detailed Music Analysis</h3>
              {spotifyData ? (
                <div className="space-y-4">
                  {[
                    { label: 'Happiness (Valence)', value: spotifyData.avg_valence * 100, color: 'bg-green-500' },
                    { label: 'Energy Level', value: spotifyData.avg_energy * 100, color: 'bg-yellow-500' },
                    { label: 'Danceability', value: spotifyData.avg_danceability * 100, color: 'bg-purple-500' },
                  ].map((m, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">{m.label}</span>
                        <span>{Math.round(m.value)}%</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-3">
                        <div className={`${m.color} h-3 rounded-full`} style={{ width: `${m.value}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#2a2a4a]">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-indigo-400">{Math.round(spotifyData.avg_tempo)}</p>
                      <p className="text-xs text-gray-400">Avg BPM</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-indigo-400">{Math.round(spotifyData.late_night_listening_ratio * 100)}%</p>
                      <p className="text-xs text-gray-400">Late Night</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center border border-dashed border-[#2a2a4a] rounded-lg">
                  <p className="text-gray-600 text-sm">Connect Spotify to see analysis</p>
                </div>
              )}
            </div>
            <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6">
              <h3 className="font-semibold mb-4">🎧 Recently Played</h3>
              {spotifyData?.recently_played?.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {spotifyData.recently_played.map((item: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#2a2a4a]">
                      {item.track?.album?.images?.[2]?.url && (
                        <img src={item.track.album.images[2].url} alt={item.track.name} className="w-8 h-8 rounded" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.track?.name}</p>
                        <p className="text-xs text-gray-400 truncate">{item.track?.artists?.[0]?.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center border border-dashed border-[#2a2a4a] rounded-lg">
                  <p className="text-gray-600 text-sm">No tracks found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* YOUTUBE TAB */}
        {activeTab === 'youtube' && (
          <div className="space-y-6">
            <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6">
              <h3 className="font-semibold mb-2">📺 YouTube History Analyzer</h3>
              <p className="text-gray-400 text-sm mb-4">Upload your watch-history.html from Google Takeout</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {[
                  { ref: watchHistoryRef, id: 'watch-history-input', label: 'Watch History (required)', name: 'watch-history.html' },
                  { ref: searchHistoryRef, id: 'search-history-input', label: 'Search History (optional)', name: 'search-history.html' },
                ].map((inp, i) => (
                  <div key={i}>
                    <label className="text-sm text-gray-400 mb-2 block">{inp.label}</label>
                    <div className="border border-dashed border-[#2a2a4a] rounded-lg p-4 hover:border-indigo-500/50 transition-all">
                      <input ref={inp.ref} type="file" accept=".html" className="hidden" id={inp.id} />
                      <label htmlFor={inp.id} className="flex flex-col items-center gap-2 cursor-pointer">
                        <Upload size={24} className="text-gray-400" />
                        <span className="text-sm text-gray-400">{inp.name}</span>
                        <span className="text-xs text-gray-600">Click to select</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={handleYoutubeUpload} disabled={loadingYoutube}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all">
                {loadingYoutube ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Analyzing...</>
                ) : (
                  <><Youtube size={18} />Analyze YouTube History</>
                )}
              </button>
            </div>

            {youtubeData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6">
                  <h3 className="font-semibold mb-4">📊 Content Analysis</h3>
                  <div className="space-y-4">
                    {[
                      { label: 'Emotional Diet Score', value: youtubeData.emotional_diet_score, color: 'bg-indigo-500', display: `${youtubeData.emotional_diet_score}/100` },
                      { label: 'Recovery Score', value: youtubeData.recovery_score, color: 'bg-green-500', display: `${youtubeData.recovery_score}%` },
                      { label: 'Rumination Score', value: youtubeData.rumination_score, color: 'bg-red-500', display: `${youtubeData.rumination_score}%` },
                    ].map((m, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">{m.label}</span>
                          <span>{m.display}</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-3">
                          <div className={`${m.color} h-3 rounded-full`} style={{ width: `${Math.min(m.value, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#2a2a4a]">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-indigo-400">{youtubeData.total_videos_analyzed}</p>
                        <p className="text-xs text-gray-400">Videos Analyzed</p>
                      </div>
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${youtubeData.dark_content_percentage > 20 ? 'text-red-400' : 'text-green-400'}`}>
                          {youtubeData.dark_content_percentage}%
                        </p>
                        <p className="text-xs text-gray-400">Dark Content</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6">
                  <h3 className="font-semibold mb-4">🎭 Content Categories</h3>
                  <div className="space-y-3">
                    {Object.entries(youtubeData.category_breakdown || {}).slice(0, 7).map(([cat, pct]: any) => (
                      <div key={cat}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400 capitalize">{cat.replace('_', ' ')}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2">
                          <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6 md:col-span-2">
                  <h3 className="font-semibold mb-4">💡 YouTube Insights</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {youtubeData.insights?.map((insight: any, i: number) => (
                      <div key={i} className={`p-3 rounded-lg text-sm border ${insight.type === 'warning' ? 'bg-red-900/20 border-red-500/30 text-red-300' : 'bg-green-900/20 border-green-500/30 text-green-300'}`}>
                        {insight.message}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PREDICTIONS TAB */}
        {activeTab === 'predictions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6">
              <h3 className="font-semibold mb-4">🔮 Risk Assessment</h3>
              {spotifyData || youtubeData ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Current Risk Level</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${(overallScore || 50) < 35 ? 'bg-red-900/30 text-red-400 border-red-500/30' : (overallScore || 50) < 55 ? 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30' : 'bg-green-900/30 text-green-400 border-green-500/30'}`}>
                      {(overallScore || 50) < 35 ? '⚠️ Elevated' : (overallScore || 50) < 55 ? '🟡 Moderate' : '🟢 Low Risk'}
                    </span>
                  </div>
                  {spotifyData && (
                    <div className="p-3 bg-[#0f0f1a] rounded-lg border border-[#2a2a4a] text-sm text-gray-300">
                      🎵 Music patterns: {spotifyData.emotional_tone} with {Math.round(spotifyData.late_night_listening_ratio * 100)}% late-night listening
                    </div>
                  )}
                  {youtubeData && (
                    <div className="p-3 bg-[#0f0f1a] rounded-lg border border-[#2a2a4a] text-sm text-gray-300">
                      📺 Content: {youtubeData.content_mood}
                    </div>
                  )}
                  <div className="p-3 bg-indigo-900/20 rounded-lg border border-indigo-500/30 text-sm text-indigo-300">
                    💡 Connect more data sources for more accurate predictions
                  </div>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center border border-dashed border-[#2a2a4a] rounded-lg">
                  <p className="text-gray-600 text-sm">Connect data sources to see predictions</p>
                </div>
              )}
            </div>
            <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6">
              <h3 className="font-semibold mb-4">📈 Wellness Dimensions</h3>
              <div className="space-y-3">
                {[
                  { label: 'Music Wellness', score: spotifyData ? Math.round(spotifyData.avg_valence * 100) : null, color: 'bg-green-500' },
                  { label: 'Content Diet', score: youtubeData ? youtubeData.emotional_diet_score : null, color: 'bg-indigo-500' },
                  { label: 'Sleep Pattern', score: null, color: 'bg-blue-500' },
                  { label: 'Physical Activity', score: null, color: 'bg-yellow-500' },
                  { label: 'Social Connection', score: null, color: 'bg-pink-500' },
                ].map((dim, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">{dim.label}</span>
                      <span className={dim.score !== null ? 'text-white' : 'text-gray-600'}>{dim.score !== null ? `${dim.score}/100` : 'No data'}</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-2">
                      <div className={`${dim.color} h-2 rounded-full`} style={{ width: dim.score !== null ? `${dim.score}%` : '0%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CHATBOT */}
      {chatOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-[#1a1a2e] border border-[#2a2a4a] rounded-2xl shadow-2xl flex flex-col z-50">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#2a2a4a]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div>
                <p className="font-medium text-sm">MindWatch AI</p>
                <p className="text-xs text-green-400">● Online</p>
              </div>
            </div>
            <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-white">
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-[#0f0f1a] text-gray-200 rounded-bl-sm border border-[#2a2a4a]'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-[#0f0f1a] border border-[#2a2a4a] p-3 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Starters */}
          {chatMessages.length === 1 && starters.length > 0 && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {starters.slice(0, 3).map((s, i) => (
                <button key={i} onClick={() => handleSendMessage(s)}
                  className="text-xs bg-[#0f0f1a] border border-[#2a2a4a] text-indigo-400 px-3 py-1 rounded-full hover:border-indigo-500 transition-all">
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-[#2a2a4a] flex gap-2">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask about your wellness..."
              className="flex-1 bg-[#0f0f1a] border border-[#2a2a4a] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
            />
            <button onClick={() => handleSendMessage()} disabled={chatLoading || !chatInput.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 p-2 rounded-xl transition-all">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}