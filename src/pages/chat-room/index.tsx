import { useParams } from 'react-router-dom';
import { ChatWorkspace } from '../chat';

export function ChatRoomPage() {
  const { roomId } = useParams();
  return <ChatWorkspace roomId={roomId} />;
}
