import { users, whiteboardSessions, whiteboardUsers, drawingStrokes, type User, type InsertUser, type UpsertUser, type WhiteboardSession, type InsertWhiteboardSession, type WhiteboardUser, type InsertWhiteboardUser, type DrawingStroke, type InsertDrawingStroke } from "@shared/schema";

export interface IStorage {
  // User methods for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByProviderId(provider: string, providerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  
  // Session methods
  createWhiteboardSession(session: InsertWhiteboardSession): Promise<WhiteboardSession>;
  getWhiteboardSession(id: string): Promise<WhiteboardSession | undefined>;
  updateSessionActivity(id: string): Promise<void>;
  
  // Whiteboard user methods
  getWhiteboardUser(sessionId: string): Promise<WhiteboardUser | undefined>;
  createWhiteboardUser(user: InsertWhiteboardUser): Promise<WhiteboardUser>;
  updateWhiteboardUser(sessionId: string, updates: Partial<WhiteboardUser>): Promise<WhiteboardUser | undefined>;
  removeWhiteboardUser(sessionId: string): Promise<void>;
  getActiveWhiteboardUsers(sessionId?: string): Promise<WhiteboardUser[]>;
  
  // Drawing stroke methods
  saveDrawingStroke(stroke: InsertDrawingStroke): Promise<DrawingStroke>;
  getDrawingStrokes(sessionId?: string): Promise<DrawingStroke[]>;
  clearDrawingStrokes(sessionId?: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private sessions: Map<string, WhiteboardSession>;
  private whiteboardUsers: Map<string, WhiteboardUser>;
  private drawingStrokes: Map<number, DrawingStroke>;
  private currentUserId: number;
  private currentWhiteboardUserId: number;
  private currentStrokeId: number;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.whiteboardUsers = new Map();
    this.drawingStrokes = new Map();
    this.currentUserId = 1;
    this.currentWhiteboardUserId = 1;
    this.currentStrokeId = 1;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = this.users.get(userData.id!);
    if (existingUser) {
      // Update existing user
      const updatedUser: User = { 
        ...existingUser, 
        ...userData, 
        id: userData.id!,
        email: userData.email || null,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        profileImageUrl: userData.profileImageUrl || null,
        updatedAt: new Date() 
      };
      this.users.set(userData.id!, updatedUser);
      return updatedUser;
    } else {
      // Create new user
      const newUser: User = {
        id: userData.id!,
        email: userData.email || null,
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        profileImageUrl: userData.profileImageUrl || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set(userData.id!, newUser);
      return newUser;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async getUserByProviderId(provider: string, providerId: string): Promise<User | undefined> {
    // This method is not used with Replit Auth but kept for interface compatibility
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const userId = `demo-${this.currentUserId++}`;
    const user: User = { 
      id: userId,
      email: insertUser.email || null,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      profileImageUrl: insertUser.profileImageUrl || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      const updatedUser = { ...user, ...updates, updatedAt: new Date() };
      this.users.set(id, updatedUser);
      return updatedUser;
    }
    return undefined;
  }

  // Session methods
  async createWhiteboardSession(sessionData: InsertWhiteboardSession): Promise<WhiteboardSession> {
    const session: WhiteboardSession = {
      ...sessionData,
      createdAt: new Date(),
      lastActivity: new Date(),
    };
    this.sessions.set(session.id, session);
    return session;
  }

  async getWhiteboardSession(id: string): Promise<WhiteboardSession | undefined> {
    return this.sessions.get(id);
  }

  async updateSessionActivity(id: string): Promise<void> {
    const session = this.sessions.get(id);
    if (session) {
      session.lastActivity = new Date();
      this.sessions.set(id, session);
    }
  }

  async getWhiteboardUser(sessionId: string): Promise<WhiteboardUser | undefined> {
    return this.whiteboardUsers.get(sessionId);
  }

  async createWhiteboardUser(insertUser: InsertWhiteboardUser): Promise<WhiteboardUser> {
    const id = this.currentWhiteboardUserId++;
    const user: WhiteboardUser = {
      ...insertUser,
      id,
      lastSeen: new Date(),
      isActive: insertUser.isActive ?? true,
      cursorX: insertUser.cursorX ?? 0,
      cursorY: insertUser.cursorY ?? 0,
    };
    this.whiteboardUsers.set(insertUser.sessionId, user);
    return user;
  }

  async updateWhiteboardUser(sessionId: string, updates: Partial<WhiteboardUser>): Promise<WhiteboardUser | undefined> {
    const user = this.whiteboardUsers.get(sessionId);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates, lastSeen: new Date() };
    this.whiteboardUsers.set(sessionId, updatedUser);
    return updatedUser;
  }

  async removeWhiteboardUser(sessionId: string): Promise<void> {
    this.whiteboardUsers.delete(sessionId);
  }

  async getActiveWhiteboardUsers(sessionId?: string): Promise<WhiteboardUser[]> {
    const users = Array.from(this.whiteboardUsers.values()).filter((user) => user.isActive);
    if (sessionId) {
      return users.filter((user) => user.sessionId === sessionId);
    }
    return users;
  }

  async saveDrawingStroke(insertStroke: InsertDrawingStroke): Promise<DrawingStroke> {
    const id = this.currentStrokeId++;
    const stroke: DrawingStroke = {
      ...insertStroke,
      id,
      timestamp: new Date(),
    };
    this.drawingStrokes.set(id, stroke);
    return stroke;
  }

  async getDrawingStrokes(sessionId?: string): Promise<DrawingStroke[]> {
    const strokes = Array.from(this.drawingStrokes.values());
    if (sessionId) {
      return strokes.filter((stroke) => stroke.sessionId === sessionId);
    }
    return strokes;
  }

  async clearDrawingStrokes(sessionId?: string): Promise<void> {
    if (sessionId) {
      // Clear only strokes for this session
      const idsToDelete: number[] = [];
      this.drawingStrokes.forEach((stroke, id) => {
        if (stroke.sessionId === sessionId) {
          idsToDelete.push(id);
        }
      });
      idsToDelete.forEach(id => this.drawingStrokes.delete(id));
    } else {
      this.drawingStrokes.clear();
    }
  }
}

export const storage = new MemStorage();