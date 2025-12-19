import { NextRequest, NextResponse } from "next/server";
import { tableRepository } from "@/lib/repositories/table-repository";
import { getAuthenticatedUser } from "@/lib/infra/auth-helper";

// GET /api/tables - List all tables
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tables = await tableRepository.findByUserId(user.id);
    
    // Select specific fields if needed, but repository returns full objects
    // We can map to reduce payload if content is large
    const mappedTables = tables.map(t => ({
        id: t.id,
        name: t.name,
        updatedAt: t.updatedAt,
        createdAt: t.createdAt
    }));

    return NextResponse.json(mappedTables);
  } catch (error: any) {
    console.error("Error fetching tables:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/tables - Create a new table
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, content } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const table = await tableRepository.create({
        name,
        content: content || {},
        userId: user.id
    });

    return NextResponse.json(table);
  } catch (error: any) {
    console.error("Error creating table:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
