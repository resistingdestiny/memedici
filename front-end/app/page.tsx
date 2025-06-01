"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/explore');
  }, [router]);

  // Return null or a loading state while redirecting
  return null;
}