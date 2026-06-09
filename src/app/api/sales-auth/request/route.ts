import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sendSalesOtpEmail } from "@/lib/email";

export async function POST() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const cookieStore = await cookies();
  cookieStore.set("sales_pending_otp", otp, {
    httpOnly: true,
    maxAge: 600, // 10 minutes
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });

  await sendSalesOtpEmail(otp);

  return NextResponse.json({ success: true });
}
