import { useParams } from 'react-router-dom';

export default function ChatPage() {
  const params = useParams<{ chatId: string }>();
  return (
    <div>
      <h1>Chat Page {params.chatId}</h1>
    </div>
  );
}