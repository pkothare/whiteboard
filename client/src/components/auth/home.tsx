import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check, ExternalLink } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessionName, setSessionName] = useState('');
  const [createdSession, setCreatedSession] = useState<{ id: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const createSessionMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest('/api/sessions', {
        method: 'POST',
        body: { name },
      });
    },
    onSuccess: (session) => {
      setCreatedSession(session);
      toast({
        title: "Session Created!",
        description: "Your whiteboard session is ready to share.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateSession = () => {
    createSessionMutation.mutate(sessionName || 'Untitled Whiteboard');
  };

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  const copySessionLink = async () => {
    if (!createdSession) return;
    
    const sessionUrl = `${window.location.origin}/whiteboard/${createdSession.id}`;
    await navigator.clipboard.writeText(sessionUrl);
    setCopied(true);
    
    toast({
      title: "Link Copied!",
      description: "Session link copied to clipboard.",
    });
    
    setTimeout(() => setCopied(false), 2000);
  };

  const joinSession = () => {
    if (!createdSession) return;
    window.location.href = `/whiteboard/${createdSession.id}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome back, {user?.name || 'User'}!</CardTitle>
          <p className="text-gray-600 mt-2">Create a whiteboard session to collaborate with others</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!createdSession ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="sessionName">Session Name (Optional)</Label>
                <Input
                  id="sessionName"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="Enter session name..."
                  disabled={createSessionMutation.isPending}
                />
              </div>
              
              <Button 
                onClick={handleCreateSession}
                className="w-full"
                disabled={createSessionMutation.isPending}
              >
                {createSessionMutation.isPending ? 'Creating...' : 'Create Session'}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">Session Created!</h3>
                <p className="text-sm text-green-600 mb-3">{createdSession.name}</p>
                
                <div className="flex gap-2">
                  <Button onClick={copySessionLink} variant="outline" size="sm" className="flex-1">
                    {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copied ? 'Copied!' : 'Copy Link'}
                  </Button>
                  <Button onClick={joinSession} size="sm" className="flex-1">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Join Session
                  </Button>
                </div>
              </div>
              
              <Button
                onClick={() => setCreatedSession(null)}
                variant="outline"
                className="w-full"
              >
                Create Another Session
              </Button>
            </div>
          )}
          
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full"
          >
            Sign Out
          </Button>
          
          <div className="text-center text-sm text-gray-500 mt-6">
            <p>Share the session link to collaborate with up to 10 users</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}