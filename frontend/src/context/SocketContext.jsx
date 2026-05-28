import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';

const STAFF_ROLES = ['SUPER_ADMIN', 'MANAGER', 'AGENT'];

const SocketContext = createContext(null);

/**
 * Provides a single shared Socket.IO connection for the entire app.
 * The connection is established when a staff user is authenticated and
 * torn down on logout or when the component unmounts.
 *
 * Also listens for role:updated events so that the current user's session
 * is updated in real time when an admin changes their role.
 */
export const SocketProvider = ({ children }) => {
  const { user, updateUser } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  // Stable callback so the socket event handler does not capture a stale closure
  const handleRoleUpdated = useCallback(
    ({ role }) => {
      if (!role) return;
      updateUser({ role });
    },
    [updateUser]
  );

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    // Only staff members need a socket connection
    if (!token || !user || !STAFF_ROLES.includes(user.role)) {
      // Clean up any existing connection when user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    // Avoid creating a duplicate socket if already connected
    if (socketRef.current?.connected) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      // Silently degrade — the app still works without real-time updates
      console.warn('[Socket] connection error:', err.message);
      setConnected(false);
    });

    // ── Role change notification ──────────────────────────────────────────
    // When an admin changes this user's role the server emits role:updated
    // to their private room. We update AuthContext + localStorage immediately
    // so new permissions are reflected without requiring re-login.
    socket.on('role:updated', handleRoleUpdated);

    return () => {
      socket.off('role:updated', handleRoleUpdated);
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
    // Re-run when the authenticated user changes (login / logout / role change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

/**
 * Returns the shared Socket.IO instance and connection status.
 *
 * @returns {{ socket: import('socket.io-client').Socket | null, connected: boolean }}
 */
export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
};

export default SocketContext;
