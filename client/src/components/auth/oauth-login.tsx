import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FaGoogle, FaApple } from 'react-icons/fa';

export default function OAuthLogin() {
  const handleGoogleLogin = () => {
    window.location.href = '/auth/google';
  };

  const handleAppleLogin = () => {
    window.location.href = '/auth/apple';
  };

  const handleDemoLogin = () => {
    // Fallback to demo mode
    const name = prompt('Enter your name for demo mode:');
    if (name?.trim()) {
      fetch('/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
        credentials: 'same-origin'
      }).then(response => {
        if (response.ok) {
          window.location.reload();
        }
      });
    }
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
          <CardTitle className="text-2xl font-bold">Welcome to Collaborative Whiteboard</CardTitle>
          <p className="text-gray-600 mt-2">Sign in to start drawing with others in real-time</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center space-x-2 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            variant="outline"
          >
            <FaGoogle className="w-5 h-5 text-red-500" />
            <span>Continue with Google</span>
          </Button>
          
          <Button
            onClick={handleAppleLogin}
            className="w-full flex items-center justify-center space-x-2 bg-black text-white hover:bg-gray-800"
          >
            <FaApple className="w-5 h-5" />
            <span>Continue with Apple</span>
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>
          
          <Button
            onClick={handleDemoLogin}
            variant="outline"
            className="w-full"
          >
            Try Demo Mode
          </Button>
          
          <div className="text-center text-sm text-gray-500 mt-6">
            <p>By signing in, you agree to our terms of service and privacy policy</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}