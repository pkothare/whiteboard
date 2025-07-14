import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const whiteboardUsers = pgTable("whiteboard_users", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  isActive: boolean("is_active").default(true),
  lastSeen: timestamp("last_seen").defaultNow(),
  cursorX: integer("cursor_x").default(0),
  cursorY: integer("cursor_y").default(0),
});

export const drawingStrokes = pgTable("drawing_strokes", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: text("user_id").notNull(),
  strokeData: jsonb("stroke_data").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertWhiteboardUserSchema = createInsertSchema(whiteboardUsers).omit({
  id: true,
  lastSeen: true,
});

export const insertDrawingStrokeSchema = createInsertSchema(drawingStrokes).omit({
  id: true,
  timestamp: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type WhiteboardUser = typeof whiteboardUsers.$inferSelect;
export type InsertWhiteboardUser = z.infer<typeof insertWhiteboardUserSchema>;
export type DrawingStroke = typeof drawingStrokes.$inferSelect;
export type InsertDrawingStroke = z.infer<typeof insertDrawingStrokeSchema>;

// WebSocket message types
export interface WSMessage {
  type: 'user_joined' | 'user_left' | 'stroke_start' | 'stroke_move' | 'stroke_end' | 'cursor_move' | 'clear_canvas' | 'user_list';
  data: any;
  userId?: string;
  timestamp?: number;
}

export interface StrokeData {
  x: number;
  y: number;
  tool: 'pen' | 'eraser';
  color: string;
  size: number;
  pressure?: number;
}

export interface CursorData {
  x: number;
  y: number;
  userId: string;
  userName: string;
  color: string;
}
