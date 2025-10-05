import { useMemo, type ElementType } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Calculator, Flame, Activity, Waves, Target, Zap, Users, Brain, Compass } from "lucide-react";
import spaceBackground from "@/assets/space-background.jpg";

interface AnalysisSection {
  title: string;
  icon: ElementType;
  focus: string;
  summary: string;
  formulae: Array<{ label: string; expression: string; notes?: string }>;
}

const ImpactAnalysis = () => {
  const sections = useMemo<AnalysisSection[]>(
    () => [
      {
        title: "Kinetic Energy & Momentum",
        icon: Calculator,
        focus: "Initial energy budget",
        summary:
          "Impacts begin with enormous kinetic energy driven by asteroid mass and velocity. This energy sets the ceiling for all subsequent environmental effects.",
        formulae: [
          {
            label: "Kinetic Energy",
            expression: "E_k = 0.5 · m · v²",
            notes: "Mass derives from volume (4/3πr^3) scaled by assumed density (typically 3000 kg/m³)."
          },
          {
            label: "Momentum",
            expression: "p = m v",
            notes: "Momentum helps estimate impulse transferred to the crust and atmosphere."
          }
        ]
      },
      {
        title: "Oblique Entry Geometry",
        icon: Compass,
        focus: "Angle-dependent footprint",
        summary:
          "Atmospheric entry rarely occurs straight down. The ratio between vertical and horizontal velocity controls both the impact angle and the elongated blast footprint we render on the radar.",
        formulae: [
          {
            label: "Entry Angle",
            expression: "θ = arctan(v_vertical / v_horizontal)",
            notes: "v_vertical derives from orbital inclination, while v_horizontal lies in Earth’s local tangent plane."
          },
          {
            label: "Footprint Axis Ratio",
            expression: "a/b ≈ 1 / sin θ",
            notes: "Lower entry angles (small θ) stretch blast effects downrange, matching the elliptical overlays in the radar."
          }
        ]
      },
      {
        title: "Crater Scaling",
        icon: Target,
        focus: "Surface excavation",
        summary:
          "Crater radius grows sub-linearly with energy and depends on gravity and target composition. Empirical pi-scaling laws approximate the excavated cavity.",
        formulae: [
          {
            label: "Transient Crater Diameter",
            expression: "D_t = k_d · (E_k / (ρ_t g))^{1/4}",
            notes: "k_d ≈ 1.6 for rock targets, ρ_t is target density, g is surface gravity."
          },
          {
            label: "Final Crater Diameter",
            expression: "D_f = η D_t",
            notes: "Collapse factor η ranges 1.2–1.5 depending on rim slump and melt."
          }
        ]
      },
      {
        title: "Shockwave & Overpressure",
        icon: Activity,
        focus: "Atmospheric blast",
        summary:
          "A supersonic shock front propagates outward, with overpressure decaying by power law. Structural damage thresholds guide casualty estimates.",
        formulae: [
          {
            label: "Peak Overpressure",
            expression: "ΔP(r) = P₀ · (r₀ / r)^n",
            notes: "Exponent n typically 1.3–1.6; r_0 calibrated so ΔP ≈ 20 psi near impact."
          },
          {
            label: "Blast Arrival Time",
            expression: "t(r) = ∫₀^r dr' / (c + u(r'))",
            notes: "c is sound speed, u accounts for post-shock wind."
          }
        ]
      },
      {
        title: "Thermal Radiation",
        icon: Flame,
        focus: "Fireball heating",
        summary:
          "Plasma expansion radiates energy that ignites vegetation and causes burns. Radiant exposure declines with the square of distance and optical depth.",
        formulae: [
          {
            label: "Thermal Fluence",
            expression: "F(r) = ε E_rad / (4 π r²) · e^{-τ(r)}",
            notes: "ε is radiative efficiency (~0.3), τ accounts for atmospheric attenuation."
          },
          {
            label: "Burn Severity Thresholds",
            expression: "F_3rd ≈ 10⁷ J/m²",
            notes: "Empirical values differentiate second and third-degree burns."
          }
        ]
      },
      {
        title: "Seismic Coupling",
        icon: Brain,
        focus: "Earthquake magnitude",
        summary:
          "A fraction of impact energy couples into seismic waves, approximated via magnitude-energy scaling similar to tectonic quakes.",
        formulae: [
          {
            label: "Moment Magnitude",
            expression: "M_w = (2/3) · log₁₀(E_s) − 3.2",
            notes: "Seismic energy E_s ≈ 10^{-2} E_k for hard rock impacts."
          }
        ]
      },
      {
        title: "Tsunami Generation",
        icon: Waves,
        focus: "Oceanic impacts",
        summary:
          "Water displacements produce waves whose height depends on impact depth, velocity, and sea-floor geometry.",
        formulae: [
          {
            label: "Initial Wave Amplitude",
            expression: "η₀ ≈ α · (m v) / (ρ_w g h²)",
            notes: "α captures momentum transfer efficiency; h is water depth."
          },
          {
            label: "Run-up Height",
            expression: "R ≈ β · η₀ · √(L / h)",
            notes: "β ≈ 2 for typical continental slopes; L is wavelength at shore."
          }
        ]
      },
      {
        title: "Casualty & Damage Modeling",
        icon: Users,
        focus: "Risk estimation",
        summary:
          "Population loss estimates combine hazard footprints with demographic layers and vulnerability curves for structures and humans.",
        formulae: [
          {
            label: "Population Exposure",
            expression: "N = ∫_A ρ(x,y) · V(x,y) dA",
            notes: "ρ is population density; V is vulnerability between 0 and 1."
          },
          {
            label: "Expected Fatalities",
            expression: "F = Σ N_i P_i",
            notes: "P_i are event-specific fatality probabilities (blast, thermal, seismic)."
          }
        ]
      },
      {
        title: "Recurrence & Frequency",
        icon: Zap,
        focus: "Event likelihood",
        summary:
          "Average return periods stem from the size-frequency distribution of near-Earth objects, modeled as power laws in diameter.",
        formulae: [
          {
            label: "Cumulative Frequency",
            expression: "N(>D) = k D^{-b}",
            notes: "Exponent b ≈ 2.3; k calibrated from survey completeness."
          },
          {
            label: "Return Period",
            expression: "T(D) = 1 / N(>D)",
            notes: "Gives mean years between impacts exceeding diameter D."
          }
        ]
      }
    ],
    []
  );

  return (
    <div
      className="min-h-screen relative overflow-hidden text-foreground"
      style={{
        backgroundImage: `url(${spaceBackground})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed"
      }}
    >
      <div className="absolute inset-0 bg-background/70 backdrop-blur-md" />

      <main className="relative z-10 mx-auto max-w-5xl px-6 py-12 space-y-10">
        <header className="panel rounded-xl border-2 border-primary/40 p-6 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-primary text-glow flex items-center gap-3">
                <Calculator className="w-7 h-7" />
                Impact Physics Primer
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                This reference explains the physical models approximating asteroid impact outcomes—energy release, crater formation, shockwaves, thermal radiation, seismic coupling, tsunamis, and casualty assessments. The formulas underpin values shown in the simulation dashboard.
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-primary/80 px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/40 transition hover:bg-primary"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Tracker
            </Link>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <article
                key={section.title}
                className="panel relative rounded-xl border border-border/60 bg-background/80 p-6 shadow-lg shadow-black/20"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-primary/15 p-2 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{section.focus}</p>
                  </div>
                </div>

                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                  {section.summary}
                </p>

                <div className="mt-5 space-y-3">
                  {section.formulae.map((formula) => (
                    <div
                      key={`${section.title}-${formula.label}`}
                      className="rounded-lg border border-border/50 bg-black/20 px-3 py-2"
                    >
                      <p className="text-sm font-semibold text-foreground">{formula.label}</p>
                      <p className="font-mono text-xs text-primary/90">
                        {formula.expression}
                      </p>
                      {formula.notes ? (
                        <p className="mt-1 text-xs text-muted-foreground">{formula.notes}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </section>

        <section className="panel rounded-xl border border-border/70 bg-background/80 p-6 text-sm text-muted-foreground">
          <h2 className="text-base font-semibold text-foreground">Modeling Caveats</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5">
            <li>Formulas provide order-of-magnitude estimates; high-fidelity hydrocodes refine these numbers with material strength and angle of entry.</li>
            <li>Atmospheric filtering, fragmentation, and impact angle can dramatically reduce delivered energy relative to simple spherical assumptions.</li>
            <li>Population impacts require up-to-date demographic layers; uncertainties in exposure dominate casualty forecasts.</li>
            <li>Return periods rely on survey completeness—ongoing NEO detections adjust parameters k and b in the size-frequency distribution.</li>
          </ul>
        </section>
      </main>
    </div>
  );
};

export default ImpactAnalysis;
