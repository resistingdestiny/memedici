"use client";

import { useInView } from "react-intersection-observer";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { type FeedItem } from "@/lib/types";

interface ProductTileProps {
  item: FeedItem;
}

export function ProductTile({ item }: ProductTileProps) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });
  
  return (
    <Card
      ref={ref}
      className="overflow-hidden group cursor-pointer"
    >
      <div className="relative aspect-square overflow-hidden">
        {inView && (
          <Image
            src={item.media}
            alt={item.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-medium mb-2 line-clamp-2">{item.title}</h3>
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold">${item.price}</p>
          <Button size="sm">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Buy Now
          </Button>
        </div>
      </div>
    </Card>
  );
}