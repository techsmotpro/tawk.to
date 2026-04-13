import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const { otp } = await req.json();
  const cookieStore = await cookies();
  const saved = cookieStore.get("pending_otp")?.value;

  if (!otp || otp !== saved) {
    return NextResponse.json({ success: false, error: "Invalid OTP" }, { status: 401 });
  }

  cookieStore.set("dash_session", "true", {
    httpOnly: true,
    maxAge: 86400, // 24 hours
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });

  cookieStore.delete("pending_otp");

  return NextResponse.json({ success: true });
}