import { NextResponse } from "next/server";
import { userRepository } from "@/lib/repositories/auth-repository";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = registerSchema.parse(body);

    const existingUser = await userRepository.findByEmail(email);

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userRepository.create({
      email,
      password: hashedPassword,
      credits: 100,
      storageLimit: 1073741824,
    });

    return NextResponse.json({
      user: {
        email: user.email,
        id: user.id,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
