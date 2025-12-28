import React from "react";
import { Info } from "lucide-react";

interface Adapter {
  model: string;
  status: "Recommended" | "Tested";
  chipset?: string;
}

const data: Adapter[] = [
  { model: "TP-Link UB500 Plus", status: "Recommended" },
  { model: "TP-Link UB500", status: "Tested" },
  { model: "Intel AX200", status: "Tested" },
  { model: "ASUS USB-BT500", status: "Tested" },
  { model: "MediaTek MT7922", status: "Tested" },
];

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

export default function BluetoothAdapterTable() {
  return (
    <div className="flex flex-col gap-4 not-content text-sm font-sans mt-4">
      {/* Table */}
      <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-900/30">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[400px]">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold w-2/3">Model</th>
                <th className="p-4 font-semibold w-1/3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {data.map((item, index) => (
                <tr
                  key={index}
                  className="hover:bg-slate-800/40 transition-colors group"
                >
                  <td className="p-4 font-medium text-slate-200">
                    {item.model}
                  </td>
                  <td className="p-4">
                    <Badge
                      text={item.status}
                      variant={
                        item.status === "Recommended" ? "success" : "default"
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
