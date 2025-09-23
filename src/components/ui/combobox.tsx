import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ComboboxOption {
  value: string
  label: string
  group?: string
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  allowCreate?: boolean
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No options found.",
  className,
  allowCreate = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  // Group options by group
  const groupedOptions = React.useMemo(() => {
    const groups: { [key: string]: ComboboxOption[] } = {}
    const ungrouped: ComboboxOption[] = []

    options.forEach((option) => {
      if (option.group) {
        if (!groups[option.group]) {
          groups[option.group] = []
        }
        groups[option.group].push(option)
      } else {
        ungrouped.push(option)
      }
    })

    return { groups, ungrouped }
  }, [options])

  const selectedOption = options.find((option) => option.value === value)
  
  // Check if search value exactly matches an existing option
  const exactMatch = options.some(option => 
    option.value.toLowerCase() === searchValue.toLowerCase()
  )
  
  const shouldShowCreate = allowCreate && searchValue.trim() && !exactMatch

  const handleCreate = () => {
    const newValue = searchValue.trim()
    console.log('Creating new payee:', newValue)
    onValueChange(newValue)
    setOpen(false)
    setSearchValue("")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {selectedOption ? selectedOption.label : (value || placeholder)}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder={searchPlaceholder} 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            
            {groupedOptions.ungrouped.length > 0 && (
              <CommandGroup>
                {groupedOptions.ungrouped.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={(currentValue) => {
                      onValueChange(currentValue === value ? "" : currentValue)
                      setOpen(false)
                      setSearchValue("")
                    }}
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
              </CommandGroup>
            )}

            {Object.entries(groupedOptions.groups)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([groupName, groupOptions]) => (
                <CommandGroup key={groupName} heading={groupName}>
                  {groupOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={(currentValue) => {
                        onValueChange(currentValue === value ? "" : currentValue)
                        setOpen(false)
                        setSearchValue("")
                      }}
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
                </CommandGroup>
              ))}
              
            {shouldShowCreate && (
              <CommandGroup>
                <div
                  className="px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-md text-primary flex items-center"
                  onClick={handleCreate}
                >
                  <span className="mr-2">+</span>
                  Create "{searchValue.trim()}"
                </div>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}