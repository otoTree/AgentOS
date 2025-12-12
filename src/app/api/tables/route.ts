import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/infra/prisma";
import { getAuthenticatedUser } from "@/lib/infra/auth-helper";

// GET /api/tables - List all tables
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tables = await prisma.tableDocument.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        updatedAt: true,
        createdAt: true,
        // Don't fetch content for list view to save bandwidth
      }
    });

    return NextResponse.json(tables);
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

    const table = await prisma.tableDocument.create({
      data: {
        name,
        content: content || {}, // Default to empty object if not provided
        userId: user.id
      }
    });

    return NextResponse.json(table);
  } catch (error: any) {
    console.error("Error creating table:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
