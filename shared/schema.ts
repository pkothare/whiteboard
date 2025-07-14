import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  name: varchar("name"),
  avatar: varchar("avatar"),
  provider: varchar("provider"),
  providerId: varchar("provider_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWhiteboardUserSchema = createInsertSchema(whiteboardUsers).omit({
  id: true,
  lastSeen: true,
});

export const insertDrawingStrokeSchema = createInsertSchema(drawingStrokes).omit({
  id: true,
  timestamp: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type WhiteboardUser = typeof whiteboardUsers.$inferSelect;
export type InsertWhiteboardUser = z.infer<typeof insertWhiteboardUserSchema>;
export type DrawingStroke = typeof drawingStrokes.$inferSelect;
export type InsertDrawingStroke = z.infer<typeof insertDrawingStrokeSchema>;

// WebSocket message types
export interface WSMessage {
  type: 'user_joined' | 'user_left' | 'stroke_start' | 'stroke_move' | 'stroke_end' | 'cursor_move' | 'clear_canvas' | 'user_list' | 'user_info' | 'user_info_updated' | 'init';
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
