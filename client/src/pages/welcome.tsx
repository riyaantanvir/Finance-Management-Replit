import { getAuthState } from "@/lib/auth";

export default function Welcome() {
  const authState = getAuthState();
  const username = authState.user?.username || "User";

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4" data-testid="welcome-title">
          Hello {username}, Welcome to tanzworld.
        </h1>
      </div>
    </div>
  );
}