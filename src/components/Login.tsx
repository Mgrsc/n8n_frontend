import { useState, FormEvent } from 'react'

interface LoginProps {
  onLogin: (username: string, password: string) => Promise<void>
  appTitle?: string
}

export default function Login({ onLogin, appTitle = 'AI Chat' }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      setError('Please enter username and password')
      return
    }
    onLogin(username, password)
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>{appTitle}</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {error && <div className="error">{error}</div>}
          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  )
}
