import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

function RequireCurator({ children }) {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    fetch('/api/auth/curator/me', {
      credentials: 'include'
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Not authorized');
        }

        return response.json();
      })
      .then((data) => {
        if (data.user?.role === 'CURATOR') {
          setStatus('allowed');
        } else {
          setStatus('denied');
        }
      })
      .catch(() => {
        setStatus('denied');
      });
  }, []);

  if (status === 'checking') {
    return <p>Checking login...</p>;
  }

  if (status === 'denied') {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default RequireCurator;
