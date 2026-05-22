"use client";

import * as React from "react";
import { X, Plus, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface MultiSelectSearchOption {
  value: string;
  label: string;
  // Optional: Add other properties if needed for rendering or logic
}

interface MultiSelectSearchProps {
  options: MultiSelectSearchOption[];
  selected: MultiSelectSearchOption[];
  onSelectedChange: (selected: MultiSelectSearchOption[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowCustom?: boolean; // New prop for allowing custom input
  onNewItem?: (newItemName: string) => void; // Callback for new custom item
}

export const MultiSelectSearch: React.FC<MultiSelectSearchProps> = ({
  options,
  selected,
  onSelectedChange,
  placeholder,
  className,
  disabled = false,
  allowCustom = false,
  onNewItem,
}) => {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState("");

  const handleSelect = (option: MultiSelectSearchOption) => {
    const isSelected = selected.some((item) => item.value === option.value);
    if (isSelected) {
      onSelectedChange(selected.filter((item) => item.value !== option.value));
    } else {
      onSelectedChange([...selected, option]);
    }
    setInputValue(""); // Clear input after selection
  };

  const handleRemove = (value: string) => {
    onSelectedChange(selected.filter((item) => item.value !== value));
  };

  const handleCreateCustom = () => {
    if (allowCustom && inputValue.trim()) {
      const newOption: MultiSelectSearchOption = {
        value: inputValue.trim(),
        label: inputValue.trim(),
      };
      if (!selected.some(item => item.value === newOption.value)) {
        onSelectedChange([...selected, newOption]);
        onNewItem?.(newOption.value); // Call optional callback for new item
      }
      setInputValue("");
    }
  };

  const filteredOptions = React.useMemo(() => {
    const searchLower = inputValue.toLowerCase();
    const currentSelectedValues = new Set(selected.map((s) => s.value));

    return options.filter(
      (option) =>
        !currentSelectedValues.has(option.value) &&
        option.label.toLowerCase().includes(searchLower)
    );
  }, [options, selected, inputValue]);

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
          <div className="flex flex-wrap gap-1">
            {selected.length === 0 ? (
              <span className="text-zinc-500">{placeholder}</span>
            ) : (
              selected.map((item) => (
                <Badge
                  key={item.value}
                  variant="secondary"
                  className="bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
                >
                  {item.label}
                  <X
                    className="ml-1 h-3 w-3 cursor-pointer text-zinc-500 hover:text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(item.value);
                    }}
                  />
                </Badge>
              ))
            )}
          </div>
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-full p-0 bg-zinc-950 border-zinc-800"
        align="start"
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <Command className="bg-zinc-950 text-white">
          <div className="relative flex items-center border-b border-zinc-800">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search or add item..."
              className="pl-9 h-10 w-full bg-zinc-950 border-none focus-visible:ring-0 text-white"
            />
          </div>
          <CommandList>
            <CommandGroup>
              {filteredOptions.length === 0 && inputValue.trim() && allowCustom && (
                <CommandItem onSelect={handleCreateCustom} className="text-blue-500 cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" /> Create "{inputValue.trim()}"
                </CommandItem>
              )}
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => handleSelect(option)}
                  className="text-white hover:bg-zinc-800 cursor-pointer"
                >
                  {option.label}
                </CommandItem>
              ))}
              {filteredOptions.length === 0 && (!inputValue.trim() || !allowCustom) && (
                <CommandItem disabled className="text-zinc-500">
                  No results found.
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};