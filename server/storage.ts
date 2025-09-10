import { problems, votes, entrepreneurs, type Problem, type InsertProblem, type Vote, type InsertVote, type Entrepreneur, type InsertEntrepreneur, type User, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, ilike, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User methods (keeping for compatibility)
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Problem methods
  createProblem(problem: InsertProblem): Promise<Problem>;
  getProblems(filters: {
    category?: string;
    source?: string;
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<Problem[]>;
  getProblemsForClustering(): Promise<Array<{ id: string; summary: string; keywords: string[] }>>;
  
  // Vote methods
  createVote(vote: InsertVote): Promise<Vote>;
  
  // Entrepreneur methods
  createEntrepreneur(entrepreneur: InsertEntrepreneur): Promise<Entrepreneur>;
  getEntrepreneurs(filters: {
    expertise?: string;
    search?: string;
  }): Promise<Entrepreneur[]>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return undefined; // Not implemented for this app
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    throw new Error("User creation not implemented for this app");
  }

  // Problem methods
  async createProblem(problem: InsertProblem): Promise<Problem> {
    const [createdProblem] = await db
      .insert(problems)
      .values(problem)
      .returning();
    return createdProblem;
  }

  async getProblems(filters: {
    category?: string;
    source?: string;
    search?: string;
    sortBy?: string;
    order?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }): Promise<Problem[]> {
    let query = db.select().from(problems);
    
    const conditions = [];
    
    if (filters.category) {
      conditions.push(eq(problems.category, filters.category));
    }
    
    if (filters.source) {
      conditions.push(eq(problems.source, filters.source));
    }
    
    if (filters.search) {
      conditions.push(
        sql`${problems.summary} ILIKE ${`%${filters.search}%`} OR ${problems.originalText} ILIKE ${`%${filters.search}%`}`
      );
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    // Sorting
    const sortBy = filters.sortBy || 'createdAt';
    const order = filters.order || 'desc';
    
    if (sortBy === 'score') {
      query = order === 'desc' ? query.orderBy(desc(problems.score)) : query.orderBy(asc(problems.score));
    } else {
      query = order === 'desc' ? query.orderBy(desc(problems.createdAt)) : query.orderBy(asc(problems.createdAt));
    }
    
    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    
    query = query.limit(limit).offset(offset);
    
    const result = await query;
    return result;
  }

  async getProblemsForClustering(): Promise<Array<{ id: string; summary: string; keywords: string[] }>> {
    const results = await db
      .select({
        id: problems.id,
        summary: problems.summary,
        keywords: problems.keywords,
      })
      .from(problems)
      .where(and(eq(problems.processed, true), sql`${problems.summary} IS NOT NULL`))
      .limit(100);
    
    return results.map(p => ({
      id: p.id,
      summary: p.summary || '',
      keywords: p.keywords || []
    }));
  }

  // Vote methods
  async createVote(vote: InsertVote): Promise<Vote> {
    const [createdVote] = await db
      .insert(votes)
      .values(vote)
      .returning();
    return createdVote;
  }

  // Entrepreneur methods
  async createEntrepreneur(entrepreneur: InsertEntrepreneur): Promise<Entrepreneur> {
    const [createdEntrepreneur] = await db
      .insert(entrepreneurs)
      .values(entrepreneur)
      .returning();
    return createdEntrepreneur;
  }

  async getEntrepreneurs(filters: {
    expertise?: string;
    search?: string;
  }): Promise<Entrepreneur[]> {
    let query = db.select().from(entrepreneurs);
    
    const conditions = [];
    
    if (filters.expertise) {
      conditions.push(sql`${filters.expertise} = ANY(${entrepreneurs.expertise})`);
    }
    
    if (filters.search) {
      conditions.push(
        sql`${entrepreneurs.name} ILIKE ${`%${filters.search}%`} OR ${entrepreneurs.organization} ILIKE ${`%${filters.search}%`} OR ${entrepreneurs.description} ILIKE ${`%${filters.search}%`}`
      );
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const result = await query.orderBy(asc(entrepreneurs.name));
    return result;
  }
}

export const storage = new DatabaseStorage();
