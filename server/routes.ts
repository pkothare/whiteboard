import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { WSMessage, type CursorData, type StrokeData } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";
import crypto from "crypto";

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
  
  // Store WebSocket connections by session
  const connections = new Map<string, { ws: WebSocket; userId: string; userName: string; color: string; whiteboardSessionId?: string }>();
  const sessionConnections = new Map<string, Set<string>>(); // sessionId -> Set of userIds
  
  // Generate random user name
  function generateUserName(): string {
    const adjectives = ['Creative', 'Artistic', 'Skilled', 'Talented', 'Inspired', 'Focused', 'Innovative'];
    const nouns = ['Artist', 'Designer', 'Creator', 'Painter', 'Sketcher', 'Doodler', 'Maker'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return `${adj} ${noun}`;
  }

  // Broadcast to all connected clients in a specific session
  function broadcast(message: WSMessage, whiteboardSessionId?: string, excludeUserId?: string) {
    const messageStr = JSON.stringify(message);
    
    if (whiteboardSessionId) {
      // Broadcast only to users in the same whiteboard session
      const usersInSession = sessionConnections.get(whiteboardSessionId) || new Set();
      usersInSession.forEach(userId => {
        const connection = connections.get(userId);
        if (connection && connection.userId !== excludeUserId && connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.send(messageStr);
        }
      });
    } else {
      // Broadcast to all connections (fallback)
      connections.forEach((connection, userId) => {
        if (connection.userId !== excludeUserId && connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.send(messageStr);
        }
      });
    }
  }

  // Send user list to clients in a specific session
  async function sendUserList(whiteboardSessionId?: string) {
    if (whiteboardSessionId) {
      const usersInSession = sessionConnections.get(whiteboardSessionId) || new Set();
      const userList = Array.from(usersInSession).map(userId => {
        const connection = connections.get(userId);
        return connection ? {
          userId: connection.userId,
          name: connection.userName,
          color: connection.color,
          isActive: true
        } : null;
      }).filter(Boolean);
      
      broadcast({
        type: 'user_list',
        data: userList,
        timestamp: Date.now()
      }, whiteboardSessionId);
    }
  }

  wss.on('connection', async (ws, req) => {
    console.log('New WebSocket connection established from:', req.socket.remoteAddress);
    const userId = Math.random().toString(36).substr(2, 9);
    let userName = generateUserName(); // fallback
    let whiteboardSessionId: string | undefined;
    const color = userColors[Math.floor(Math.random() * userColors.length)];
    
    // Store connection
    connections.set(userId, {
      ws,
      userId,
      userName,
      color,
      whiteboardSessionId
    });

    // Send initial data to new user (without session-specific data initially)
    ws.send(JSON.stringify({
      type: 'init',
      data: {
        userId,
        userName,
        color,
        strokes: [] // Will be loaded when session is set
      }
    }));

    ws.on('message', async (data) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'join_session':
            // User wants to join a specific whiteboard session
            if (message.data && message.data.sessionId) {
              whiteboardSessionId = message.data.sessionId;
              
              // Update connection with session info
              const connection = connections.get(userId);
              if (connection) {
                connection.whiteboardSessionId = whiteboardSessionId;
                connections.set(userId, connection);
              }
              
              // Add user to session
              if (!sessionConnections.has(whiteboardSessionId)) {
                sessionConnections.set(whiteboardSessionId, new Set());
              }
              sessionConnections.get(whiteboardSessionId)!.add(userId);
              
              // Create whiteboard user record for this session
              await storage.createWhiteboardUser({
                sessionId: userId,
                name: userName,
                color,
                isActive: true,
                cursorX: 0,
                cursorY: 0
              });
              
              // Send session-specific strokes
              const existingStrokes = await storage.getDrawingStrokes(whiteboardSessionId);
              ws.send(JSON.stringify({
                type: 'session_joined',
                data: {
                  sessionId: whiteboardSessionId,
                  strokes: existingStrokes
                }
              }));
              
              // Notify others in the session of new user
              broadcast({
                type: 'user_joined',
                data: { userId, name: userName, color },
                timestamp: Date.now()
              }, whiteboardSessionId, userId);
              
              // Send updated user list for this session
              await sendUserList(whiteboardSessionId);
            }
            break;
            
          case 'user_info':
            // Update user name from client
            console.log('Received user_info:', message.data?.userName);
            if (message.data?.userName) {
              const connection = connections.get(userId);
              if (connection) {
                console.log('Updating user name from', connection.userName, 'to', message.data.userName);
                connection.userName = message.data.userName;
                userName = message.data.userName;
                connections.set(userId, connection);
                
                // Update whiteboard user record
                await storage.updateWhiteboardUser(userId, {
                  name: message.data.userName
                });
                
                // Send updated user list for this session
                if (whiteboardSessionId) {
                  await sendUserList(whiteboardSessionId);
                }
                
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
            // Save stroke data for the specific session
            if (message.data && whiteboardSessionId) {
              await storage.saveDrawingStroke({
                sessionId: whiteboardSessionId,
                type: message.type as 'stroke_start' | 'stroke_move' | 'stroke_end',
                x: message.data.x,
                y: message.data.y,
                color: message.data.color,
                size: message.data.size,
                tool: message.data.tool,
                pressure: message.data.pressure || 1.0,
                userId: userId
              });
            }
            
            // Broadcast to other users in the same session
            broadcast({
              ...message,
              userId: userId,
              timestamp: Date.now()
            }, whiteboardSessionId, userId);
            break;
            
          case 'cursor_move':
            // Update cursor position
            if (message.data) {
              await storage.updateWhiteboardUser(userId, {
                cursorX: message.data.x,
                cursorY: message.data.y
              });
            }
            
            // Get current connection info
            const connection = connections.get(userId);
            if (connection) {
              // Broadcast cursor position to other users in the same session
              broadcast({
                type: 'cursor_move',
                data: {
                  userId: userId,
                  userName: connection.userName,
                  color: connection.color,
                  x: message.data.x,
                  y: message.data.y
                },
                timestamp: Date.now()
              }, whiteboardSessionId, userId);
            }
            break;
            
          case 'clear_canvas':
            // Clear strokes for the specific session
            if (whiteboardSessionId) {
              await storage.clearDrawingStrokes(whiteboardSessionId);
            }
            
            // Broadcast clear command to users in the same session (including sender)
            broadcast({
              type: 'clear_canvas',
              data: { userId: userId },
              timestamp: Date.now()
            }, whiteboardSessionId); // Don't exclude sender so their canvas clears too
            break;
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });

    ws.on('close', async () => {
      // Remove from connections
      connections.delete(userId);
      
      // Remove from session connections
      if (whiteboardSessionId) {
        const usersInSession = sessionConnections.get(whiteboardSessionId);
        if (usersInSession) {
          usersInSession.delete(userId);
          if (usersInSession.size === 0) {
            sessionConnections.delete(whiteboardSessionId);
          }
        }
      }
      
      // Mark user as inactive
      await storage.updateWhiteboardUser(userId, { isActive: false });
      
      // Notify others in the session of user leaving
      if (whiteboardSessionId) {
        broadcast({
          type: 'user_left',
          data: { userId: userId, name: userName },
          timestamp: Date.now()
        }, whiteboardSessionId);
        
        // Send updated user list for this session
        await sendUserList(whiteboardSessionId);
      }
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

  // Session routes
  app.post('/api/sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { name } = req.body;
      
      const sessionId = crypto.randomUUID();
      const session = await storage.createWhiteboardSession({
        id: sessionId,
        name: name || 'Untitled Whiteboard',
        createdBy: userId,
      });
      
      res.json(session);
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  app.get('/api/sessions/:id', async (req, res) => {
    try {
      const sessionId = req.params.id;
      const session = await storage.getWhiteboardSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      res.json(session);
    } catch (error) {
      console.error("Error fetching session:", error);
      res.status(500).json({ message: "Failed to fetch session" });
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
