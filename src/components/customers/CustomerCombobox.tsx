import { useState, useEffect } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  balance: number;
  is_active: boolean;
}

interface CustomerComboboxProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const WALK_IN_CUSTOMER = {
  id: "walk-in",
  name: "عميل عابر (Walk-in Customer)",
  phone: null,
  email: null,
  balance: 0,
  is_active: true,
};

export const CustomerCombobox = ({
  value,
  onValueChange,
  placeholder = "ابحث عن عميل...",
  disabled = false,
}: CustomerComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Infinite query with pagination
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["customers-search", debouncedSearch],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from("customers")
        .select("id, name, phone, email, balance")
        .order("name") as any;

      // Multi-field search
      if (debouncedSearch) {
        query = query.or(
          `name.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`
        );
      }

      const { data, error } = await query.range(
        pageParam * 50,
        (pageParam + 1) * 50 - 1
      );

      if (error) throw error;
      return {
        data: (data || []) as any as Customer[],
        nextPage: pageParam + 1,
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.data.length === 50 ? lastPage.nextPage : undefined,
    initialPageParam: 0,
  });

  const customers = data?.pages.flatMap((page) => page.data) || [];
  const allCustomers = [WALK_IN_CUSTOMER, ...customers];

  const selectedCustomer = allCustomers.find((c) => c.id === value);

  // Handle scroll to load more
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom =
      e.currentTarget.scrollHeight - e.currentTarget.scrollTop ===
      e.currentTarget.clientHeight;
    if (bottom && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          {selectedCustomer ? (
            <span className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              {selectedCustomer.name}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="ابحث بالاسم، الهاتف، أو البريد..."
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandList onScroll={handleScroll} className="max-h-[300px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {allCustomers.length === 1 && searchTerm ? (
                  <CommandEmpty>لم يتم العثور على عملاء.</CommandEmpty>
                ) : (
                  <>
                    {/* Walk-in Customer */}
                    <CommandGroup heading="عملاء خاصون">
                      <CommandItem
                        value={WALK_IN_CUSTOMER.id}
                        onSelect={() => {
                          onValueChange(WALK_IN_CUSTOMER.id);
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === WALK_IN_CUSTOMER.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <User className="mr-2 h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col">
                          <span className="font-medium">{WALK_IN_CUSTOMER.name}</span>
                          <span className="text-xs text-muted-foreground">
                            للمبيعات السريعة بدون تسجيل العميل
                          </span>
                        </div>
                      </CommandItem>
                    </CommandGroup>

                    {/* Regular Customers */}
                    {customers.length > 0 && (
                      <CommandGroup heading="العملاء">
                        {customers.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={customer.id}
                            onSelect={() => {
                              onValueChange(customer.id);
                              setOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                value === customer.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col flex-1 min-w-0">
                              <span className="font-medium truncate">{customer.name}</span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {customer.phone && (
                                  <span className="truncate">{customer.phone}</span>
                                )}
                                {customer.phone && customer.email && (
                                  <span>•</span>
                                )}
                                {customer.email && (
                                  <span className="truncate">{customer.email}</span>
                                )}
                              </div>
                              {customer.balance > 0 && (
                                <span className="text-xs text-red-600 dark:text-red-400">
                                  رصيد: {customer.balance.toFixed(2)} ر.س
                                </span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}

                    {/* Load More */}
                    {hasNextPage && (
                      <CommandGroup>
                        <CommandItem
                          onSelect={() => fetchNextPage()}
                          disabled={isFetchingNextPage}
                          className="justify-center"
                        >
                          {isFetchingNextPage ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              جارٍ التحميل...
                            </>
                          ) : (
                            "تحميل المزيد..."
                          )}
                        </CommandItem>
                      </CommandGroup>
                    )}
                  </>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
