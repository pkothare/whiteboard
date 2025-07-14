import React from 'react';
import { Users } from 'lucide-react';

interface User {
  userId: string;
  name: string;
  color: string;
  isActive: boolean;
}

interface UserPanelProps {
  users: User[];
  currentUserId?: string;
}

export default function UserPanel({ users, currentUserId }: UserPanelProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatus = (userId: string) => {
    return userId === currentUserId ? 'Drawing' : 'Viewing';
  };

  return (
    <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg border border-slate-200 w-64 max-h-96 overflow-hidden z-10">
      <div className="p-4 border-b border-slate-200">
        <h3 className="text-sm font-medium text-slate-700 flex items-center">
          <Users className="w-4 h-4 mr-2" />
          Online Users ({users.length})
        </h3>
      </div>
      
      <div className="p-2 max-h-80 overflow-y-auto">
        {users.map((user) => (
          <div
            key={user.userId}
            className={`flex items-center space-x-3 p-2 hover:bg-slate-50 rounded-lg ${
              user.userId === currentUserId ? 'bg-blue-50' : ''
            }`}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: user.color }}
            >
              <span className="text-white text-xs font-medium">
                {getInitials(user.name)}
              </span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-slate-700">
                {user.name}
                {user.userId === currentUserId && ' (You)'}
              </div>
              <div className="text-xs text-slate-500">
                {getStatus(user.userId)}
              </div>
            </div>
            <div className="w-2 h-2 bg-green-500 rounded-full" />
          </div>
        ))}
        
        {users.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No users online</p>
          </div>
        )}
      </div>
    </div>
  );
}
