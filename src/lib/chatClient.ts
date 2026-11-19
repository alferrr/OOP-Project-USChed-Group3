import { api } from '../api/client'

export interface ChatMessage { role: 'user' | 'assistant'; content: string }

/** Sends the conversation to the assistant and reports the reply as it streams in (`onText` gets the text so far). */
export async function streamChat(messages: ChatMessage[], page: string | null, onText: (textSoFar: string) => void, signal?: AbortSignal): Promise<string> {
  const res = await api<Response>('/chat', { body: { messages, page }, ismis: true, raw: true, signal })
  if (!res.body) return ''
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    text += decoder.decode(value, { stream: true })
    onText(text)
  }
  text += decoder.decode()
  onText(text)
  return text
}
