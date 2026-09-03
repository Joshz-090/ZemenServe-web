import React, { useState, useEffect } from 'react';
import { store } from '@/lib/store';
import { Ingredient, InventoryLog, MenuItem } from '@/lib/types';
import { Package, AlertTriangle, Plus, RefreshCw, Layers, History, DollarSign, X, Edit3, Trash2, Search } from 'lucide-react';

interface InventoryManagementViewProps {
  userRole?: string;
}

export function InventoryManagementView({ userRole }: InventoryManagementViewProps) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeTab, setActiveTab] = useState<'stock' | 'recipes' | 'logs'>('stock');

  // Fast Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState<boolean>(false);

  // Restock Modal
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [restockAmount, setRestockAmount] = useState<string>('');
  const [restockReason, setRestockReason] = useState<string>('Routine Purchase Restock');
  const [restockNewCost, setRestockNewCost] = useState<string>('');

  // Edit Ingredient Modal
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editUnit, setEditUnit] = useState<string>('kg');
  const [editCost, setEditCost] = useState<string>('');
  const [editStock, setEditStock] = useState<string>('');
  const [editThreshold, setEditThreshold] = useState<string>('');

  // New Ingredient Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newIngName, setNewIngName] = useState<string>('');
  const [newIngUnit, setNewIngUnit] = useState<string>('kg');
  const [newIngCost, setNewIngCost] = useState<string>('');
  const [newIngStock, setNewIngStock] = useState<string>('');
  const [newIngThreshold, setNewIngThreshold] = useState<string>('');

  useEffect(() => {
    const updateData = () => {
      setIngredients(store.getIngredients());
      setInventoryLogs(store.getInventoryLogs());
      setMenuItems(store.getMenuItems());
    };

    updateData();
    // Sync with system database
    store.fetchIngredientsFromDB();
    store.fetchLogsFromDB();

    const unsubscribe = store.subscribe(updateData);
    return () => unsubscribe();
  }, []);

  const handleOpenRestock = (ing: Ingredient) => {
    setSelectedIngredient(ing);
    setRestockAmount('');
    setRestockReason('Market Restock');
    setRestockNewCost(ing.costPerUnit.toString());
  };

  const handleOpenEdit = (ing: Ingredient) => {
    setEditingIngredient(ing);
    setEditName(ing.name);
    setEditUnit(ing.unit);
    setEditCost(ing.costPerUnit.toString());
    setEditStock(ing.stockQuantity.toString());
    setEditThreshold(ing.lowStockThreshold.toString());
  };

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredient || !restockAmount) return;

    const qty = parseFloat(restockAmount);
    if (isNaN(qty) || qty <= 0) return;

    const parsedCost = parseFloat(restockNewCost);
    const newCost = isNaN(parsedCost) ? undefined : parsedCost;

    store.restockIngredient(selectedIngredient.id, qty, restockReason, newCost);
    setSelectedIngredient(null);
    setRestockAmount('');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIngredient || !editName) return;

    store.updateIngredient({
      id: editingIngredient.id,
      name: editName,
      unit: editUnit,
      costPerUnit: parseFloat(editCost) || 0,
      stockQuantity: parseFloat(editStock) || 0,
      lowStockThreshold: parseFloat(editThreshold) || 5,
    });

    setEditingIngredient(null);
  };

  const handleDeleteIngredient = (ing: Ingredient) => {
    if (!confirm(`Are you sure you want to delete ${ing.name} from inventory?`)) return;
    store.deleteIngredient(ing.id);
  };

  const handleAddIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngName || !newIngCost || !newIngStock) return;

    store.addIngredient({
      name: newIngName,
      unit: newIngUnit,
      costPerUnit: parseFloat(newIngCost) || 0,
      stockQuantity: parseFloat(newIngStock) || 0,
      lowStockThreshold: parseFloat(newIngThreshold) || 5,
    });

    setShowAddModal(false);
    setNewIngName('');
    setNewIngCost('');
    setNewIngStock('');
  };

  const lowStockCount = ingredients.filter((i) => i.stockQuantity <= i.lowStockThreshold).length;

  const filteredIngredients = ingredients.filter((ing) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || ing.name.toLowerCase().includes(query) || ing.unit.toLowerCase().includes(query);
    const matchesLowStock = filterLowStockOnly ? ing.stockQuantity <= ing.lowStockThreshold : true;
    return matchesSearch && matchesLowStock;
  });

  const canModify = userRole === 'Admin' || userRole === 'Manager';

  return (
    <div className="flex-1 flex flex-col gap-5 bg-slate-900/60 backdrop-blur-md p-6 rounded-2xl border border-amber-500/20 shadow-2xl overflow-hidden w-full">
      {/* Cashier Read-Only Mode Banner */}
      {userRole === 'Cashier' && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-3 text-amber-400 text-xs font-bold shrink-0">
          <Package className="w-5 h-5 shrink-0" />
          <div>
            <span>🔒 READ-ONLY VIEW (CASHIER MODE)</span>
            <p className="text-[11px] text-slate-400 font-normal">
              You are viewing inventory stock levels in Read-Only mode. Restock, Edit, and Add Ingredient actions are restricted to Manager and Admin accounts.
            </p>
          </div>
        </div>
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-100 flex items-center gap-2">
              F&B INVENTORY & RECIPE CONTROL
              {lowStockCount > 0 && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3 h-3" /> {lowStockCount} Low Stock
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-400">Ingredient-level tracking & recipe cost allocation</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canModify && (
            <button
              onClick={() => setShowAddModal(true)}
              className="py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" /> Add Ingredient
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto pr-1">
        {/* TAB 1: Stock Items Table */}
        {activeTab === 'stock' && (
          <div className="space-y-4">
            {/* Search & Quick Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-slate-950/80 p-3 rounded-xl border border-slate-800">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ingredient by name or unit..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-amber-500 font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setFilterLowStockOnly(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    !filterLowStockOnly
                      ? 'bg-slate-800 text-amber-400 border border-amber-500/30'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
                  }`}
                >
                  All Items ({ingredients.length})
                </button>
                <button
                  onClick={() => setFilterLowStockOnly(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    filterLowStockOnly
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
                  }`}
                >
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  Low Stock ({lowStockCount})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Ingredient Name</th>
                    <th className="py-3.5 px-4">Unit</th>
                    <th className="py-3.5 px-4">Cost / Unit</th>
                    <th className="py-3.5 px-4">Current Stock</th>
                    <th className="py-3.5 px-4">Threshold</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredIngredients.map((ing) => {
                  const isLow = ing.stockQuantity <= ing.lowStockThreshold;
                  return (
                    <tr key={ing.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-100">{ing.name}</td>
                      <td className="py-3.5 px-4 font-medium text-amber-400">{ing.unit}</td>
                      <td className="py-3.5 px-4 font-semibold">{ing.costPerUnit.toFixed(2)} ETB</td>
                      <td className="py-3.5 px-4 font-black text-sm">
                        {ing.stockQuantity} <span className="text-xs text-slate-400 font-normal">{ing.unit}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{ing.lowStockThreshold} {ing.unit}</td>
                      <td className="py-3.5 px-4">
                        {isLow ? (
                          <span className="px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30 flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" /> ⚠️ LOW STOCK
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20 w-fit block">
                            NORMAL
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {canModify ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenRestock(ing)}
                              className="py-1.5 px-3 rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-950 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
                              title="Restock Stock"
                            >
                              <RefreshCw className="w-3.5 h-3.5" /> Restock
                            </button>
                            <button
                              onClick={() => handleOpenEdit(ing)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-500 text-slate-300 hover:text-white transition-all cursor-pointer"
                              title="Edit Ingredient Details"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteIngredient(ing)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500 text-slate-300 hover:text-white transition-all cursor-pointer"
                              title="Delete Ingredient"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-500 font-medium italic">Read-Only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredIngredients.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-950/40">
                No ingredients match your search query &quot;{searchQuery}&quot;.
              </div>
            )}
          </div>
        </div>
      )}

        {/* TAB 2: Recipes & Dish Costing */}
        {activeTab === 'recipes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {menuItems.map((item) => {
              const itemCost = store.getItemCost(item.id);
              const margin = item.price > 0 ? ((item.price - itemCost) / item.price) * 100 : 0;
              return (
                <div key={item.id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10">
                        {item.category}
                      </span>
                      <h3 className="text-base font-black text-slate-100 mt-1">{item.name}</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-amber-400">{item.price.toFixed(2)} ETB</span>
                      <p className="text-[11px] text-slate-400">Selling Price</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Recipe Ingredients:</p>
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
                      <p className="text-xs text-slate-500 italic">No recipe ingredient mapped</p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-slate-400">Estimated COGS:</span>
                      <span className="font-bold text-rose-400 ml-1">{itemCost.toFixed(2)} ETB</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Margin:</span>
                      <span className="font-bold text-emerald-400 ml-1">{margin.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: Inventory Audit Logs */}
        {activeTab === 'logs' && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Ingredient</th>
                  <th className="py-3.5 px-4">Stock Change</th>
                  <th className="py-3.5 px-4">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {inventoryLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-100">{log.ingredientName}</td>
                    <td className="py-3 px-4 font-black">
                      <span className={log.changeAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {log.changeAmount >= 0 ? `+${log.changeAmount}` : log.changeAmount}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{log.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Restock Modal (Includes Purchase Cost Adjustment) */}
      {selectedIngredient && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setSelectedIngredient(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-black text-slate-100 flex items-center gap-2 mb-1">
              <RefreshCw className="w-5 h-5 text-amber-400" /> Restock Ingredient
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              Item: <strong className="text-amber-400">{selectedIngredient.name}</strong> (Current Stock:{' '}
              {selectedIngredient.stockQuantity} {selectedIngredient.unit})
            </p>

            <form onSubmit={handleRestockSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">
                  Quantity to Add ({selectedIngredient.unit}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 10"
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-amber-400 mb-1 block">
                  Unit Purchase Cost (ETB) — Adjust if Market Price Changed
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 450.00"
                  value={restockNewCost}
                  onChange={(e) => setRestockNewCost(e.target.value)}
                  className="w-full bg-slate-950 border border-amber-500/30 rounded-xl px-3 py-2 text-amber-400 text-sm focus:outline-none focus:border-amber-400 font-mono font-bold"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Previous Unit Cost: {selectedIngredient.costPerUnit.toFixed(2)} ETB
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Reason / Supplier Note</label>
                <input
                  type="text"
                  placeholder="e.g. Weekly Market Restock"
                  value={restockReason}
                  onChange={(e) => setRestockReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedIngredient(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Ingredient Modal */}
      {editingIngredient && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-blue-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setEditingIngredient(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-black text-slate-100 flex items-center gap-2 mb-4">
              <Edit3 className="w-5 h-5 text-blue-400" /> Edit Ingredient Details
            </h2>

            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Ingredient Name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Unit</label>
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
                    required
                  >
                    <option value="kg">KG (Kilograms)</option>
                    <option value="L">L (Liters)</option>
                    <option value="pcs">pcs (Pieces)</option>
                    <option value="pkt">pkt (Packets)</option>
                    <option value="btl">btl (Bottles)</option>
                    <option value="can">can (Cans)</option>
                    <option value="unitless">Unitless (Count)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Unit Cost (ETB) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Current Stock *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Low Stock Threshold</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editThreshold}
                    onChange={(e) => setEditThreshold(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingIngredient(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-500/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Ingredient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-black text-slate-100 flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5 text-amber-400" /> Create New Ingredient
            </h2>

            <form onSubmit={handleAddIngredient} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 mb-1 block">Ingredient Name</label>
                <input
                  type="text"
                  placeholder="e.g. Tomato Paste"
                  value={newIngName}
                  onChange={(e) => setNewIngName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Unit</label>
                  <select
                    value={newIngUnit}
                    onChange={(e) => setNewIngUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                    required
                  >
                    <option value="kg">KG (Kilograms)</option>
                    <option value="L">L (Liters)</option>
                    <option value="pcs">pcs (Pieces)</option>
                    <option value="pkt">pkt (Packets)</option>
                    <option value="btl">btl (Bottles)</option>
                    <option value="can">can (Cans)</option>
                    <option value="unitless">Unitless (Count)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Cost per Unit (ETB)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="150.00"
                    value={newIngCost}
                    onChange={(e) => setNewIngCost(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Initial Stock</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="20"
                    value={newIngStock}
                    onChange={(e) => setNewIngStock(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 mb-1 block">Low Stock Alert Threshold</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="5"
                    value={newIngThreshold}
                    onChange={(e) => setNewIngThreshold(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20"
                >
                  Save Ingredient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
