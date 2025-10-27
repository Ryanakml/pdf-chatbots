import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";

export default function ChatPage() {
  return (
    <div className="w-screen min-h-screen bg-linear-to-br from-purple-100 via-fuchsia-100 to-white flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-4xl sm:text-5xl font-extrabold bg-linear-to-r from-purple-600 via-fuchsia-500 to-purple-700 bg-clip-text text-transparent">
          Your Chats
        </h1>
        <SignedOut>
          <div className="space-y-3">
            <p className="text-gray-700">Please sign in to start chatting with your PDFs.</p>
            <SignInButton mode="modal">
              <button className="bg-linear-to-r from-purple-600 via-fuchsia-500 to-purple-700 text-white px-6 py-2 rounded-full shadow-md hover:shadow-lg transition-all duration-200">
                Sign In
              </button>
            </SignInButton>
          </div>
        </SignedOut>
        <SignedIn>
          <p className="text-gray-700">Chat interface coming soon.</p>
        </SignedIn>
      </div>
    </div>
  );
}
