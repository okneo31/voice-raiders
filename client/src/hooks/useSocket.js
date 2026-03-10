import { useEffect, useState } from 'react';
import { socket } from '../socket';

export function useSocket() {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    socket.connect();

    function onConnect() { setIsConnected(true); }
    function onDisconnect() { setIsConnected(false); }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return { socket, isConnected };
}
