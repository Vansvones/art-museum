
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

function RequireAdmin({ children }) {
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    fetch('http://localhost:3000/api/auth/me', {
      credentials: 'include'
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Not logged in');
        }

        return response.json();
      })
      .then((data) => {
        if (data.user?.role === 'ADMIN') {
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

export default RequireAdmin;
