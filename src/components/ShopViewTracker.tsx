"use client";

import { useEffect } from "react";
import { markRecentlyViewed } from "@/components/FavoriteButton";

type Props = {
  placeId: string;
  name: string;
};

export default function ShopViewTracker({ placeId, name }: Props) {
  useEffect(() => {
    markRecentlyViewed(placeId, name);
  }, [name, placeId]);

  return null;
}
