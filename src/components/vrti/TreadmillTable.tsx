import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  ChevronDown,
  Star,
} from "lucide-react";

interface CompatibilityData {
  experimental?: boolean;
  driver?: string[];
  notes?: string[];
}

interface VendorApp {
  name: string;
  supported: boolean;
  notes?: string[];
}

interface TreadmillSource {
  name?: string;
  url?: string;
}

interface TreadmillWeight {
  maxUser: number;
  unit: string;
}

interface Treadmill {
  id: string;
  make: string;
  model: string;
  features: string[];
  sharedNotes?: string[];
  vendorApps?: VendorApp[];
  source?: TreadmillSource;
  weight?: TreadmillWeight;
  vrtiData?: CompatibilityData;
  fitOscData?: CompatibilityData;
}

interface TreadmillTableProps {
  data: Treadmill[];
}

interface TreadmillDriverOption {
  driver: string;
  label: string;
  experimental?: boolean;
}

interface DriverPresentation {
  code: string;
  label: string;
  badgeClassName: string;
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

const BLUETOOTH_TREADMILL_DRIVER_OPTIONS: TreadmillDriverOption[] = [
  {
    driver: "FTMS",
    label: "Generic FTMS",
  },
  {
    driver: "KINGSMITH_FE00",
    label: "KingSmith Type A",
  },
  {
    driver: "KINGSMITH_1234",
    label: "KingSmith Type B",
  },
  {
    driver: "PITPAT_FBA0",
    label: "PitPat",
  },
  {
    driver: "FTMS_UREVO_HYBRID",
    label: "UREVO Hybrid",
  },
  {
    driver: "FTMS_KINGSMITH_G15",
    label: "KingSmith G15",
  },
  {
    driver: "FTMS_KINGSMITH_24E2",
    label: "KingSmith Type C",
  },
  {
    driver: "ESLINKER_YPOO",
    label: "ESLinker",
  },
];

const DRIVER_OPTIONS = Object.fromEntries(
  BLUETOOTH_TREADMILL_DRIVER_OPTIONS.map((option) => [option.driver, option]),
) as Record<string, TreadmillDriverOption>;

const DRIVER_LABELS: Record<string, string> = {
  ...Object.fromEntries(
    BLUETOOTH_TREADMILL_DRIVER_OPTIONS.map((option) => [
      option.driver,
      option.label,
    ]),
  ),
  GENERIC: "Generic FTMS",
  "Kingsmith Walking Pad": "KingSmith Type A",
  WALKINGPAD: "KingSmith Type A",
};

const UNSUPPORTED_DRIVER_LABEL = "No VRTI Driver";
const UNSUPPORTED_DRIVER_CODE = "UNSUPPORTED";

const DRIVER_BADGE_STYLES: Record<string, string> = {
  FTMS: "bg-fuchsia-950/60 text-fuchsia-200 border-fuchsia-700/70",
  ESLINKER_YPOO: "bg-violet-950/60 text-violet-200 border-violet-700/70",
  FTMS_KINGSMITH_24E2:
    "bg-orange-950/60 text-orange-200 border-orange-700/70",
  FTMS_KINGSMITH_G15: "bg-rose-950/60 text-rose-200 border-rose-700/70",
  FTMS_UREVO_HYBRID: "bg-cyan-950/60 text-cyan-200 border-cyan-700/70",
  GENERIC: "bg-fuchsia-950/60 text-fuchsia-200 border-fuchsia-700/70",
  KINGSMITH_1234: "bg-sky-950/60 text-sky-200 border-sky-700/70",
  KINGSMITH_FE00: "bg-emerald-950/60 text-emerald-200 border-emerald-700/70",
  PITPAT_FBA0: "bg-amber-950/60 text-amber-200 border-amber-700/70",
  UNSUPPORTED: "bg-red-950/50 text-red-300 border-red-900",
  WALKINGPAD: "bg-emerald-950/60 text-emerald-200 border-emerald-700/70",
};

const getDriverDisplayName = (driver: string) =>
  DRIVER_LABELS[driver] ?? driver.split("_").join(" ");

const isExperimentalDriver = (driver: string) =>
  DRIVER_OPTIONS[driver]?.experimental === true;

const getVRTIDrivers = (item: Treadmill) => item.vrtiData?.driver ?? [];

const getDriverPresentations = (item: Treadmill): DriverPresentation[] => {
  const drivers = getVRTIDrivers(item);

  return drivers.length > 0
    ? drivers.map((driver) => ({
        code: driver,
        label: getDriverDisplayName(driver),
        badgeClassName:
          DRIVER_BADGE_STYLES[driver] ??
          "bg-slate-800 text-slate-300 border-slate-700",
      }))
    : [
        {
          code: UNSUPPORTED_DRIVER_CODE,
          label: UNSUPPORTED_DRIVER_LABEL,
          badgeClassName: DRIVER_BADGE_STYLES[UNSUPPORTED_DRIVER_CODE],
        },
      ];
};

const getDriverBadgeVariant = (
  driverLabel: string,
  experimental: boolean,
): "default" | "success" | "tip" | "caution" | "danger" => {
  if (driverLabel === UNSUPPORTED_DRIVER_LABEL) {
    return "danger";
  }

  if (experimental) {
    return "success";
  }

  if (driverLabel === "Generic FTMS") {
    return "tip";
  }

  return "success";
};

const hasExperimentalOnlySupport = (item: Treadmill) => {
  const drivers = getVRTIDrivers(item);

  return (
    drivers.length > 0 &&
    (item.vrtiData?.experimental === true ||
      drivers.every((driver) => isExperimentalDriver(driver)))
  );
};

const LB_PER_KG = 2.20462;

const formatWeightValue = (value: number) => {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
};

const getWeightDisplay = (weight: TreadmillWeight) => {
  const unit = weight.unit.trim().toLowerCase();

  if (unit === "kg") {
    const pounds = weight.maxUser * LB_PER_KG;
    return `${formatWeightValue(weight.maxUser)} kg / ${formatWeightValue(pounds)} lb`;
  }

  if (unit === "lb" || unit === "lbs") {
    const kilograms = weight.maxUser / LB_PER_KG;
    return `${formatWeightValue(kilograms)} kg / ${formatWeightValue(weight.maxUser)} lb`;
  }

  return `${formatWeightValue(weight.maxUser)} ${weight.unit}`;
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
  className,
}: {
  text: string;
  variant?: "default" | "success" | "tip" | "caution" | "danger";
  className?: string;
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
      className={`text-xs font-medium px-2 py-0.5 rounded border whitespace-nowrap ${className ?? colors[variant] ?? colors.default}`}
    >
      {text}
    </span>
  );
};

const ExperimentalWarningIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    className="w-3.5 h-3.5"
    fill="currentColor"
  >
    <path
      d="M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z"
      fill="currentColor"
    />
  </svg>
);

export default function TreadmillTable({ data }: TreadmillTableProps) {
  const [search, setSearch] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  const supportedData = useMemo(
    () =>
      data.filter(
        (item) =>
          getVRTIDrivers(item).length > 0 && !hasExperimentalOnlySupport(item),
      ),
    [data],
  );

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

    supportedData.forEach((treadmill) => {
      treadmill.features.forEach((feature) => {
        allFeaturesSet.add(feature);
        featureCounts[feature] = (featureCounts[feature] || 0) + 1;
      });

      getDriverPresentations(treadmill).forEach((driver) => {
        allDriversSet.add(driver.label);
        driverCounts[driver.label] = (driverCounts[driver.label] || 0) + 1;
      });
    });

    return {
      features: Array.from(allFeaturesSet).sort(),
      drivers: Array.from(allDriversSet).sort(),
      featureCounts,
      driverCounts,
    };
  }, [supportedData]);

  const filteredData = useMemo(() => {
    return supportedData.filter((item) => {
      const driverPresentations = getDriverPresentations(item);
      const normalizedSearch = search.toLowerCase();
      const sourceName = item.source?.name?.toLowerCase() ?? "";

      const matchesSearch =
        item.make.toLowerCase().includes(normalizedSearch) ||
        item.model.toLowerCase().includes(normalizedSearch) ||
        sourceName.includes(normalizedSearch) ||
        driverPresentations.some((driver) =>
          driver.label.toLowerCase().includes(normalizedSearch),
        );

      const matchesFeatures =
        selectedFeatures.length === 0 ||
        selectedFeatures.every((feature) => item.features.includes(feature));

      const matchesDrivers =
        selectedDrivers.length === 0 ||
        driverPresentations.some((driver) =>
          selectedDrivers.includes(driver.label),
        );

      return matchesSearch && matchesFeatures && matchesDrivers;
    });
  }, [search, selectedFeatures, selectedDrivers, supportedData]);

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
        ? prev.filter((current) => current !== feature)
        : [...prev, feature],
    );
    setPage(1);
  };

  const toggleDriver = (driver: string) => {
    setSelectedDrivers((prev) =>
      prev.includes(driver)
        ? prev.filter((current) => current !== driver)
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

  const hasDetails = (item: Treadmill) => {
    const hasVRTINotes = (item.vrtiData?.notes?.length ?? 0) > 0;

    return (
      (item.sharedNotes?.length ?? 0) > 0 ||
      !!item.source?.url ||
      !!item.weight ||
      !!item.vrtiData?.experimental ||
      hasVRTINotes ||
      getVRTIDrivers(item).length > 1
    );
  };

  return (
    <div className="flex flex-col gap-4 not-content text-sm font-sans mt-6">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search make, model..."
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 outline-none transition-all placeholder:text-slate-500 hover:border-slate-600"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>

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

          {isFilterOpen && (
            <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/50">
              <div className="max-h-[60vh] overflow-y-auto">
                <div className="sticky top-0 bg-slate-900 p-2 border-b border-slate-800 z-10">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                    Features
                  </span>
                </div>
                <div className="p-1">
                  {stats.features.map((feature) => (
                    <label
                      key={feature}
                      className="flex items-center justify-between px-2 py-2 hover:bg-slate-800 rounded cursor-pointer group transition-colors"
                      onClick={(event) => {
                        event.preventDefault();
                        toggleFeature(feature);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedFeatures.includes(feature) ? "bg-blue-600 border-blue-600" : "border-slate-600 group-hover:border-slate-500"}`}
                        >
                          {selectedFeatures.includes(feature) && (
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
                          {FEATURE_LABELS[feature] || feature}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 tabular-nums">
                        ({stats.featureCounts[feature]})
                      </span>
                    </label>
                  ))}
                </div>

                <div className="sticky top-0 bg-slate-900 p-2 border-y border-slate-800 z-10 mt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">
                    Drivers
                  </span>
                </div>
                <div className="p-1">
                  {stats.drivers.map((driver) => (
                    <label
                      key={driver}
                      className="flex items-center justify-between px-2 py-2 hover:bg-slate-800 rounded cursor-pointer group transition-colors"
                      onClick={(event) => {
                        event.preventDefault();
                        toggleDriver(driver);
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedDrivers.includes(driver) ? "bg-blue-600 border-blue-600" : "border-slate-600 group-hover:border-slate-500"}`}
                        >
                          {selectedDrivers.includes(driver) && (
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
                          {driver}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 tabular-nums">
                        ({stats.driverCounts[driver]})
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
                  const driverPresentations = getDriverPresentations(item);
                  const isExperimental = item.vrtiData?.experimental ?? false;
                  const isExperimentalOnly = hasExperimentalOnlySupport(item);
                  const combinedNotes = [
                    ...(item.sharedNotes ?? []),
                    ...(item.vrtiData?.notes ?? []),
                  ];

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
                          <div className="flex items-center gap-2">
                            {isExperimentalOnly && (
                              <span
                                title="Experimental Support"
                                className="inline-flex items-center justify-center text-amber-400"
                              >
                                <ExperimentalWarningIcon />
                              </span>
                            )}
                            <span>{item.model}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1.5">
                            {driverPresentations.map((driver) => (
                              <Badge
                                key={`${item.id}-${driver.code}`}
                                text={driver.label}
                                className={driver.badgeClassName}
                                variant={getDriverBadgeVariant(
                                  driver.label,
                                  isExperimental,
                                )}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1.5">
                            {item.features.map((feature) => (
                              <span
                                key={feature}
                                className="text-slate-400 text-xs group-hover:text-slate-300 transition-colors"
                              >
                                {FEATURE_LABELS[feature] || feature}
                                {item.features.indexOf(feature) !==
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
                      {expandedRow === item.id && canExpand && (
                        <tr className="bg-slate-800/30 border-b border-slate-800/50 animate-in fade-in duration-200">
                          <td colSpan={5} className="px-4 pb-4 pt-0">
                            <div className="ml-4 pl-4 border-l border-blue-500/30 py-2 flex flex-col gap-4">
                              {isDeveloperChoice(item) && (
                                <div className="flex items-start gap-2 p-3 bg-gradient-to-r from-amber-950/30 to-orange-950/20 border border-amber-900/30 rounded-lg">
                                  <Star className="w-4 h-4 text-amber-400 fill-current flex-shrink-0 mt-0.5" />
                                  <div>
                                    <h4 className="font-semibold text-amber-400 text-sm">
                                      Developer&apos;s Choice
                                    </h4>
                                    <p className="text-slate-400 text-sm mt-1">
                                      This is the treadmill currently used by
                                      the Developer.
                                    </p>
                                  </div>
                                </div>
                              )}

                              {item.vrtiData && (
                                <div>
                                  <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-wider mb-2">
                                    VRTI Driver(s)
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {driverPresentations.map((driver) => (
                                      <Badge
                                        key={`${item.id}-details-${driver.code}`}
                                        text={driver.label}
                                        className={driver.badgeClassName}
                                        variant={getDriverBadgeVariant(
                                          driver.label,
                                          isExperimental,
                                        )}
                                      />
                                    ))}
                                  </div>
                                  {isExperimental && (
                                    <p className="text-amber-300 text-sm italic mt-2">
                                      This treadmill still only has experimental
                                      support.
                                    </p>
                                  )}
                                </div>
                              )}

                              {item.weight && (
                                <div>
                                  <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-wider mb-2">
                                    Specifications
                                  </h4>
                                  <p className="text-slate-300 text-sm">
                                    Max user weight:{" "}
                                    {getWeightDisplay(item.weight)}
                                  </p>
                                </div>
                              )}

                              {combinedNotes.length > 0 && (
                                <div>
                                  <h4 className="font-bold text-slate-400 text-[10px] uppercase tracking-wider mb-2">
                                    Details & Notes
                                  </h4>
                                  <ul className="list-disc pl-5 space-y-1 text-slate-300 text-sm marker:text-slate-500">
                                    {combinedNotes.map((note, idx) => (
                                      <li key={idx}>{note}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {(item.source?.url || item.source?.name) && (
                                <div className="mt-1">
                                  {item.source?.url ? (
                                    <a
                                      href={item.source.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                                    >
                                      {item.source.name ?? "Source"}
                                    </a>
                                  ) : (
                                    <span className="text-xs text-slate-400">
                                      {item.source?.name}
                                    </span>
                                  )}
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
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
                  (pageNumber) => (
                    <button
                      key={pageNumber}
                      onClick={() => handlePageChange(pageNumber)}
                      className={`w-8 h-8 flex items-center justify-center rounded text-xs font-medium transition-all ${
                        page === pageNumber
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                          : "text-slate-400 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      {pageNumber}
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
