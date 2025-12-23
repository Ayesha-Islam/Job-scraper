import { createUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import z from "zod";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, name } = body;

        if (!email || !password || !name) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        const emailSchema = z.string().email("Invalid email address");
        if (!emailSchema.safeParse(email).success) {
            return NextResponse.json(
                { error: "Invalid email address" },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: "Password must be at least 6 characters" },
                { status: 400 }
            );
        }

        const user = await createUser(email, password, name);

        return NextResponse.json(
            {
                success: true,
                message: "User created successfully",
                user
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Registration error:", error);

        if (error instanceof Error && error.message === "User already exists") {
            return NextResponse.json(
                { error: "User already exists" },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    }
}