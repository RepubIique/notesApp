import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await authAPI.login(password);
      login(data.role);
      navigate('/chat');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  const handleSSOClick = () => {
    window.location.href = 'https://www.weather.com';
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Login</h1>
        
        {/* Fake SSO Buttons */}
        <div style={styles.ssoContainer}>
          <button 
            type="button"
            onClick={handleSSOClick}
            style={{...styles.ssoButton, ...styles.facebookButton}}
          >
            <span style={styles.ssoIcon}>f</span>
            Continue with Facebook
          </button>
          
          <button 
            type="button"
            onClick={handleSSOClick}
            style={{...styles.ssoButton, ...styles.googleButton}}
          >
            <span style={styles.ssoIcon}>G</span>
            Continue with Google
          </button>
          
          <button 
            type="button"
            onClick={handleSSOClick}
            style={{...styles.ssoButton, ...styles.tiktokButton}}
          >
            <span style={styles.ssoIcon}>♪</span>
            Continue with TikTok
          </button>
        </div>

        {/* Divider */}
        <div style={styles.divider}>
          <span style={styles.dividerLine}></span>
          <span style={styles.dividerText}>OR</span>
          <span style={styles.dividerLine}></span>
        </div>

        {/* Password Login */}
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter password"
            style={styles.input}
            disabled={loading}
            autoFocus
          />
          <button 
            type="submit" 
            style={styles.button}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
          {error && <div style={styles.error}>{error}</div>}
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5'
  },
  card: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px'
  },
  title: {
    margin: '0 0 1.5rem 0',
    fontSize: '1.5rem',
    textAlign: 'center'
  },
  ssoContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginBottom: '1.5rem'
  },
  ssoButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.75rem',
    fontSize: '1rem',
    fontWeight: '600',
    border: '1px solid #ddd',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    position: 'relative'
  },
  facebookButton: {
    backgroundColor: '#1877f2',
    color: 'white',
    border: 'none'
  },
  googleButton: {
    backgroundColor: 'white',
    color: '#3c4043',
    border: '1px solid #dadce0'
  },
  tiktokButton: {
    backgroundColor: '#000000',
    color: 'white',
    border: 'none'
  },
  ssoIcon: {
    marginRight: '0.5rem',
    fontSize: '1.2rem',
    fontWeight: 'bold'
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    margin: '1.5rem 0',
    gap: '0.75rem'
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#ddd'
  },
  dividerText: {
    color: '#666',
    fontSize: '0.875rem',
    fontWeight: '500'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  input: {
    padding: '0.75rem',
    fontSize: '1rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    outline: 'none'
  },
  button: {
    padding: '0.75rem',
    fontSize: '1rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  error: {
    color: '#dc3545',
    fontSize: '0.875rem',
    textAlign: 'center'
  }
};

export default LoginPage;
