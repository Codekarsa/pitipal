import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, Edit2, Trash2, Tag, DollarSign, TrendingUp, TrendingDown, 
  ChevronDown, ChevronRight, Folder, FolderPlus, MoreHorizontal,
  Car, Utensils, ShoppingBag, Film, Receipt, Heart, GraduationCap,
  Briefcase, Building, PlusCircle
} from "lucide-react";

const categoryIcons = [
  { name: "tag", icon: Tag },
  { name: "folder", icon: Folder },
  { name: "car", icon: Car },
  { name: "utensils", icon: Utensils },
  { name: "shopping-bag", icon: ShoppingBag },
  { name: "film", icon: Film },
  { name: "receipt", icon: Receipt },
  { name: "heart", icon: Heart },
  { name: "graduation-cap", icon: GraduationCap },
  { name: "briefcase", icon: Briefcase },
  { name: "building", icon: Building },
  { name: "plus-circle", icon: PlusCircle },
  { name: "more-horizontal", icon: MoreHorizontal },
  { name: "trending-up", icon: TrendingUp },
  { name: "trending-down", icon: TrendingDown },
  { name: "dollar-sign", icon: DollarSign },
];

const categoryColors = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", 
  "#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e", "#10b981",
  "#64748b", "#6b7280", "#374151"
];

export function CategoriesSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("expense");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [selectedGroupForCategory, setSelectedGroupForCategory] = useState<string>("");

  // Form states
  const [groupForm, setGroupForm] = useState({
    name: "",
    description: "",
    color: categoryColors[0],
    icon: "folder",
    type: "expense" as "expense" | "income" | "investment"
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    color: categoryColors[0],
    icon: "tag",
    type: "expense" as "expense" | "income" | "investment",
    category_group_id: ""
  });

  // Fetch category groups
  const { data: categoryGroups = [] } = useQuery({
    queryKey: ["category-groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_groups")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select(`
          *,
          category_groups (
            id,
            name,
            color,
            icon
          )
        `)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Group mutation
  const groupMutation = useMutation({
    mutationFn: async (group: any) => {
      if (editingGroup) {
        const { error } = await supabase
          .from("category_groups")
          .update(group)
          .eq("id", editingGroup.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("category_groups")
          .insert({ ...group, user_id: user?.id, is_default: false });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-groups"] });
      setShowGroupDialog(false);
      resetGroupForm();
      toast({
        title: editingGroup ? "Group updated" : "Group created",
        description: `Category group has been ${editingGroup ? "updated" : "created"} successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${editingGroup ? "update" : "create"} category group.`,
        variant: "destructive",
      });
    },
  });

  // Category mutation  
  const categoryMutation = useMutation({
    mutationFn: async (category: any) => {
      console.log("Creating category with data:", category);
      console.log("User ID:", user?.id);
      console.log("Editing category:", editingCategory);
      
      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update(category)
          .eq("id", editingCategory.id);
        if (error) {
          console.error("Update error:", error);
          throw error;
        }
      } else {
        const categoryData = { ...category, user_id: user?.id, is_default: false };
        console.log("Final category data to insert:", categoryData);
        
        const { error } = await supabase
          .from("categories")
          .insert(categoryData);
        if (error) {
          console.error("Insert error:", error);
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setShowCategoryDialog(false);
      resetCategoryForm();
      toast({
        title: editingCategory ? "Category updated" : "Category created",
        description: `Category has been ${editingCategory ? "updated" : "created"} successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${editingCategory ? "update" : "create"} category.`,
        variant: "destructive",
      });
    },
  });

  // Delete mutations
  const deleteGroupMutation = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from("category_groups")
        .delete()
        .eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-groups"] });
      toast({ title: "Group deleted", description: "Category group has been deleted successfully." });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", categoryId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "Category deleted", description: "Category has been deleted successfully." });
    },
  });

  const resetGroupForm = () => {
    setGroupForm({ name: "", description: "", color: categoryColors[0], icon: "folder", type: "expense" });
    setEditingGroup(null);
  };

  const resetCategoryForm = () => {
    setCategoryForm({ name: "", color: categoryColors[0], icon: "tag", type: selectedTab as "expense" | "income" | "investment", category_group_id: "" });
    setEditingCategory(null);
  };

  const handleEditGroup = (group: any) => {
    setEditingGroup(group);
    setGroupForm({
      name: group.name,
      description: group.description || "",
      color: group.color,
      icon: group.icon,
      type: group.type
    });
    setShowGroupDialog(true);
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      color: category.color,
      icon: category.icon,
      type: category.type,
      category_group_id: category.category_group_id || ""
    });
    setShowCategoryDialog(true);
  };

  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const filteredGroups = categoryGroups.filter(group => group.type === selectedTab);
  const getGroupCategories = (groupId: string) => 
    categories.filter(cat => cat.category_group_id === groupId);

  const IconComponent = ({ iconName, className }: { iconName: string; className?: string }) => {
    const icon = categoryIcons.find(i => i.name === iconName);
    const Icon = icon?.icon || Tag;
    return <Icon className={className} />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Transaction Categories</h3>
          <p className="text-sm text-muted-foreground">
            Organize your transactions with custom category groups and categories
          </p>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="expense" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="income" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Income
          </TabsTrigger>
          <TabsTrigger value="investment" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Investments
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4 mt-6">
          <div className="flex gap-2">
            <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
              <DialogTrigger asChild>
                <Button onClick={resetGroupForm} className="flex items-center gap-2">
                  <FolderPlus className="h-4 w-4" />
                  Add Category Group
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingGroup ? "Edit Category Group" : "Add Category Group"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="groupName">Name</Label>
                    <Input
                      id="groupName"
                      value={groupForm.name}
                      onChange={(e) => setGroupForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Transportation, Food & Dining"
                    />
                  </div>
                  <div>
                    <Label htmlFor="groupDescription">Description</Label>
                    <Textarea
                      id="groupDescription"
                      value={groupForm.description}
                      onChange={(e) => setGroupForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of this category group"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Icon</Label>
                    <div className="grid grid-cols-6 gap-2 mt-2">
                      {categoryIcons.map((iconOption) => {
                        const Icon = iconOption.icon;
                        return (
                          <Button
                            key={iconOption.name}
                            type="button"
                            variant={groupForm.icon === iconOption.name ? "default" : "outline"}
                            size="sm"
                            className="h-10 w-10 p-0"
                            onClick={() => setGroupForm(prev => ({ ...prev, icon: iconOption.name }))}
                          >
                            <Icon className="h-4 w-4" />
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <Label>Color</Label>
                    <div className="grid grid-cols-7 gap-2 mt-2">
                      {categoryColors.map((color) => (
                        <Button
                          key={color}
                          type="button"
                          variant="outline"
                          size="sm"
                          className={`h-8 w-8 p-0 border-2 ${
                            groupForm.color === color ? "border-primary" : "border-muted"
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setGroupForm(prev => ({ ...prev, color }))}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => {
                        groupMutation.mutate({
                          ...groupForm,
                          type: selectedTab
                        });
                      }}
                      disabled={!groupForm.name || groupMutation.isPending}
                      className="flex-1"
                    >
                      {editingGroup ? "Update Group" : "Create Group"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowGroupDialog(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={resetCategoryForm} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? "Edit Category" : "Add Category"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="categoryGroup">Category Group</Label>
                    <Select
                      value={categoryForm.category_group_id}
                      onValueChange={(value) => setCategoryForm(prev => ({ ...prev, category_group_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category group" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            <div className="flex items-center gap-2">
                              <IconComponent iconName={group.icon} className="h-4 w-4" />
                              {group.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="categoryName">Category Name</Label>
                    <Input
                      id="categoryName"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Gasoline, Groceries, Coffee"
                    />
                  </div>
                  <div>
                    <Label>Icon</Label>
                    <div className="grid grid-cols-6 gap-2 mt-2">
                      {categoryIcons.map((iconOption) => {
                        const Icon = iconOption.icon;
                        return (
                          <Button
                            key={iconOption.name}
                            type="button"
                            variant={categoryForm.icon === iconOption.name ? "default" : "outline"}
                            size="sm"
                            className="h-10 w-10 p-0"
                            onClick={() => setCategoryForm(prev => ({ ...prev, icon: iconOption.name }))}
                          >
                            <Icon className="h-4 w-4" />
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <Label>Color</Label>
                    <div className="grid grid-cols-7 gap-2 mt-2">
                      {categoryColors.map((color) => (
                        <Button
                          key={color}
                          type="button"
                          variant="outline"
                          size="sm"
                          className={`h-8 w-8 p-0 border-2 ${
                            categoryForm.color === color ? "border-primary" : "border-muted"
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setCategoryForm(prev => ({ ...prev, color }))}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button
                      onClick={() => {
                        console.log("Button clicked!");
                        console.log("Category form state:", categoryForm);
                        console.log("Selected tab:", selectedTab);
                        console.log("Category form category_group_id:", categoryForm.category_group_id);
                        console.log("Category form name:", categoryForm.name);
                        
                        const formData = {
                          ...categoryForm,
                          type: selectedTab
                        };
                        console.log("Final form data being sent:", formData);
                        
                        categoryMutation.mutate(formData);
                      }}
                      disabled={!categoryForm.name || !categoryForm.category_group_id || categoryMutation.isPending}
                      className="flex-1"
                    >
                      {editingCategory ? "Update Category" : "Create Category"}
                    </Button>
                    <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {filteredGroups.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No category groups found</p>
                <p className="text-sm">Create your first category group to get started</p>
              </div>
            ) : (
              filteredGroups.map((group) => {
                const groupCategories = getGroupCategories(group.id);
                const isExpanded = expandedGroups.has(group.id);
                
                return (
                  <Collapsible key={group.id} open={isExpanded} onOpenChange={() => toggleGroupExpansion(group.id)}>
                    <div className="border border-border rounded-lg">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-center justify-between p-4 hover:bg-muted/50 cursor-pointer">
                          <div className="flex items-center gap-3">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            <div
                              className="w-10 h-10 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: group.color }}
                            >
                              <IconComponent iconName={group.icon} className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h4 className="font-medium">{group.name}</h4>
                              {group.description && (
                                <p className="text-sm text-muted-foreground">{group.description}</p>
                              )}
                              <Badge variant="secondary" className="text-xs mt-1">
                                {groupCategories.length} categories
                              </Badge>
                            </div>
                          </div>
                          
                          {!group.is_default && (
                            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditGroup(group)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteGroupMutation.mutate(group.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="border-t border-border p-4 bg-muted/25">
                          {groupCategories.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <Tag className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No categories in this group</p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => {
                                  setSelectedGroupForCategory(group.id);
                                  setCategoryForm(prev => ({ ...prev, category_group_id: group.id, type: selectedTab as "expense" | "income" }));
                                  setShowCategoryDialog(true);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Category
                              </Button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {groupCategories.map((category) => (
                                <div key={category.id} className="flex items-center justify-between p-3 bg-background rounded-lg border border-border">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className="w-8 h-8 rounded-md flex items-center justify-center"
                                      style={{ backgroundColor: category.color }}
                                    >
                                      <IconComponent iconName={category.icon} className="h-4 w-4 text-white" />
                                    </div>
                                    <span className="text-sm font-medium">{category.name}</span>
                                  </div>
                                  
                                  {!category.is_default && (
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditCategory(category)}
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteCategoryMutation.mutate(category.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              ))}
                              
                              <Button
                                variant="outline"
                                className="p-3 h-auto flex-col gap-2 border-dashed"
                                onClick={() => {
                                  setSelectedGroupForCategory(group.id);
                                  setCategoryForm(prev => ({ ...prev, category_group_id: group.id, type: selectedTab as "expense" | "income" }));
                                  setShowCategoryDialog(true);
                                }}
                              >
                                <Plus className="h-4 w-4" />
                                <span className="text-xs">Add Category</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );

}