import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductImageProps {
  imageUrl?: string | null;
  productName: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: "w-10 h-10",
  md: "w-16 h-16",
  lg: "w-24 h-24",
};

const iconSizes = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-10 h-10",
};

export const ProductImage = ({
  imageUrl,
  productName,
  size = "md",
  className,
}: ProductImageProps) => {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={productName}
        className={cn(
          sizeClasses[size],
          "object-cover rounded-lg border border-border",
          className
        )}
        onError={(e) => {
          // Fallback to placeholder on error
          (e.target as HTMLImageElement).style.display = "none";
          (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        sizeClasses[size],
        "bg-muted rounded-lg flex items-center justify-center border border-border",
        className
      )}
    >
      <Package className={cn(iconSizes[size], "text-muted-foreground")} />
    </div>
  );
};
