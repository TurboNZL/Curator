"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { Check, ChevronDown, Plus, X } from "lucide-react";

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
import { Badge } from "./badge";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectSearchProps {
  options: Option[];
  selected: Option[];
  onSelectedChange: (selected: Option[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowCustom?: boolean; // New prop for custom creation
  onNewItem?: (newItemValue: string) => void; // Callback for new item creation
}

export const MultiSelectSearch: React.FC<MultiSelectSearchProps> = ({
  options,
  selected,
  onSelectedChange,
  placeholder,
  disabled,
  className,
  allowCustom = false,
  onNewItem,
}) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtered options based on input value, excluding already selected ones
  const filteredOptions = useMemo(() => {
    const selectedValues = new Set(selected.map((s) => s.value));
    return options.filter(
      (option) =>
        !selectedValues.has(option.value) &&
        option.label.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [options, selected, inputValue]);

  // Determine if a custom option can be added
  const canCreateCustom = useMemo(() => {
    if (!allowCustom || !inputValue.trim()) return false;
    const lowerInputValue = inputValue.toLowerCase();
    // Check if it already exists in options or selected
    return (
      !options.some((o) => o.label.toLowerCase() === lowerInputValue) &&
      !selected.some((s) => s.label.toLowerCase() === lowerInputValue)
    );
  }, [allowCustom, inputValue, options, selected]);

  const handleSelect = (option: Option) => {
    const newSelected = selected.some((s) => s.value === option.value)
      ? selected.filter((s) => s.value !== option.value)
      : [...selected, option];
    onSelectedChange(newSelected);
    setInputValue(""); // Clear input after selection
    if (inputRef.current) inputRef.current.focus();
  };

  const handleCreateNew = () => {
    if (!canCreateCustom || !inputValue.trim()) return;

    const newValue = inputValue.trim();
    const newOption: Option = { value: newValue, label: newValue };

    // Optimistically update UI
    onSelectedChange([...selected, newOption]);
    setInputValue(""); // Clear input after creation
    
    // Call the external handler for persistence
    if (onNewItem) {
        onNewItem(newValue);
    }
    setOpen(false); // Close popover after creating and selecting
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canCreateCustom && inputValue.trim()) {
        e.preventDefault(); // Prevent form submission if in a form
        handleCreateNew();
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-9 text-xs",
            className,
            disabled && "cursor-not-allowed opacity-70"
          )}
          disabled={disabled}
        >
          <div className="flex flex-wrap items-center gap-1">
            {selected.length > 0 ? (
              selected.map((item) => (
                <Badge
                  key={item.value}
                  variant="secondary"
                  className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700/80 cursor-pointer text-[10px] font-medium"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent popover from closing
                    onSelectedChange(selected.filter((s) => s.value !== item.value));
                  }}
                >
                  {item.label}
                  <X className="ml-1 h-3 w-3" />
                </Badge>
              ))
            ) : (
              <span className="text-zinc-500">{placeholder || "Select options..."}</span>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-zinc-900 border-zinc-800 text-white z-[60]" align="start">
        <Command className="bg-zinc-900">
          <CommandInput
            ref={inputRef}
            placeholder={placeholder || "Search options..."}
            value={inputValue}
            onValueChange={setInputValue}
            onKeyDown={handleKeyDown}
            className="h-9 bg-zinc-900 border-b border-zinc-800 text-white placeholder:text-zinc-500 focus:ring-0 focus:border-0"
          />
          <CommandList className="max-h-60">
            <CommandEmpty className="py-2 text-zinc-400 text-sm text-center">
                {allowCustom && inputValue.trim() ? (
                    <Button
                        variant="ghost"
                        onClick={handleCreateNew}
                        className="w-full text-left text-blue-400 hover:text-blue-300 gap-2 justify-start py-2 h-auto"
                    >
                        <Plus size={14} /> Create "{inputValue}"
                    </Button>
                ) : (
                    "No results found."
                )}
            </CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleSelect(option)}
                  className="flex items-center justify-between text-sm py-2 px-2 cursor-pointer aria-selected:bg-zinc-800 hover:bg-zinc-800 text-white"
                >
                  {option.label}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selected.some((s) => s.value === option.value)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};