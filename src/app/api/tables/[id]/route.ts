import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/infra/prisma";
import { getAuthenticatedUser } from "@/lib/infra/auth-helper";

// GET /api/tables/[id] - Get a specific table
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const table = await prisma.tableDocument.findUnique({
      where: {
        id: params.id,
        userId: user.id // Ensure user owns the table
      }
    });

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    return NextResponse.json(table);
  } catch (error: any) {
    console.error("Error fetching table:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH /api/tables/[id] - Update a table
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, content } = body;

    const table = await prisma.tableDocument.findUnique({
      where: {
        id: params.id,
        userId: user.id
      }
    });

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const updatedTable = await prisma.tableDocument.update({
      where: { id: params.id },
      data: {
        name: name || undefined,
        content: content || undefined,
      }
    });

    return NextResponse.json(updatedTable);
  } catch (error: any) {
    console.error("Error updating table:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/tables/[id] - Delete a table
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const table = await prisma.tableDocument.findUnique({
      where: {
        id: params.id,
        userId: user.id
      }
    });

    if (!table) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    await prisma.tableDocument.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting table:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
