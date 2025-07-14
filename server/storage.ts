import { users, whiteboardUsers, drawingStrokes, type User, type InsertUser, type WhiteboardUser, type InsertWhiteboardUser, type DrawingStroke, type InsertDrawingStroke } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Whiteboard user methods
  getWhiteboardUser(sessionId: string): Promise<WhiteboardUser | undefined>;
  createWhiteboardUser(user: InsertWhiteboardUser): Promise<WhiteboardUser>;
  updateWhiteboardUser(sessionId: string, updates: Partial<WhiteboardUser>): Promise<WhiteboardUser | undefined>;
  removeWhiteboardUser(sessionId: string): Promise<void>;
  getActiveWhiteboardUsers(): Promise<WhiteboardUser[]>;
  
  // Drawing stroke methods
  saveDrawingStroke(stroke: InsertDrawingStroke): Promise<DrawingStroke>;
  getDrawingStrokes(): Promise<DrawingStroke[]>;
  clearDrawingStrokes(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private whiteboardUsers: Map<string, WhiteboardUser>;
  private drawingStrokes: Map<number, DrawingStroke>;
  private currentUserId: number;
  private currentWhiteboardUserId: number;
  private currentStrokeId: number;

  constructor() {
    this.users = new Map();
    this.whiteboardUsers = new Map();
    this.drawingStrokes = new Map();
    this.currentUserId = 1;
    this.currentWhiteboardUserId = 1;
    this.currentStrokeId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
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

  async getActiveWhiteboardUsers(): Promise<WhiteboardUser[]> {
    return Array.from(this.whiteboardUsers.values()).filter(user => user.isActive);
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

  async getDrawingStrokes(): Promise<DrawingStroke[]> {
    return Array.from(this.drawingStrokes.values());
  }

  async clearDrawingStrokes(): Promise<void> {
    this.drawingStrokes.clear();
  }
}

export const storage = new MemStorage();
