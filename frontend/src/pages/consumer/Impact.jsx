import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { consumerApi } from "../../api/endpoints";
import { useAuth } from "../../context/AuthContext";
import { PageLoader } from "../../components/ui/Primitives";

const BADGES = [
  { threshold: 5, label: "First Steps", icon: "🌱" },
  { threshold: 25, label: "25kg Club", icon: "🍃" },
  { threshold: 100, label: "100kg Club", icon: "🌳" },
  { threshold: 250, label: "Eco Champion", icon: "🏆" },
  { threshold: 500, label: "Reloop Legend", icon: "🌟" },
];

export default function Impact() {
  const { user } = useAuth();
  const [impact, setImpact] = useState(null);

  useEffect(() => {
    consumerApi.impact().then((res) => setImpact(res.data));
  }, []);

  if (!impact) return <PageLoader />;

  const nextBadge = BADGES.find((b) => b.threshold > impact.total_weight_kg);
  const earnedBadges = BADGES.filter((b) => b.threshold <= impact.total_weight_kg);
  const progressToNext = nextBadge ? Math.min(100, (impact.total_weight_kg / nextBadge.threshold) * 100) : 100;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-semibold text-ink">My Impact</h1>
      <p className="mt-1 text-sm text-inkfaint">Your personal contribution to responsible e-waste recycling.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="card p-4">
          <p className="field-label">Weight recycled</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-circuit">{impact.total_weight_kg}<span className="ml-1 text-sm font-normal text-inkfaint">kg</span></p>
        </div>
        <div className="card p-4">
          <p className="field-label">CO2e avoided (est.)</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-circuit">{impact.total_co2_saved_kg}<span className="ml-1 text-sm font-normal text-inkfaint">kg</span></p>
        </div>
        <div className="card p-4">
          <p className="field-label">Pickups completed</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-ink">{impact.total_requests_completed}</p>
        </div>
        <div className="card p-4">
          <p className="field-label">Reward points</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-copper">{user.reward_points}</p>
        </div>
      </div>

      <p className="mt-3 field-label">
        CO2e figures are illustrative sustainability estimates based on typical WEEE recycling averages per category, not lab-measured values.
      </p>

      <div className="ticket mt-8 p-6">
        <p className="field-label">Milestones</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {BADGES.map((b) => {
            const earned = b.threshold <= impact.total_weight_kg;
            return (
              <div
                key={b.label}
                className={`flex flex-col items-center gap-1 rounded border px-4 py-3 text-center ${
                  earned ? "border-circuit/40 bg-circuitlight" : "border-ink/10 bg-paperdim opacity-50"
                }`}
              >
                <span className="text-2xl">{b.icon}</span>
                <span className="text-xs font-medium text-ink">{b.label}</span>
                <span className="field-label">{b.threshold}kg</span>
              </div>
            );
          })}
        </div>

        {nextBadge && (
          <div className="mt-5">
            <div className="flex justify-between text-sm">
              <span className="text-inkfaint">Progress to {nextBadge.label}</span>
              <span className="font-mono text-ink">{impact.total_weight_kg} / {nextBadge.threshold} kg</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-paperdim">
              <div className="h-full rounded-full bg-circuit transition-all" style={{ width: `${progressToNext}%` }} />
            </div>
          </div>
        )}
      </div>

      <div className="ticket mt-6 p-6">
        <p className="field-label">Invite friends, earn points</p>
        <p className="mt-2 text-sm text-ink">
          Share your referral code — you'll both get bonus points when they sign up.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <span className="rounded border border-copper/40 bg-copperlight px-4 py-2 font-mono text-lg tracking-widest text-copper">
            {user.referral_code}
          </span>
        </div>
        <p className="mt-3 field-label">
          You earn 50 points per successful referral. New members get 20 points for using a code.
        </p>
      </div>

      {earnedBadges.length === 0 && impact.total_requests_completed === 0 && (
        <div className="mt-6 text-center">
          <p className="text-sm text-inkfaint">Complete your first pickup to start earning impact stats and badges.</p>
          <Link to="/consumer/new-request" className="btn-primary mt-3 inline-flex">Schedule a pickup</Link>
        </div>
      )}
    </div>
  );
}
