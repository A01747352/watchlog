import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge necesita conocer la escala tipográfica propia (text-h1, text-body…);
 * si no, la confunde con colores y descarta clases al combinarlas.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "page", "rating", "h1", "h2", "h3", "body", "small", "caption"] }],
      shadow: [{ shadow: ["poster"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
