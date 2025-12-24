import Link from 'next/link';

export default function Header() {
  return (
    <header className="border-b bg-transparent">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-green-600">
          JobScraper
        </Link>

        <nav className="flex gap-6">
          <Link href="/jobs" className="text-gray-600 hover:text-black px-4 py-2">Find Jobs</Link>
          <Link href="/login" className="text-gray-600 hover:text-black px-4 py-2">Login</Link>
          <Link href="/register" className="bg-green-600 text-white px-4 py-2 rounded-md">
            Sign Up
          </Link>
        </nav>
      </div>
    </header>
  );
}   