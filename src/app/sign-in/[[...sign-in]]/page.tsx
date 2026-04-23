import { SignIn } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      <SignIn appearance={{ baseTheme: dark }} />
    </div>
  );
}
