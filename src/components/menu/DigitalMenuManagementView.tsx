'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { store } from '@/lib/store';
import { Category, Ingredient, MenuItem } from '@/lib/types';
import { Utensils, Plus, ToggleLeft, ToggleRight, Trash2, Edit3, X, Calculator, FolderPlus, Tag, Settings2, ShieldCheck, Search } from 'lucide-react';

interface DigitalMenuManagementViewProps {
  userRole?: string;
}

interface SearchableIngredientSelectProps {
  ingredients: Ingredient[];
  selectedId: number;
  onSelect: (id: number) => void;
}

// Module-Level Cache Memory for 0ms instant tab loading
let menuCacheMemory: MenuItem[] | null = null;
let categoryCacheMemory: Category[] | null = null;
let ingredientCacheMemory: Ingredient[] | null = null;

function SearchableIngredientSelect({ ingredients, selectedId, onSelect }: SearchableIngredientSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedIng = useMemo(
    () => ingredients.find((i) => i.id === selectedId) || ingredients[0],
    [ingredients, selectedId]
  );

  const filtered = useMemo(
    () =>
      ingredients.filter(
        (item) =>
          item.name.toLowerCase().includes(search.toLowerCase().trim()) ||
          item.unit.toLowerCase().includes(search.toLowerCase().trim())
      ),
    [ingredients, search]
  );

  return (
    <div className="flex-1 flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-xl px-3 py-2 text-xs text-slate-100 font-semibold transition cursor-pointer"
      >
        <span className="truncate">
          {selectedIng ? `${selectedIng.name} (${selectedIng.costPerUnit.toFixed(2)} ETB / ${selectedIng.unit})` : 'Select Ingredient'}
        </span>
        <Search className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1" />
      </button>

      {isOpen && (
        <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-2.5 space-y-2 shadow-inner">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search 100+ ingredients (e.g. Beef, Oil)..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-amber-500 font-medium"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <div className="p-2 text-center text-xs text-slate-500 italic">No ingredient matches &quot;{search}&quot;</div>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect(item.id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex justify-between items-center transition cursor-pointer ${
                    item.id === selectedId
                      ? 'bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30'
                      : 'text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <span className="font-medium">{item.name}</span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {item.costPerUnit.toFixed(2)} ETB / {item.unit}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function DigitalMenuManagementView({ userRole }: DigitalMenuManagementViewProps) {
  const canEdit = userRole === 'Admin' || userRole === 'Manager' || !userRole;

  // Initialize state directly from module-level cache memory for 0ms instant load
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => menuCacheMemory || store.getMenuItems());
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => ingredientCacheMemory || store.getIngredients());
  const [categories, setCategories] = useState<Category[]>(() => categoryCacheMemory || store.getCategories());

  // Modals state
  const [showAddDishModal, setShowAddDishModal] = useState<boolean>(false);
  const [showAddCatModal, setShowAddCatModal] = useState<boolean>(false);
  const [showManageCatModal, setShowManageCatModal] = useState<boolean>(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Edit Category State
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editCategoryName, setEditCategoryName] = useState<string>('');

  // New Category State
  const [newCatName, setNewCatName] = useState<string>('');

  // Dish Form State (used for both Add and Edit)
  const [editingDish, setEditingDish] = useState<MenuItem | null>(null);
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('Traditional Dishes');
  const [price, setPrice] = useState<string>('');
  const [recipeInputs, setRecipeInputs] = useState<{ ingredientId: number; quantityRequired: number }[]>([]);

  useEffect(() => {
    const updateData = () => {
      const items = store.getMenuItems();
      const ings = store.getIngredients();
      const loadedCats = store.getCategories();

      menuCacheMemory = items;
      ingredientCacheMemory = ings;
      categoryCacheMemory = loadedCats;

      setMenuItems(items);
      setIngredients(ings);
      setCategories(loadedCats);

      if (loadedCats.length > 0 && !category) {
        setCategory(loadedCats[0].name);
      }
    };

    updateData();
    const unsubscribe = store.subscribe(updateData);
    return () => unsubscribe();
  }, [category]);

  const handleToggleActive = (id: number) => {
    if (!canEdit) return;
    // Optimistic mutation
    setMenuItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isActive: !item.isActive } : item))
    );
    store.toggleMenuItemActive(id);
  };

  // --- CATEGORY CRUD HANDLERS ---
  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !newCatName.trim()) return;
    store.addCategory(newCatName.trim());
    setCategory(newCatName.trim());
    setNewCatName('');
    setShowAddCatModal(false);
  };

  const handleOpenEditCategory = (cat: Category) => {
    if (!canEdit) return;
    setEditingCategory(cat);
    setEditCategoryName(cat.name);
  };

  const handleUpdateCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !editingCategory || !editCategoryName.trim()) return;
    store.updateCategory(editingCategory.id, editCategoryName.trim());
    setEditingCategory(null);
  };

  const handleDeleteCategory = (cat: Category) => {
    if (!canEdit) return;
    if (!confirm(`Are you sure you want to delete category "${cat.name}"?`)) return;
    // Optimistic mutation
    setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    store.deleteCategory(cat.id);
  };

  // --- DISH CRUD HANDLERS ---
  const handleOpenAddDish = () => {
    if (!canEdit) return;
    setEditingDish(null);
    setName('');
    if (categories.length > 0) setCategory(categories[0].name);
    setPrice('');
    setRecipeInputs([]);
    setShowAddDishModal(true);
  };

  const handleOpenEditDish = (item: MenuItem) => {
    if (!canEdit) return;
    setEditingDish(item);
    setName(item.name);
    setCategory(item.category);
    setPrice(item.price.toString());
    setRecipeInputs(
      item.recipes ? item.recipes.map((r) => ({ ingredientId: r.ingredientId, quantityRequired: r.quantityRequired })) : []
    );
    setShowAddDishModal(true);
  };

  const handleDeleteDish = (item: MenuItem) => {
    if (!canEdit) return;
    if (!confirm(`Are you sure you want to delete menu dish "${item.name}"?`)) return;
    // Optimistic mutation
    setMenuItems((prev) => prev.filter((m) => m.id !== item.id));
    store.deleteMenuItem(item.id);
  };

  const handleAddRecipeRow = () => {
    if (ingredients.length === 0) return;
    setRecipeInputs([...recipeInputs, { ingredientId: ingredients[0].id, quantityRequired: 0.1 }]);
  };

  const handleRemoveRecipeRow = (index: number) => {
    setRecipeInputs(recipeInputs.filter((_, i) => i !== index));
  };

  // Calculate live ingredient cost with memoization for sub-millisecond execution
  const calculatedTotalCost = useMemo(() => {
    return recipeInputs.reduce((total, row) => {
      const ing = ingredients.find((i) => i.id === row.ingredientId);
      return total + (ing ? ing.costPerUnit * row.quantityRequired : 0);
    }, 0);
  }, [recipeInputs, ingredients]);

  const numericSellingPrice = parseFloat(price) || 0;
  const estimatedProfit = numericSellingPrice - calculatedTotalCost;
  const profitMarginPercent = numericSellingPrice > 0 ? (estimatedProfit / numericSellingPrice) * 100 : 0;

  const handleSaveMenuItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !name || !price) return;

    if (editingDish) {
      store.updateMenuItem(
        editingDish.id,
        {
          name,
          category,
          price: numericSellingPrice,
        },
        recipeInputs
      );
    } else {
      store.addMenuItem(
        {
          name,
          category,
          price: numericSellingPrice,
          isActive: true,
        },
        recipeInputs
      );
    }

    setShowAddDishModal(false);
    setEditingDish(null);
    setName('');
    setPrice('');
    setRecipeInputs([]);
  };

  // Memoized Category Filtering
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) =>
      selectedCategoryFilter === 'ALL' ? true : item.category === selectedCategoryFilter
    );
  }, [menuItems, selectedCategoryFilter]);

  return (
    <div className="flex-1 flex flex-col gap-5 bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-amber-500/20 shadow-2xl overflow-hidden w-full">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Utensils className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
              DIGITAL MENU & RECIPE COSTING CATALOG
              {!canEdit && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-slate-400" /> Read-Only View
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400">
              {canEdit
                ? 'Full CRUD management for food categories, dishes, recipe COGS, and pricing'
                : 'View-only menu catalog and recipe cost allocation'}
            </p>
          </div>
        </div>

        {canEdit && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowManageCatModal(true)}
              className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
            >
              <Settings2 className="w-4 h-4 text-amber-400" /> Manage Categories ({categories.length})
            </button>

            <button
              onClick={handleOpenAddDish}
              className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Menu Dish
            </button>
          </div>
        )}
      </div>

      {/* Category Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategoryFilter('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            selectedCategoryFilter === 'ALL'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          All Categories ({menuItems.length})
        </button>
        {categories.map((cat) => {
          const catCount = menuItems.filter((m) => m.category === cat.name).length;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryFilter(cat.name)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                selectedCategoryFilter === cat.name
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Tag className="w-3 h-3" />
              {cat.name} ({catCount})
            </button>
          );
        })}
      </div>

      {/* Menu Cards Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMenuItems.map((item) => {
            const itemCost = store.getItemCost(item.id);
            const margin = item.price > 0 ? ((item.price - itemCost) / item.price) * 100 : 0;
            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                  item.isActive ? 'bg-slate-950/70 border-slate-800 shadow-lg' : 'bg-slate-950/30 border-slate-900 opacity-50'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                      {item.category}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleToggleActive(item.id)}
                        disabled={!canEdit}
                        className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg transition-all ${
                          item.isActive ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-500 hover:bg-slate-800'
                        } ${!canEdit ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        {item.isActive ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5 text-slate-500" />}
                      </button>

                      {/* EDIT DISH BUTTON (ADMIN/MANAGER ONLY) */}
                      {canEdit && (
                        <>
                          <button
                            onClick={() => handleOpenEditDish(item)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-amber-500 text-slate-400 hover:text-slate-950 transition cursor-pointer"
                            title="Edit Dish & Recipe"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteDish(item)}
                            className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-500 text-slate-400 hover:text-white transition cursor-pointer"
                            title="Delete Dish"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <h3 className="text-lg font-black text-slate-100">{item.name}</h3>

                  {/* Recipe Breakdown */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-1">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Recipe Ingredients:</p>
                    {item.recipes && item.recipes.length > 0 ? (
                      item.recipes.map((r) => {
                        const ing = ingredients.find((i) => i.id === r.ingredientId);
                        const ingCost = ing ? ing.costPerUnit * r.quantityRequired : 0;
                        return (
                          <div key={r.id} className="flex justify-between text-xs text-slate-300">
                            <span>
                              {ing?.name || 'Ingredient'} ({r.quantityRequired} {ing?.unit})
                            </span>
                            <span className="font-semibold text-slate-400">{ingCost.toFixed(2)} ETB</span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-xs text-slate-500 italic">No recipe mapped</p>
                    )}
                  </div>
                </div>

                {/* Costing Footer */}
                <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Ingredient Cost (COGS):</span>
                    <span className="font-bold text-rose-400">{itemCost.toFixed(2)} ETB</span>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Selling Price:</span>
                    <span className="text-base font-black text-amber-400">{item.price.toFixed(2)} ETB</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MANAGE CATEGORIES MODAL (FULL CATEGORY CRUD - ADMIN/MANAGER ONLY) */}
      {canEdit && showManageCatModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <button onClick={() => setShowManageCatModal(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-100">
              <X className="w-5 h-5" />
            </button>

            <div className="flex justify-between items-center">
              <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-amber-400" /> Food Category Manager
              </h2>
              <button
                onClick={() => {
                  setShowManageCatModal(false);
                  setShowAddCatModal(true);
                }}
                className="py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> New Category
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1 divide-y divide-slate-800/60">
              {categories.map((cat) => (
                <div key={cat.id} className="pt-2 flex justify-between items-center text-xs">
                  {editingCategory?.id === cat.id ? (
                    <form onSubmit={handleUpdateCategorySubmit} className="flex gap-2 flex-1 mr-2">
                      <input
                        type="text"
                        value={editCategoryName}
                        onChange={(e) => setEditCategoryName(e.target.value)}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-100 outline-none"
                        required
                      />
                      <button type="submit" className="px-2 py-1 bg-emerald-500 text-slate-950 font-bold rounded-lg cursor-pointer">
                        Save
                      </button>
                      <button type="button" onClick={() => setEditingCategory(null)} className="px-2 py-1 bg-slate-800 text-slate-300 rounded-lg cursor-pointer">
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <>
                      <span className="font-bold text-slate-200">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditCategory(cat)}
                          className="p-1 text-slate-400 hover:text-amber-400 transition cursor-pointer"
                          title="Edit Category Name"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* CREATE FOOD CATEGORY MODAL (ADMIN/MANAGER ONLY) */}
      {canEdit && showAddCatModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-sm w-full p-6 shadow-2xl relative space-y-4">
            <button onClick={() => setShowAddCatModal(false)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-100">
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-black text-slate-100 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-amber-400" /> Create Food Category
            </h2>

            <form onSubmit={handleAddCategorySubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Category Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Ethiopian Breakfast, Fresh Juices"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCatModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MENU DISH MODAL (ADMIN/MANAGER ONLY) */}
      {canEdit && showAddDishModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-3xl w-full p-8 shadow-2xl relative space-y-6 my-8">
            <button onClick={() => setShowAddDishModal(false)} className="absolute right-5 top-5 text-slate-400 hover:text-slate-100 p-1">
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
              {editingDish ? <Edit3 className="w-6 h-6 text-amber-400" /> : <Plus className="w-6 h-6 text-amber-400" />}
              {editingDish ? `Edit Menu Dish: ${editingDish.name}` : 'Add New Menu Dish & Recipe'}
            </h2>

            <form onSubmit={handleSaveMenuItem} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">Dish / Beverage Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Special Beef Tibs"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500 font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Food Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1 block">Selling Price (ETB) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1500.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500 font-mono font-bold"
                    required
                  />
                </div>
              </div>

              {/* RECIPE BUILDER & INGREDIENT MAPPER */}
              <div className="pt-3 border-t border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <label className="text-xs font-bold text-slate-200 block">Recipe Ingredients Mapping</label>
                    <span className="text-[11px] text-slate-400">Map required ingredients & quantities to calculate dish cost</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRecipeRow}
                    className="px-3 py-1.5 bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-950 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    + Add Ingredient Line
                  </button>
                </div>

                {recipeInputs.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-500 italic">
                    No ingredients added yet. Click &quot;+ Add Ingredient Line&quot; to build the dish recipe.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {recipeInputs.map((row, idx) => {
                      const ing = ingredients.find((i) => i.id === row.ingredientId);
                      const lineCost = ing ? ing.costPerUnit * row.quantityRequired : 0;
                      return (
                        <div key={idx} className="flex flex-col gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                          <div className="flex gap-3 items-center">
                            <SearchableIngredientSelect
                              ingredients={ingredients}
                              selectedId={row.ingredientId}
                              onSelect={(newId) => {
                                setRecipeInputs(recipeInputs.map((r, i) => (i === idx ? { ...r, ingredientId: newId } : r)));
                              }}
                            />

                            <div className="flex items-center gap-1.5 shrink-0">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Qty"
                                value={row.quantityRequired}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setRecipeInputs(recipeInputs.map((r, i) => (i === idx ? { ...r, quantityRequired: val } : r)));
                                }}
                                className="w-20 bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-100 text-center font-mono outline-none"
                              />
                              <span className="text-xs text-amber-400 font-bold w-8">{ing?.unit || ''}</span>
                            </div>

                            <div className="w-24 text-right text-xs font-mono text-slate-300 font-semibold shrink-0">
                              = {lineCost.toFixed(2)} ETB
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveRecipeRow(idx)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 transition cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* LIVE DYNAMIC DISH COST & PROFIT MARGIN CALCULATOR */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <Calculator className="w-4 h-4" /> Live Dish Costing Summary:
                  </span>
                  <span>{calculatedTotalCost.toFixed(2)} ETB (COGS)</span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-amber-500/20">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Calculated Cost:</span>
                    <span className="font-bold text-rose-400">{calculatedTotalCost.toFixed(2)} ETB</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Selling Price:</span>
                    <span className="font-bold text-amber-400">{numericSellingPrice.toFixed(2)} ETB</span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-400 block">Est. Profit Margin:</span>
                    <span className={`font-black ${estimatedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {numericSellingPrice > 0 ? `${profitMarginPercent.toFixed(1)}%` : '0%'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDishModal(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  {editingDish ? 'Update Dish' : 'Save Dish & Recipe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
