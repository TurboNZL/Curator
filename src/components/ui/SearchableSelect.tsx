"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus, Search as SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  contentClassName?: string;
  itemClassName?: string;
  disabled?: boolean;
  allowCustom?: boolean;
  onNewItem?: (newItemName: string) => void;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onValueChange,
  placeholder = "Select an option...",
  className,
  contentClassName,
  itemClassName,
  disabled = false,
  allowCustom = false,
  onNewItem,
}) => {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const selectedOption = React.useMemo(() => {
    return options.find((option) => option.value === value);
  }, [options, value]);

  const handleSelect = (currentValue: string) => {
    onValueChange(currentValue === value ? "" : currentValue);
    setOpen(false);
    setInputValue("");
  };

  const handleCreateCustom = () => {
    if (allowCustom && inputValue.trim()) {
      onValueChange(inputValue.trim());
      onNewItem?.(inputValue.trim());
      setOpen(false);
      setInputValue("");
    }
  };

  const filteredOptions = React.useMemo(() => {
    const searchLower = inputValue.toLowerCase();
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchLower)
    );
  }, [options, inputValue]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-9 text-sm text-white border-zinc-800 bg-zinc-900 focus-visible:ring-blue-500",
            disabled && "cursor-not-allowed opacity-50 bg-zinc-900/50",
            className
          )}
          disabled={disabled}
        >
          {selectedOption ? (
            selectedOption.label
          ) : (
            <span className="text-zinc-500">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-full p-0 bg-zinc-950 border-zinc-800", contentClassName)}
        align="start"
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <Command className="bg-zinc-950 text-white">
          <div className="relative flex items-center border-b border-zinc-800">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search or select..."
              className="pl-9 h-10 w-full bg-zinc-950 border-none focus-visible:ring-0 text-white"
            />
          </div>
          <CommandList>
            <CommandGroup>
              {filteredOptions.length === 0 && inputValue.trim() && allowCustom && (
                <CommandItem onSelect={handleCreateCustom} className={cn("text-blue-500 cursor-pointer", itemClassName)}>
                  <Plus className="mr-2 h-4 w-4" /> Create "{inputValue.trim()}"
                </CommandItem>
              )}
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => handleSelect(option.value)}
                  className={cn("flex items-center text-white hover:bg-zinc-800 cursor-pointer", itemClassName)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
              {filteredOptions.length === 0 && (!inputValue.trim() || !allowCustom) && (
                <CommandEmpty className="py-6 text-center text-sm text-zinc-500">
                  No results found.
                </CommandEmpty>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};