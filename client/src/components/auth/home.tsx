import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'wouter';

export default function Home() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    window.location.href = '/api/logout';
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
          <p className="text-gray-600 mt-2">Ready to create amazing drawings with others?</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/whiteboard">
            <Button className="w-full">
              Start Drawing
            </Button>
          </Link>
          
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full"
          >
            Sign Out
          </Button>
          
          <div className="text-center text-sm text-gray-500 mt-6">
            <p>Collaborate with up to 10 users in real-time</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}