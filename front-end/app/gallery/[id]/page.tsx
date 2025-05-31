import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import { galleryData } from "@/lib/stubs";

export async function generateStaticParams() {
  return Object.keys(galleryData).map((id) => ({
    id,
  }));
}

export default function GalleryPage({ params }: { params: { id: string } }) {
  const gallery = galleryData[params.id]?.[0];

  if (!gallery) {
    return (
      <div className="min-h-screen pt-16 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Gallery Not Found</h2>
          <Button asChild>
            <Link href="/marketplace">Return to Marketplace</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16">
      <div className="container max-w-6xl py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" asChild>
            <Link href="/marketplace">
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{gallery.name}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {gallery.artworks.map((artwork) => (
            <Card key={artwork.id} className="overflow-hidden group">
              <div className="relative aspect-square">
                <Image
                  src={artwork.image}
                  alt={artwork.title}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <h3 className="text-lg font-medium">{artwork.title}</h3>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}