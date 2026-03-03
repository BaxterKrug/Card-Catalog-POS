import { useState, useRef } from "react";
import { Activity, Users, Lock, TrendingUp, TrendingDown } from "lucide-react";
import { useOrders } from "../hooks/useOrders";
import { useInventory } from "../hooks/useInventory";
import { useCustomers } from "../hooks/useCustomers";
import { usePreorderClaims, usePreorderItems } from "../hooks/usePreorders";
import { useAuth } from "../contexts/AuthContext";

const DashboardPage = () => {
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  // Date filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  
  // Profit tracking
  const [dailyExpenses, setDailyExpenses] = useState(0);
  const [showTrendLine, setShowTrendLine] = useState(false);
  const [showProfit, setShowProfit] = useState(false);
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Fetch data
  const { data: orders } = useOrders();
  const { data: inventory } = useInventory();
  const { data: customers } = useCustomers();
  const { data: preorderClaims } = usePreorderClaims();
  const { data: preorderItems } = usePreorderItems();

  const ordersList = orders || [];
  const inventoryList = inventory || [];
  const customersList = customers || [];
  const claimsList = preorderClaims || [];
  const itemsList = preorderItems || [];


  // Create inventory lookup map for COGS calculation
  const inventoryMap = new Map(inventoryList.map((item: any) => [item.id, item]));

  // Filter orders by date range
  const filteredOrders = ordersList.filter((order: any) => {
    if (!order.created_at) return false;
    const orderDate = new Date(order.created_at);
    if (fromDate && orderDate < new Date(fromDate)) return false;
    if (toDate && orderDate > new Date(toDate + "T23:59:59")) return false;
    return true;
  });

  // Calculate revenue, COGS, and profit by date
  const revenueByDate: { [key: string]: number } = {};
  const cogsByDate: { [key: string]: number } = {};

  filteredOrders.forEach((order: any) => {
    const dateKey = new Date(order.created_at).toLocaleDateString();
    const orderTotal = order.total_cents ? order.total_cents / 100 : 0;
    revenueByDate[dateKey] = (revenueByDate[dateKey] || 0) + orderTotal;

    // Calculate COGS for this order
    let orderCOGS = 0;
    if (order.items && Array.isArray(order.items)) {
      order.items.forEach((item: any) => {
        const inventoryItem = inventoryMap.get(item.inventory_item_id);
        if (inventoryItem?.acquisition_cost_cents) {
          orderCOGS += (inventoryItem.acquisition_cost_cents / 100) * item.quantity;
        }
      });
    }
    cogsByDate[dateKey] = (cogsByDate[dateKey] || 0) + orderCOGS;
  });

  const salesDates = Object.keys(revenueByDate).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );
  const salesValues = salesDates.map((date) => revenueByDate[date]);
  const cogsValues = salesDates.map((date) => cogsByDate[date] || 0);

  // Calculate totals
  const totalRevenue = salesValues.reduce((sum, val) => sum + val, 0);
  const totalCOGS = cogsValues.reduce((sum, val) => sum + val, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  const dayCount = salesDates.length || 1;
  const totalExpenses = dailyExpenses * dayCount;
  const netProfit = grossProfit - totalExpenses;

  // Active customers (customers with orders in date range)
  const activeCustomerIds = new Set(
    filteredOrders.map((o: any) => o.customer_id).filter(Boolean)
  );
  const activeCustomers = activeCustomerIds.size;

  // Preorder stats
  const paidPreorders = claimsList.filter((c: any) => c.is_paid);
  const unpaidPreorders = claimsList.filter((c: any) => !c.is_paid);
  const availableItems = itemsList.filter((i: any) => i.quantity_available > 0);

  // Last 7 days for bar chart
  const last7Days = salesDates.slice(-7);
  const last7Values = salesValues.slice(-7);
  const maxLast7 = Math.max(...last7Values, 1);

  // Trend line calculation (least squares regression)
  let trendLine: { x: number; y: number }[] = [];
  if (showTrendLine && salesDates.length > 1) {
    const n = salesDates.length;
    const xValues = Array.from({ length: n }, (_, i) => i);
    const yValues = showProfit
      ? salesValues.map((val, idx) => val - cogsValues[idx] - dailyExpenses)
      : salesValues;

    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    trendLine = xValues.map((x) => ({ x, y: slope * x + intercept }));
  }

  // Scatter plot data
  const scatterData = salesDates.map((date, idx) => {
    const revenue = salesValues[idx];
    const cogs = cogsValues[idx];
    const value = showProfit ? revenue - cogs - dailyExpenses : revenue;
    return { date, value, revenue, cogs };
  });

  const maxScatter = Math.max(...scatterData.map((d) => Math.abs(d.value)), 1);
  const minScatter = Math.min(...scatterData.map((d) => d.value), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-sm uppercase tracking-[0.3em] text-white/40">Overview</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Control tower</h1>
        <p className="mt-1 text-sm text-white/60">
          Revenue analytics, profit tracking with COGS, and operational insights.
        </p>
      </div>

      {/* Owner-Only Content */}
      {!isOwner ? (
        <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-6">
          <div className="flex items-center gap-3">
            <Lock size={24} className="text-amber-500" />
            <div>
              <h3 className="text-lg font-semibold text-white">Owner Access Required</h3>
              <p className="text-sm text-white/60">
                Revenue analytics and financial data are restricted to owner-level accounts.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Date Filters and Controls */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-white/40 mb-2">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-white/40 mb-2">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.25em] text-white/40 mb-2">
                Daily Expenses ($)
              </label>
              <input
                type="number"
                value={dailyExpenses}
                onChange={(e) => setDailyExpenses(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
              />
            </div>
            <div className="flex flex-col gap-2 justify-end">
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={showProfit}
                  onChange={(e) => setShowProfit(e.target.checked)}
                  className="rounded"
                />
                Show Profit
              </label>
              <label className="flex items-center gap-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={showTrendLine}
                  onChange={(e) => setShowTrendLine(e.target.checked)}
                  className="rounded"
                />
                Show Trend Line
              </label>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">
                  {showProfit ? (dailyExpenses > 0 ? "Net Profit" : "Gross Profit") : "Revenue"}
                </p>
                <Activity size={18} className="text-accent" />
              </div>
              <p className="mt-4 text-2xl font-semibold text-white">
                ${showProfit ? (dailyExpenses > 0 ? netProfit.toFixed(2) : grossProfit.toFixed(2)) : totalRevenue.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-white/60">
                {showProfit
                  ? dailyExpenses > 0
                    ? `COGS $${totalCOGS.toFixed(2)} + Expenses $${totalExpenses.toFixed(2)}`
                    : `COGS $${totalCOGS.toFixed(2)} (${grossMargin.toFixed(1)}% margin)`
                  : `${salesDates.length} days in filtered range`}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">Active Customers</p>
                <Users size={18} className="text-accent" />
              </div>
              <p className="mt-4 text-2xl font-semibold text-white">{activeCustomers}</p>
              <p className="mt-1 text-xs text-white/60">
                {filteredOrders.length} orders in period
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.25em] text-white/40">Gross Revenue</p>
                <Activity size={18} className="text-emerald-500" />
              </div>
              <p className="mt-4 text-2xl font-semibold text-white">${totalRevenue.toFixed(2)}</p>
              <p className="mt-1 text-xs text-white/60">Before COGS & expenses</p>
            </div>
          </div>

          {/* Preorder Status Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-emerald-400/70">
                Paid Pre-orders
              </p>
              <p className="mt-4 text-2xl font-semibold text-white">{paidPreorders.length}</p>
              <p className="mt-1 text-xs text-emerald-400/60">Fully paid</p>
            </div>

            <div className="rounded-3xl border border-amber-500/30 bg-amber-500/10 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-amber-400/70">
                Unpaid Pre-orders
              </p>
              <p className="mt-4 text-2xl font-semibold text-white">{unpaidPreorders.length}</p>
              <p className="mt-1 text-xs text-amber-400/60">Pending payment</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-white/40">
                Available Items
              </p>
              <p className="mt-4 text-2xl font-semibold text-white">{availableItems.length}</p>
              <p className="mt-1 text-xs text-white/60">Ready to pre-order</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Last 7 Days Bar Chart - Improved */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                    {showProfit ? "Daily Profit" : "Daily Revenue"}
                  </p>
                  <h2 className="text-xl font-semibold text-white">Last 7 Days</h2>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/40">
                    {last7Days.length > 0 ? "Peak" : "No data"}
                  </p>
                  <p className="text-lg font-semibold text-white">
                    {last7Days.length > 0 ? `$${maxLast7.toFixed(2)}` : "-"}
                  </p>
                </div>
              </div>
              
              <div className="mt-6 relative">
                {/* Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center">
                      <span className="text-[0.65rem] text-white/30 w-12">
                        ${((maxLast7 * (4 - i)) / 4).toFixed(0)}
                      </span>
                      <div className="flex-1 border-t border-white/5 ml-2" />
                    </div>
                  ))}
                </div>

                {/* Bar chart */}
                <div className="h-48 flex items-end gap-3 pl-14 pt-2">
                  {last7Days.map((date, idx) => {
                    const value = showProfit 
                      ? last7Values[idx] - cogsValues.slice(-7)[idx] - dailyExpenses
                      : last7Values[idx];
                    const height = maxLast7 > 0 ? (Math.abs(value) / maxLast7) * 100 : 0;
                    const isNegative = value < 0;
                    const isHovered = hoveredBarIndex === idx;
                    
                    return (
                      <div 
                        key={date} 
                        className="flex-1 flex flex-col items-center gap-2 relative group"
                        onMouseEnter={() => setHoveredBarIndex(idx)}
                        onMouseLeave={() => setHoveredBarIndex(null)}
                      >
                        {/* Tooltip */}
                        {isHovered && (
                          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#1a1f2e] border border-white/20 rounded-lg px-3 py-2 shadow-xl z-10 whitespace-nowrap">
                            <p className="text-xs text-white/60">
                              {new Date(date).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                            <p className="text-sm font-semibold text-white mt-1">
                              ${Math.abs(value).toFixed(2)}
                            </p>
                            {showProfit && (
                              <div className="text-[0.65rem] text-white/50 mt-1 space-y-0.5">
                                <p>Rev: ${last7Values[idx].toFixed(2)}</p>
                                <p>COGS: ${cogsValues.slice(-7)[idx].toFixed(2)}</p>
                                <p>Exp: ${dailyExpenses.toFixed(2)}</p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div
                          className={`w-full rounded-t-lg transition-all duration-300 ${
                            isNegative 
                              ? 'bg-gradient-to-t from-red-500/80 to-red-400' 
                              : 'bg-gradient-to-t from-accent/80 to-accent'
                          } ${isHovered ? 'opacity-100 scale-105' : 'opacity-80'}`}
                          style={{ height: `${height}%`, minHeight: height > 0 ? '4px' : '0' }}
                        />
                        <span className="text-[0.6rem] text-white/40 rotate-45 origin-left whitespace-nowrap">
                          {new Date(date).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Revenue Analysis Scatter Plot - Improved */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                    {showProfit ? "Profit Trend" : "Revenue Trend"}
                  </p>
                  <h2 className="text-xl font-semibold text-white">Over Time</h2>
                </div>
                {scatterData.length > 1 && (
                  <div className="flex items-center gap-2">
                    {(() => {
                      const firstValue = scatterData[0].value;
                      const lastValue = scatterData[scatterData.length - 1].value;
                      const change = lastValue - firstValue;
                      const percentChange = firstValue !== 0 ? (change / firstValue) * 100 : 0;
                      const isPositive = change >= 0;
                      
                      return (
                        <>
                          {isPositive ? (
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-400" />
                          )}
                          <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isPositive ? '+' : ''}{percentChange.toFixed(1)}%
                          </span>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
              
              <div className="mt-6 relative" ref={chartRef}>
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-[0.65rem] text-white/30">
                  <span>${maxScatter.toFixed(0)}</span>
                  <span>${(maxScatter * 0.75).toFixed(0)}</span>
                  <span>${(maxScatter * 0.5).toFixed(0)}</span>
                  <span>${(maxScatter * 0.25).toFixed(0)}</span>
                  {showProfit && minScatter < 0 ? (
                    <span className="text-red-400">${minScatter.toFixed(0)}</span>
                  ) : (
                    <span>$0</span>
                  )}
                </div>

                <div className="h-48 ml-14 relative">
                  {/* Grid */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="border-t border-white/5" />
                    ))}
                  </div>

                  <svg width="100%" height="100%" className="relative">
                    {/* Zero line for profit mode */}
                    {showProfit && minScatter < 0 && (
                      <line
                        x1="0"
                        y1={`${((maxScatter / (maxScatter - minScatter)) * 100).toFixed(1)}%`}
                        x2="100%"
                        y2={`${((maxScatter / (maxScatter - minScatter)) * 100).toFixed(1)}%`}
                        stroke="rgb(239 68 68)"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        opacity="0.3"
                      />
                    )}

                    {/* Trend line with shadow */}
                    {showTrendLine && trendLine.length > 0 && (
                      <>
                        <polyline
                          points={trendLine
                            .map((point, idx) => {
                              const x = (idx / (trendLine.length - 1)) * 100;
                              const y = showProfit
                                ? ((maxScatter - point.y) / (maxScatter - minScatter)) * 100
                                : ((maxScatter - point.y) / maxScatter) * 100;
                              return `${x},${y}`;
                            })
                            .join(" ")}
                          fill="none"
                          stroke="rgb(251 191 36)"
                          strokeWidth="3"
                          opacity="0.2"
                          strokeLinecap="round"
                        />
                        <polyline
                          points={trendLine
                            .map((point, idx) => {
                              const x = (idx / (trendLine.length - 1)) * 100;
                              const y = showProfit
                                ? ((maxScatter - point.y) / (maxScatter - minScatter)) * 100
                                : ((maxScatter - point.y) / maxScatter) * 100;
                              return `${x},${y}`;
                            })
                            .join(" ")}
                          fill="none"
                          stroke="rgb(251 191 36)"
                          strokeWidth="2"
                          opacity="0.7"
                          strokeLinecap="round"
                          strokeDasharray="6 3"
                        />
                      </>
                    )}

                    {/* Connecting line between points */}
                    {scatterData.length > 1 && (
                      <polyline
                        points={scatterData
                          .map((point, idx) => {
                            const x = (idx / (scatterData.length - 1 || 1)) * 100;
                            const y = showProfit
                              ? ((maxScatter - point.value) / (maxScatter - minScatter)) * 100
                              : ((maxScatter - point.value) / maxScatter) * 100;
                            return `${x},${y}`;
                          })
                          .join(" ")}
                        fill="none"
                        stroke="rgb(34 197 94)"
                        strokeWidth="2"
                        opacity="0.3"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Data points with glow effect */}
                    {scatterData.map((point, idx) => {
                      const x = (idx / (scatterData.length - 1 || 1)) * 100;
                      const y = showProfit
                        ? ((maxScatter - point.value) / (maxScatter - minScatter)) * 100
                        : ((maxScatter - point.value) / maxScatter) * 100;
                      const color = showProfit && point.value < 0 ? "rgb(239 68 68)" : "rgb(34 197 94)";
                      const isHovered = hoveredPointIndex === idx;

                      return (
                        <g key={idx}>
                          {/* Glow effect */}
                          <circle
                            cx={`${x}%`}
                            cy={`${y}%`}
                            r={isHovered ? "10" : "8"}
                            fill={color}
                            opacity="0.2"
                            className="transition-all duration-200"
                          />
                          {/* Main point */}
                          <circle
                            cx={`${x}%`}
                            cy={`${y}%`}
                            r={isHovered ? "6" : "5"}
                            fill={color}
                            opacity="0.9"
                            className="cursor-pointer transition-all duration-200"
                            onMouseEnter={() => setHoveredPointIndex(idx)}
                            onMouseLeave={() => setHoveredPointIndex(null)}
                          >
                            <title>
                              {showProfit
                                ? `${point.date}: Revenue $${point.revenue.toFixed(2)} - COGS $${point.cogs.toFixed(2)} - Expenses $${dailyExpenses.toFixed(2)} = $${point.value.toFixed(2)}`
                                : `${point.date}: $${point.value.toFixed(2)}`}
                            </title>
                          </circle>
                          {/* White center */}
                          <circle
                            cx={`${x}%`}
                            cy={`${y}%`}
                            r="2"
                            fill="white"
                            opacity={isHovered ? "1" : "0.8"}
                            className="pointer-events-none transition-all duration-200"
                          />
                          
                          {/* Hover tooltip */}
                          {isHovered && (
                            <g>
                              <foreignObject
                                x={`${Math.min(Math.max(x, 10), 90)}%`}
                                y={`${Math.max(y - 15, 5)}%`}
                                width="120"
                                height="80"
                                className="pointer-events-none"
                              >
                                <div className="bg-[#1a1f2e] border border-white/20 rounded-lg px-3 py-2 shadow-xl">
                                  <p className="text-xs text-white/60">
                                    {new Date(point.date).toLocaleDateString()}
                                  </p>
                                  <p className="text-sm font-semibold text-white mt-1">
                                    ${point.value.toFixed(2)}
                                  </p>
                                  {showProfit && (
                                    <div className="text-[0.65rem] text-white/50 mt-1 space-y-0.5">
                                      <p>Rev: ${point.revenue.toFixed(2)}</p>
                                      <p>COGS: ${point.cogs.toFixed(2)}</p>
                                    </div>
                                  )}
                                </div>
                              </foreignObject>
                            </g>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
