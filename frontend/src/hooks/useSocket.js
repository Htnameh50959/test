// src/hooks/useSocket.js
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { getSocket, connectSocket } from '@/services/socketService';
import { selectAuthToken } from '@/redux/slices/authSlice';

export const useSocket = () => {
  const token = useSelector(selectAuthToken);
  const [socket, setSocket] = useState(getSocket());

  useEffect(() => {
    if (token && !socket) {
      const newSocket = connectSocket(token);
      setSocket(newSocket);
    }
  }, [token, socket]);

  return socket;
};

export default useSocket;
