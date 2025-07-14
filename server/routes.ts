import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { WSMessage, type CursorData, type StrokeData } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";

const userColors = [
  '#EF4444', '#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899',
  '#6366F1', '#14B8A6', '#F97316', '#84CC16'
];

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Setup Replit authentication
  await setupAuth(app);
  
  // WebSocket server setup
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    perMessageDeflate: false,
    maxPayload: 1024 * 1024 // 1MB max payload
  });

  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });

  console.log('WebSocket server listening on path: /ws');
  
  // Store WebSocket connections
  const connections = new Map<string, { ws: WebSocket; userId: string; userName: string; color: string }>();
  
  // Generate random user name
  function generateUserName(): string {
    const adjectives = ['Creative', 'Artistic', 'Skilled', 'Talented', 'Inspired', 'Focused', 'Innovative'];
    const nouns = ['Artist', 'Designer', 'Creator', 'Painter', 'Sketcher', 'Doodler', 'Maker'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj} ${noun}`;
  }

  // Broadcast to all connected clients
  function broadcast(message: WSMessage, excludeUserId?: string) {
    const messageStr = JSON.stringify(message);
    connections.forEach((connection, sessionId) => {
      if (connection.userId !== excludeUserId && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(messageStr);
      }
    });
  }

  // Send user list to all clients
  async function sendUserList() {
    const users = await storage.getActiveWhiteboardUsers();
    const userList = Array.from(connections.values()).map(conn => ({
      userId: conn.userId,
      name: conn.userName,
      color: conn.color,
      isActive: true
    }));
    
    broadcast({
      type: 'user_list',
      data: userList,
      timestamp: Date.now()
    });
  }

  wss.on('connection', async (ws, req) => {
    console.log('New WebSocket connection established from:', req.socket.remoteAddress);
    const sessionId = Math.random().toString(36).substr(2, 9);
    let userName = generateUserName(); // fallback
    const color = userColors[Math.floor(Math.random() * userColors.length)];
    
    // Store connection
    connections.set(sessionId, {
      ws,
      userId: sessionId,
      userName,
      color
    });

    // Create whiteboard user record
    await storage.createWhiteboardUser({
      sessionId,
      name: userName,
      color,
      isActive: true,
      cursorX: 0,
      cursorY: 0
    });

    // Send initial data to new user
    const existingStrokes = await storage.getDrawingStrokes();
    ws.send(JSON.stringify({
      type: 'init',
      data: {
        userId: sessionId,
        userName,
        color,
        strokes: existingStrokes
      }
    }));

    // Notify others of new user
    broadcast({
      type: 'user_joined',
      data: { userId: sessionId, name: userName, color },
      timestamp: Date.now()
    }, sessionId);

    // Send updated user list
    await sendUserList();

    ws.on('message', async (data) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'user_info':
            // Update user name from client
            console.log('Received user_info:', message.data?.userName);
            if (message.data?.userName) {
              const connection = connections.get(sessionId);
              if (connection) {
                console.log('Updating user name from', connection.userName, 'to', message.data.userName);
                connection.userName = message.data.userName;
                connections.set(sessionId, connection);
                
                // Update whiteboard user record
                await storage.updateWhiteboardUser(sessionId, {
                  name: message.data.userName
                });
                
                // Send updated user list
                await sendUserList();
                
                // Notify user that their info was updated
                ws.send(JSON.stringify({
                  type: 'user_info_updated',
                  data: { userName: message.data.userName },
                  timestamp: Date.now()
                }));
              }
            }
            break;
            
          case 'stroke_start':
          case 'stroke_move':
          case 'stroke_end':
            // Save stroke data
            if (message.data) {
              await storage.saveDrawingStroke({
                sessionId,
                userId: sessionId,
                strokeData: message.data
              });
            }
            
            // Broadcast to other users
            broadcast({
              ...message,
              userId: sessionId,
              timestamp: Date.now()
            }, sessionId);
            break;
            
          case 'cursor_move':
            // Update cursor position
            if (message.data) {
              await storage.updateWhiteboardUser(sessionId, {
                cursorX: message.data.x,
                cursorY: message.data.y
              });
            }
            
            // Get current connection info
            const connection = connections.get(sessionId);
            if (connection) {
              // Broadcast cursor position to other users
              broadcast({
                type: 'cursor_move',
                data: {
                  userId: sessionId,
                  userName: connection.userName,
                  color: connection.color,
                  x: message.data.x,
                  y: message.data.y
                },
                timestamp: Date.now()
              }, sessionId);
            }
            break;
            
          case 'clear_canvas':
            // Clear all strokes
            await storage.clearDrawingStrokes();
            
            // Broadcast clear command to ALL users (including sender)
            broadcast({
              type: 'clear_canvas',
              data: { userId: sessionId },
              timestamp: Date.now()
            }); // Don't exclude sender so their canvas clears too
            break;
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', async () => {
      // Remove from connections
      connections.delete(sessionId);
      
      // Mark user as inactive
      await storage.updateWhiteboardUser(sessionId, { isActive: false });
      
      // Notify others of user leaving
      broadcast({
        type: 'user_left',
        data: { userId: sessionId, name: userName },
        timestamp: Date.now()
      });
      
      // Send updated user list
      await sendUserList();
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // REST API endpoints
  app.get('/api/users', async (req, res) => {
    try {
      const users = await storage.getActiveWhiteboardUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.get('/api/strokes', async (req, res) => {
    try {
      const strokes = await storage.getDrawingStrokes();
      res.json(strokes);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch strokes' });
    }
  });

  app.delete('/api/strokes', async (req, res) => {
    try {
      await storage.clearDrawingStrokes();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to clear strokes' });
    }
  });

  return httpServer;
}
