import { Button } from "@/components/ui/button";
import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import FileUpload from "@/components/file-upload";

export default async function Home() {
  const { userId } = await auth();
  const isAuth = !!userId;

  return (
    <div className="w-screen min-h-screen bg-linear-to-br from-purple-100 via-fuchsia-100 to-white flex items-center justify-center">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="flex flex-col items-center text-center">
          {/* Header */}
          <div className="flex items-center">
            <h1 className="text-5xl mr-3 sm:text-6xl font-semibold bg-linear-to-r from-purple-600 via-fuchsia-500 to-purple-700 bg-clip-text text-transparent">
              xxx
            </h1>
            <UserButton afterSignOutUrl="/" />
          </div>

          {/* Subheading */}
          <p className="max-w-xl mt-2 text-lg text-slate-600">
            xxx
          </p>

          {/* CTA */}
          <div className="flex mt-4">
            {isAuth ? (
              <Link href="/chat">
                <Button>Go to Chat</Button>
              </Link>
            ) : (
              <Link href="/sign-in" rel="noopener noreferrer">
                <Button>xxx</Button>
              </Link>
            )}
          </div>

          {/* Upload Section */}
          <div className="mt-10 w-full max-w-md">
            <FileUpload />
          </div>
          </div>
        </div>
      </div>
  );
}