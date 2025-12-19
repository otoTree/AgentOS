import { Mail, Calendar, User, FileText } from 'lucide-react';
import { tryParseJson } from './utils';

interface EmailPreviewProps {
  toolName: string;
  result: string;
}

export function EmailPreview({ toolName, result }: EmailPreviewProps) {
  const data = tryParseJson(result);

  if (!data || data.error) {
    return <div className="text-red-500 text-xs">{data?.error || result}</div>;
  }

  if (toolName === 'email_list') {
    const { emails, message } = data;
    if (message) return <div className="text-zinc-500 text-xs italic">{message}</div>;
    
    return (
      <div className="space-y-2 w-full max-w-md">
        {emails.map((email: any) => (
          <div key={email.id} className="flex flex-col gap-1 p-3 bg-white border border-zinc-100 rounded-lg shadow-sm hover:border-zinc-300 transition-colors">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${email.isRead ? 'bg-zinc-100 text-zinc-500' : 'bg-blue-50 text-blue-600'}`}>
                {email.isRead ? 'Read' : 'Unread'}
              </span>
              <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {email.date}
              </span>
            </div>
            <div className="font-medium text-sm text-zinc-800 truncate">{email.subject}</div>
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <User className="w-3 h-3" />
                <span className="truncate max-w-[150px]">{email.from}</span>
            </div>
            {email.snippet && (
                <div className="text-xs text-zinc-400 line-clamp-2 mt-1 bg-zinc-50 p-1.5 rounded">
                    {email.snippet}
                </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (toolName === 'email_get') {
      const { subject, from, to, date, body, html } = data;
      return (
          <div className="bg-white border border-zinc-100 rounded-lg p-4 shadow-sm w-full max-w-lg space-y-3">
              <div className="border-b border-zinc-50 pb-2 mb-2 space-y-1">
                  <h3 className="font-semibold text-zinc-900 text-sm">{subject}</h3>
                  <div className="flex justify-between items-center text-xs text-zinc-500">
                      <div className="flex flex-col">
                        <span>From: <span className="text-zinc-700">{from}</span></span>
                        <span>To: <span className="text-zinc-700">{to}</span></span>
                      </div>
                      <div className="text-[10px]">{date}</div>
                  </div>
              </div>
              <div className="text-xs text-zinc-700 whitespace-pre-wrap font-sans bg-zinc-50 p-3 rounded-md max-h-60 overflow-y-auto">
                  {body}
              </div>
          </div>
      )
  }

  return <pre className="text-xs text-zinc-500">{result}</pre>;
}
