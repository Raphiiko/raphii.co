import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  ChevronDown,
  Star,
} from "lucide-react";

interface Treadmill {
  id: string;
  make: string;
  model: string;
  driver: string;
  features: string[];
  sharedNotes: string[];
  vendorApps?: { name: string; supported: boolean }[];
  source?: {
    url: string;
  };
}

interface TreadmillTableProps {
  data: Treadmill[];
}

const FEATURE_LABELS: Record<string, string> = {
  speedControl: "Speed Control",
  inclineControl: "Incline Control",
  cadence: "Cadence",
  calories: "Calories",
  heartRate: "Heart Rate",
  steps: "Steps",
  // Legacy support in case old data persists
  stepCount: "Steps",
};

const getDriverDisplayName = (driver: string) => {
  switch (driver) {
    case "Kingsmith Walking Pad":
      return "WalkingPad";
    case "Generic":
      return "Generic FTMS";
    default:
      return driver;
  }
};

// Developer's personal treadmill choice
const DEVELOPER_CHOICE = {
  make: "KingSmith",
  model: "WalkingPad P1",
};

const isDeveloperChoice = (item: Treadmill) => {
  return (
    item.make === DEVELOPER_CHOICE.make && item.model === DEVELOPER_CHOICE.model
  );
};

const Badge = ({
  text,
  variant = "default",
}: {
  text: string;
  variant?: "default" | "success" | "tip" | "caution" | "danger";
}) => {
  const colors = {
    default: "bg-slate-800 text-slate-300 border-slate-700",
    success: "bg-green-950/50 text-green-400 border-green-900",
    tip: "bg-purple-950/50 text-purple-400 border-purple-900",
    caution: "bg-orange-950/50 text-orange-400 border-orange-900",
    danger: "bg-red-950/50 text-red-400 border-red-900",
  };

  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded border ${colors[variant] || colors.default} whitespace-nowrap`}
    >
      {text}
    </span>
  );
};

export default function TreadmillTable({ data }: TreadmillTableProps) {
  const [search, setSearch] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filterRef.current &&
        !filterRef.current.contains(event.target as Node)
      ) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const stats = useMemo(() => {
    const featureCounts: Record<string, number> = {};
    const driverCounts: Record<string, number> = {};
    const allFeaturesSet = new Set<string>();
    const allDriversSet = new Set<string>();

    data.forEach((t) => {
      t.features.forEach((f) => {
        allFeaturesSet.add(f);
        featureCounts[f] = (featureCounts[f] || 0) + 1;
      });

      const driverName = getDriverDisplayName(t.driver);
      allDriversSet.add(driverName);
      driverCounts[driverName] = (driverCounts[driverName] || 0) + 1;
    });

    return {
      features: Array.from(allFeaturesSet).sort(),
      drivers: Array.from(allDriversSet).sort(),
      featureCounts,
      driverCounts,
    };
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const driverDisplay = getDriverDisplayName(item.driver);

      const matchesSearch =
        item.make.toLowerCase().includes(search.toLowerCase()) ||
        item.model.toLowerCase().includes(search.toLowerCase()) ||
        driverDisplay.toLowerCase().includes(search.toLowerCase());

      const matchesFeatures =
        selectedFeatures.length === 0 ||
        selectedFeatures.every((f) => item.features.includes(f));

      const matchesDrivers =
        selectedDrivers.length === 0 || selectedDrivers.includes(driverDisplay);

      return matchesSearch && matchesFeatures && matchesDrivers;
    });
  }, [data, search, selectedFeatures, selectedDrivers]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage,
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const toggleFeature = (feature: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(feature)
        ? prev.filter((f) => f !== feature)
        : [...prev, feature],
    );
    setPage(1);
  };

  const toggleDriver = (driver: string) => {
    setSelectedDrivers((prev) =>
      prev.includes(driver)
        ? prev.filter((d) => d !== driver)
        : [...prev, driver],
    );
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedFeatures([]);
    setSelectedDrivers([]);
    setPage(1);
  };

  const activeFilterCount = selectedFeatures.length + selectedDrivers.length;
  const isClearDisabled = !search && activeFilterCount === 0;

  // Helper to check if row has any detailed content
  const hasDetails = (item: Treadmill) => {
    return (
      item.sharedNotes.length > 0 ||
      (item.vendorApps && item.vendorApps.length > 0) ||
      !!item.source?.url
    );
  };

  return (
    <div className="flex flex-col gap-4 not-content text-sm font-sans mt-6">
      {/* Controls Header */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search Bar */}
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search make, model..."
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-500 hover:border-slate-600"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* Multi-Select Filter */}
        <div className="relative min-w-[200px]" ref={filterRef}>
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`w-full flex items-center justify-between bg-slate-900/50 border rounded-lg py-2 pl-3 pr-3 text-slate-200 transition-colors ${isFilterOpen ? "border-blue-500 ring-1 ring-blue-500/50" : "border-slate-700 hover:border-slate-600"}`}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span className="truncate">
                {activeFilterCount === 0
                  ? "Filter"
                  : `${activeFilterCount} active`}
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${isFilterOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Dropdown Menu */}
          {isFilterOpen && (
            <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/50">
              <div className="max-h-[60vh] overflow-y-auto">
                {/* Features Section */}
                <div className="sticky top-0 bg-slate-900 p-2 border-b border-slate-800 z-10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                    Features
                  </span>
                </div>
                <div className="p-1">
                  {stats.features.map((f) => (
                    <label
                      key={f}
                      className="flex items-center justify-between px-2 py-2 hover:bg-slate-800 rounded cursor-pointer group transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleFeature(f);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedFeatures.includes(f) ? "bg-blue-600 border-blue-600" : "border-slate-600 group-hover:border-slate-500"}`}
                        >
                          {selectedFeatures.includes(f) && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="3"
                                d="M5 13l4 4L19 7"
                              ></path>
                            </svg>
                          )}
                        </div>
                        <span className="text-slate-300 text-sm group-hover:text-slate-200 transition-colors">
                          {FEATURE_LABELS[f] || f}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 tabular-nums">
                        ({stats.featureCounts[f]})
                      </span>
                    </label>
                  ))}
                </div>

                {/* Drivers Section */}
                <div className="sticky top-0 bg-slate-900 p-2 border-y border-slate-800 z-10 mt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                    Drivers
                  </span>
                </div>
                <div className="p-1">
                  {stats.drivers.map((d) => (
                    <label
                      key={d}
                      className="flex items-center justify-between px-2 py-2 hover:bg-slate-800 rounded cursor-pointer group transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleDriver(d);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedDrivers.includes(d) ? "bg-blue-600 border-blue-600" : "border-slate-600 group-hover:border-slate-500"}`}
                        >
                          {selectedDrivers.includes(d) && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="3"
                                d="M5 13l4 4L19 7"
                              ></path>
                            </svg>
                          )}
                        </div>
                        <span className="text-slate-300 text-sm group-hover:text-slate-200 transition-colors">
                          {d}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 tabular-nums">
                        ({stats.driverCounts[d]})
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {activeFilterCount > 0 && (
                <div className="p-2 border-t border-slate-800 bg-slate-900">
                  <button
                    onClick={clearFilters}
                    className="w-full text-xs text-center text-slate-400 hover:text-slate-200 py-1 transition-colors"
                  >
                    Clear selection
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Global Clear Button - Always visible, disabled state handled */}
        <button
          onClick={clearFilters}
          disabled={isClearDisabled}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors whitespace-nowrap ${
            isClearDisabled
              ? "bg-slate-900/30 border-slate-800 text-slate-600 cursor-not-allowed"
              : "bg-slate-900/50 hover:bg-slate-800 border-slate-700 text-slate-300 hover:text-white"
          }`}
        >
          <X className={`w-4 h-4 ${isClearDisabled ? "opacity-50" : ""}`} />
          <span className="hidden md:inline">Clear</span>
        </button>
      </div>

      {/* Table */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold w-[20%]">Make</th>
                <th className="p-4 font-semibold w-[25%]">Model</th>
                <th className="p-4 font-semibold w-[20%]">Driver</th>
                <th className="p-4 font-semibold w-[35%]">Features</th>
                <th className="p-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {paginatedData.length > 0 ? (
                paginatedData.map((item) => {
                  const canExpand = hasDetails(item);
                  return (
                    <React.Fragment key={item.id}>
                      <tr
                        className={`transition-colors group ${
                          canExpand ? "cursor-pointer" : ""
                        } ${
                          expandedRow === item.id
                            ? "bg-slate-800/60"
                            : "hover:bg-slate-800/40"
                        }`}
                        onClick={() =>
                          canExpand &&
                          setExpandedRow(
                            expandedRow === item.id ? null : item.id,
                          )
                        }
                      >
                        <td className="p-4 font-medium text-slate-200">
                          <div className="flex items-center gap-2">
                            {item.make}
                            {isDeveloperChoice(item) && (
                              <span
                                title="The treadmill model used by the developer"
                                className="inline-flex items-center justify-center text-amber-400"
                              >
                                <Star className="w-3 h-3 fill-current" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-slate-300 group-hover:text-slate-100 transition-colors">
                          {item.model}
                        </td>
                        <td className="p-4">
                          <Badge
                            text={getDriverDisplayName(item.driver)}
                            variant={
                              getDriverDisplayName(item.driver) ===
                              "Generic FTMS"
                                ? "tip"
                                : "success"
                            }
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1.5">
                            {item.features.map((f) => (
                              <span
                                key={f}
                                className="text-slate-400 text-xs group-hover:text-slate-300 transition-colors"
                              >
                                {FEATURE_LABELS[f] || f}
                                {item.features.indexOf(f) !==
                                item.features.length - 1
                                  ? ", "
                                  : ""}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          {canExpand && (
                            <button
                              className={`p-1 rounded-full w-6 h-6 flex items-center justify-center transition-all ${
                                expandedRow === item.id
                                  ? "bg-slate-700/50 text-blue-400 rotate-180"
                                  : "hover:bg-slate-700/30 text-slate-500 group-hover:text-blue-400"
                              }`}
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                      {/* Expanded Details Row */}
                      {expandedRow === item.id && canExpand && (
                        <tr className="bg-slate-800/30 border-b border-slate-800/50 animate-in fade-in duration-200">
                          <td colSpan={5} className="px-4 pb-4 pt-0">
                            <div className="ml-4 pl-4 border-l border-blue-500/30 py-2 flex flex-col gap-4">
                              {/* Developer's Choice Note */}
                              {isDeveloperChoice(item) && (
                                <div className="flex items-start gap-2 p-3 bg-gradient-to-r from-amber-950/30 to-orange-950/20 border border-amber-900/30 rounded-lg">
                                  <Star className="w-4 h-4 text-amber-400 fill-current flex-shrink-0 mt-0.5" />
                                  <div>
                                    <h4 className="font-semibold text-amber-400 text-sm">
                                      Developer's Choice
                                    </h4>
                                    <p className="text-slate-400 text-sm mt-1">
                                      This is the treadmill that Raphii (the
                                      developer of VRTI) personally uses.
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Notes Section */}
                              {item.sharedNotes.length > 0 && (
                                <div>
                                  <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-wider mb-2">
                                    Details & Notes
                                  </h4>
                                  <ul className="list-disc list-inside space-y-1 text-slate-300 text-sm marker:text-slate-500">
                                    {item.sharedNotes.map((note, idx) => (
                                      <li key={idx}>{note}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Vendor Apps Section */}
                              {item.vendorApps &&
                                item.vendorApps.length > 0 && (
                                  <div>
                                    <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-wider mb-2">
                                      Vendor Apps
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {item.vendorApps.map((app, idx) => (
                                        <Badge
                                          key={idx}
                                          text={app.name}
                                          variant={
                                            app.supported
                                              ? "default"
                                              : "caution"
                                          }
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )}

                              {/* Source Link Section */}
                              {item.source?.url && (
                                <div className="mt-1">
                                  <a
                                    href={item.source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline transition-colors group/link"
                                  >
                                    Source Link
                                    <span className="opacity-0 -translate-y-0.5 translate-x-0.5 group-hover/link:opacity-100 group-hover/link:translate-y-0 group-hover/link:translate-x-0 transition-all">
                                      ↗
                                    </span>
                                  </a>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No treadmills found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-800 bg-slate-900/30">
            <div className="text-xs text-slate-500">
              Showing {filteredData.length} treadmills
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="p-2 rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-400"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded text-xs font-medium transition-all ${
                        page === p
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                          : "text-slate-400 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
              </div>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="p-2 rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-slate-400"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
