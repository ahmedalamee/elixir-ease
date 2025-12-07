import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  barcode?: string;
  sku?: string;
  price: number;
  quantity: number;
  image_url?: string;
  base_uom_id?: string;
  allow_discount?: boolean;
  max_discount_percentage?: number;
  default_discount_percentage?: number;
}

interface UseBarcodeScanner {
  searchByBarcode: (code: string) => Promise<Product | null>;
  handleScanResult: (
    code: string,
    onProductFound: (product: Product) => void,
    onProductNotFound?: (code: string) => void
  ) => Promise<void>;
}

export const useBarcodeScanner = (): UseBarcodeScanner => {
  const searchByBarcode = useCallback(async (code: string): Promise<Product | null> => {
    try {
      // Search by barcode or SKU
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .or(`barcode.eq.${code},sku.eq.${code}`)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error searching by barcode:", error);
      return null;
    }
  }, []);

  const handleScanResult = useCallback(
    async (
      code: string,
      onProductFound: (product: Product) => void,
      onProductNotFound?: (code: string) => void
    ) => {
      const product = await searchByBarcode(code);

      if (product) {
        onProductFound(product);
        toast.success(`تم العثور على: ${product.name}`);
      } else {
        if (onProductNotFound) {
          onProductNotFound(code);
        } else {
          toast.error(`لم يتم العثور على منتج بالباركود: ${code}`);
        }
      }
    },
    [searchByBarcode]
  );

  return {
    searchByBarcode,
    handleScanResult,
  };
};
