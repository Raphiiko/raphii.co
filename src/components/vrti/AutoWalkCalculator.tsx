import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { Footprints, Calculator, Gamepad2, RotateCcw } from "lucide-react";

const TreadmillIcon = () => <Footprints size={16} />;
const VRTIIcon = () => <Calculator size={16} />;
const GameControllerIcon = () => <Gamepad2 size={16} />;
const ResetIcon = () => <RotateCcw size={14} />;

function useSpeedUnit() {
  return useMemo(() => {
    try {
      const locale = navigator.language || "en-US";
      return locale === "en-US" ? "mph" : "km/h";
    } catch {
      return "km/h";
    }
  }, []);
}

function LED({ active }: { active: boolean }) {
  return (
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: active
          ? "radial-gradient(circle, rgba(255,255,255,0.9) 30%, #fff 60%)"
          : "rgba(255,255,255,0.15)",
        boxShadow: active
          ? "0 0 6px rgba(255,255,255,0.8), 0 0 10px rgba(255,255,255,0.5)"
          : "none",
        transition: "all 0.15s ease",
      }}
    />
  );
}

function SpeedOutput({ value }: { value: number }) {
  const pct = Math.min(Math.max(value, 0), 1) * 100;
  const color = pct > 88 ? "#ef4444" : pct > 75 ? "#f59e0b" : "#22c55e";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
      }}
    >
      <div
        style={{
          width: "100%",
          height: 10,
          borderRadius: 5,
          background: "rgba(255,255,255,0.1)",
          overflow: "hidden",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            transition: "width 0.15s ease, background 0.15s ease",
            boxShadow: `0 0 8px ${color}`,
          }}
        />
      </div>
      <span
        style={{
          fontSize: 20,
          fontWeight: 700,
          color,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

function Arrow() {
  return (
    <div
      className="awc-arrow"
      style={{
        color: "rgba(255,255,255,0.4)",
        fontSize: 18,
        padding: "0 6px",
      }}
    >
      →
    </div>
  );
}

function Section({
  title,
  icon,
  children,
  bgColor,
  onReset,
  showReset,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  bgColor: string;
  onReset?: () => void;
  showReset?: boolean;
}) {
  return (
    <div
      style={{
        minWidth: 150,
        height: "100%",
        padding: 10,
        borderRadius: 8,
        background: bgColor,
        border: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          fontSize: 10,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: "rgba(255,255,255,0.5)",
          marginBottom: 8,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {icon}
          {title}
        </div>
        {onReset && (
          <button
            onClick={onReset}
            disabled={!showReset}
            style={{
              width: 20,
              height: 20,
              borderRadius: 4,
              border: "none",
              background: "transparent",
              color: showReset ? "rgba(255,255,255,0.4)" : "transparent",
              cursor: showReset ? "pointer" : "default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              transition: "color 0.15s ease",
              opacity: showReset ? 1 : 0,
              pointerEvents: showReset ? "auto" : "none",
            }}
            onMouseEnter={(e) => {
              if (showReset) {
                e.currentTarget.style.color = "rgba(255,255,255,0.8)";
              }
            }}
            onMouseLeave={(e) => {
              if (showReset) {
                e.currentTarget.style.color = "rgba(255,255,255,0.4)";
              }
            }}
            title="Reset to default"
          >
            <ResetIcon />
          </button>
        )}
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}

const MAX_SPEED = 10.0;
const ANIMATION_SPEED = 0.01;
const MIN_FINAL_SPEED = 0.1;
const TEMP_OFFSET_AMOUNT = 0.25;
const MULTIPLIER_SNAP_THRESHOLD = 0.08;

export default function AutoWalkCalculator() {
  const unit = useSpeedUnit();
  const [targetSpeed, setTargetSpeed] = useState(5.0);
  const [currentSpeed, setCurrentSpeed] = useState(5.0);
  const [multiplier, setMultiplier] = useState(1.0);
  const [overrideIndex, setOverrideIndex] = useState<number>(-1);
  const [tempOffset, setTempOffset] = useState(0);
  const [holdingOffset, setHoldingOffset] = useState<"down" | "up" | null>(
    null,
  );

  const presets = [0.25, 0.5, 0.75, 1.0] as const;
  const override = overrideIndex >= 0 ? presets[overrideIndex] : null;
  const isOverride = override !== null;

  const animationRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const animate = () => {
      setCurrentSpeed((prev) => {
        const diff = targetSpeed - prev;
        if (Math.abs(diff) < 0.05) return targetSpeed;
        return prev + diff * ANIMATION_SPEED;
      });
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [targetSpeed]);

  const baseSpeed = Math.min(currentSpeed / MAX_SPEED, 1);
  const postMultiplierSpeed =
    override !== null
      ? targetSpeed >= 0.0
        ? override
        : Math.min(baseSpeed, override)
      : baseSpeed * multiplier;

  // Match Rust backend logic: prevent offset from bringing final speed below 0.1
  const effectiveOffset =
    tempOffset < 0
      ? postMultiplierSpeed >= MIN_FINAL_SPEED
        ? Math.max(tempOffset, MIN_FINAL_SPEED - postMultiplierSpeed)
        : 0.0
      : tempOffset;
  const finalSpeed = Math.max(
    0,
    Math.min(1, postMultiplierSpeed + effectiveOffset),
  );

  const handleOverrideClick = useCallback(() => {
    setOverrideIndex((prev) => (prev >= 3 ? -1 : prev + 1));
  }, []);

  // Snap multiplier to 1.0 when close for easier precise adjustment
  const handleMultiplierChange = useCallback((v: number) => {
    if (Math.abs(v - 1.0) < MULTIPLIER_SNAP_THRESHOLD) {
      setMultiplier(1.0);
    } else {
      setMultiplier(v);
    }
  }, []);

  const handleSlowDown = useCallback(() => {
    setTempOffset(-TEMP_OFFSET_AMOUNT);
    setHoldingOffset("down");
  }, []);
  const handleCatchUp = useCallback(() => {
    setTempOffset(TEMP_OFFSET_AMOUNT);
    setHoldingOffset("up");
  }, []);
  const handleOffsetRelease = useCallback(() => {
    setTempOffset(0);
    setHoldingOffset(null);
  }, []);

  const handleResetTreadmill = useCallback(() => {
    setTargetSpeed(5.0);
  }, []);

  const handleResetVRTI = useCallback(() => {
    setMultiplier(1.0);
    setOverrideIndex(-1);
  }, []);

  return (
    <div
      className="awc-root"
      style={{
        all: "initial",
        display: "block",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#fff",
      }}
    >
      <style>{`
        .awc-root {
          all: initial;
          display: block;
          font-family: system-ui, -apple-system, sans-serif;
          color: #fff;
        }

        .awc-root *:not(.awc-grid):not(.awc-arrow):not(svg):not(svg *) {
          all: revert;
          box-sizing: border-box;
        }

        .awc-root svg {
          display: inline-block;
          vertical-align: middle;
        }

        .awc-root input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .awc-root input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .awc-root input[type="range"]:disabled::-webkit-slider-thumb {
          background: #666;
          cursor: not-allowed;
        }
        .awc-root input[type="range"]:disabled::-moz-range-thumb {
          background: #666;
          cursor: not-allowed;
        }

        /* Desktop layout */
        .awc-root .awc-grid {
          display: grid !important;
          grid-template-columns: 1fr auto 1fr auto 1fr;
          align-items: stretch;
          gap: 6px;
          box-sizing: border-box;
        }

        .awc-root .awc-arrow {
          display: flex !important;
          align-items: center;
          justify-content: center;
          transform: rotate(0deg);
          box-sizing: border-box;
        }

        /* Mobile layout */
        @media (max-width: 768px) {
          .awc-root .awc-grid {
            grid-template-columns: 1fr !important;
            grid-template-rows: auto auto auto auto auto;
          }

          .awc-root .awc-arrow {
            transform: rotate(90deg);
            padding: 6px 0;
          }
        }
      `}</style>
      <div className="awc-grid">
        <Section
          title="Treadmill"
          icon={<TreadmillIcon />}
          bgColor="rgba(59, 130, 246, 0.1)"
          onReset={handleResetTreadmill}
          showReset={targetSpeed !== 5.0}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              flex: 1,
              opacity: isOverride ? 0.4 : 1,
              transition: "opacity 0.2s",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  fontSize: 11,
                }}
              >
                <span style={{ color: "rgba(255,255,255,0.6)" }}>
                  Treadmill Speed
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    color: "#fff",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {targetSpeed.toFixed(1)}{" "}
                  <span
                    style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}
                  >
                    {unit}
                  </span>
                </span>
              </div>
              <div style={{ position: "relative", padding: "4px 0" }}>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={0.5}
                  value={targetSpeed}
                  onChange={(e) => setTargetSpeed(parseFloat(e.target.value))}
                  disabled={isOverride}
                  style={{
                    width: "100%",
                    height: 6,
                    borderRadius: 3,
                    appearance: "none",
                    background: "rgba(255,255,255,0.15)",
                    cursor: isOverride ? "not-allowed" : "pointer",
                    accentColor: "rgb(59, 130, 246)",
                  }}
                />
              </div>
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "8px 0",
              }}
            >
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: "#fff",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {currentSpeed.toFixed(1)}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: "rgba(255,255,255,0.4)",
                  marginTop: 2,
                }}
              >
                {unit}
              </span>
            </div>
          </div>
        </Section>

        <Arrow />

        <Section
          title="VRTI"
          icon={<VRTIIcon />}
          bgColor="rgba(139, 92, 246, 0.1)"
          onReset={handleResetVRTI}
          showReset={multiplier !== 1.0 || overrideIndex !== -1}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              flex: 1,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                flexShrink: 0,
                opacity: isOverride ? 0.4 : 1,
                transition: "opacity 0.2s",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  fontSize: 11,
                }}
              >
                <span style={{ color: "rgba(255,255,255,0.6)" }}>
                  Auto Walk
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    color: "#fff",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {multiplier.toFixed(2)}x
                </span>
              </div>
              <div style={{ position: "relative", padding: "4px 0" }}>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={multiplier}
                  onChange={(e) =>
                    handleMultiplierChange(parseFloat(e.target.value))
                  }
                  disabled={isOverride}
                  style={{
                    width: "100%",
                    height: 6,
                    borderRadius: 3,
                    appearance: "none",
                    background: "rgba(255,255,255,0.15)",
                    cursor: isOverride ? "not-allowed" : "pointer",
                    accentColor: "rgb(139, 92, 246)",
                  }}
                />
                {/* Center tick mark at 1.0x (offset accounts for slider thumb width) */}
                <div
                  style={{
                    position: "absolute",
                    top: 1,
                    left: "calc(50% + 2px)",
                    transform: "translateX(-1px)",
                    width: 2,
                    height: 14,
                    background: "rgba(255,255,255,0.3)",
                    pointerEvents: "none",
                    borderRadius: 1,
                  }}
                />
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                flex: 1,
                justifyContent: "flex-end",
                minHeight: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>
                  Override
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.7)",
                  }}
                >
                  {isOverride ? `${override * 100}%` : "Off"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={handleOverrideClick}
                  style={{
                    width: 44,
                    height: 28,
                    borderRadius: 4,
                    border: "none",
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: "pointer",
                    background: isOverride
                      ? "rgb(139, 92, 246)"
                      : "rgba(255,255,255,0.15)",
                    color: isOverride ? "#000" : "rgba(255,255,255,0.6)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {isOverride ? "ON" : "OFF"}
                </button>
                <div style={{ display: "flex", gap: 6 }}>
                  {presets.map((p, i) => (
                    <LED
                      key={p}
                      active={overrideIndex >= i && overrideIndex !== -1}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Section>

        <Arrow />

        <Section
          title="VRChat / Game"
          icon={<GameControllerIcon />}
          bgColor="rgba(34, 197, 94, 0.1)"
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              flex: 1,
            }}
          >
            <div style={{ flex: 1 }}>
              <span
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.6)",
                  display: "block",
                  marginBottom: 6,
                }}
              >
                Walk Speed
              </span>
              <SpeedOutput value={finalSpeed} />
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 9,
                  color: "rgba(255,255,255,0.4)",
                  textAlign: "center",
                }}
              >
                (Hold)
              </span>
              <div style={{ display: "flex", gap: 6, alignItems: "stretch" }}>
                <button
                  onMouseDown={handleSlowDown}
                  onMouseUp={handleOffsetRelease}
                  onMouseLeave={handleOffsetRelease}
                  onTouchStart={handleSlowDown}
                  onTouchEnd={handleOffsetRelease}
                  style={{
                    flex: 1,
                    height: 28,
                    borderRadius: 4,
                    border: "none",
                    fontSize: 9,
                    fontWeight: 500,
                    cursor: "pointer",
                    background:
                      holdingOffset === "down"
                        ? "rgb(34, 197, 94)"
                        : "rgba(255,255,255,0.15)",
                    color:
                      holdingOffset === "down"
                        ? "#000"
                        : "rgba(255,255,255,0.6)",
                    transition: "all 0.1s ease",
                  }}
                >
                  Slow Down
                </button>
                <button
                  onMouseDown={handleCatchUp}
                  onMouseUp={handleOffsetRelease}
                  onMouseLeave={handleOffsetRelease}
                  onTouchStart={handleCatchUp}
                  onTouchEnd={handleOffsetRelease}
                  style={{
                    flex: 1,
                    height: 28,
                    borderRadius: 4,
                    border: "none",
                    fontSize: 9,
                    fontWeight: 500,
                    cursor: "pointer",
                    background:
                      holdingOffset === "up"
                        ? "rgb(34, 197, 94)"
                        : "rgba(255,255,255,0.15)",
                    color:
                      holdingOffset === "up" ? "#000" : "rgba(255,255,255,0.6)",
                    transition: "all 0.1s ease",
                  }}
                >
                  Catch Up
                </button>
              </div>
            </div>
          </div>
        </Section>
      </div>
    </div>
  );
}
