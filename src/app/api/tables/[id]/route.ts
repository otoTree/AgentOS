import { NextRequest, NextResponse } from "next/server";
import { tableRepository } from "@/lib/repositories/table-repository";
import { getAuthenticatedUser } from "@/lib/infra/auth-helper";

// GET /api/tables/[id] - Get a specific table
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const table = await tableRepository.findById(params.id);

    if (!table || table.userId !== user.id) {
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

    const table = await tableRepository.findById(params.id);

    if (!table || table.userId !== user.id) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const updatedTable = await tableRepository.update(params.id, {
        name: name || undefined,
        content: content || undefined,
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

    const table = await tableRepository.findById(params.id);

    if (!table || table.userId !== user.id) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    await tableRepository.delete(params.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting table:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
