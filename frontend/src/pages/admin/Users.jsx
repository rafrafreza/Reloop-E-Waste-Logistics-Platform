import { useEffect, useState } from "react";
import { adminApi } from "../../api/endpoints";
import { PageLoader } from "../../components/ui/Primitives";

const ROLES = ["", "CONSUMER", "PARTNER", "CENTRE", "ADMIN"];

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Users() {
  const [users, setUsers] = useState(null);
  const [roleFilter, setRoleFilter] = useState("");

  const load = () => adminApi.listUsers(roleFilter || undefined).then((res) => setUsers(res.data));

  useEffect(() => {
    setUsers(null);
    load();
  }, [roleFilter]);

  const toggle = async (id) => {
    await adminApi.toggleActive(id);
    await load();
  };

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Users</h1>
      <p className="mt-1 text-sm text-inkfaint">Every account on the platform.</p>

      <div className="mt-5 flex gap-2">
        {ROLES.map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`rounded px-3 py-1.5 font-mono text-xs uppercase tracking-wide ${
              roleFilter === r ? "bg-ink text-white" : "bg-white text-inkfaint border border-ink/10"
            }`}
          >
            {r || "All"}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {!users ? (
          <PageLoader />
        ) : (
          <div className="overflow-x-auto rounded border border-ink/10 bg-white">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-ink/10 bg-paperdim">
                  <th className="px-4 py-3 field-label">Name</th>
                  <th className="px-4 py-3 field-label">Email</th>
                  <th className="px-4 py-3 field-label">Role</th>
                  <th className="px-4 py-3 field-label">Joined</th>
                  <th className="px-4 py-3 field-label">Status</th>
                  <th className="px-4 py-3 field-label"></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-ink/5 last:border-0">
                    <td className="px-4 py-3 text-ink">{u.full_name}</td>
                    <td className="px-4 py-3 text-inkfaint">{u.email}</td>
                    <td className="px-4 py-3 font-mono text-xs text-inkfaint">{u.role}</td>
                    <td className="px-4 py-3 text-inkfaint">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded border px-2 py-0.5 font-mono text-[11px] uppercase ${u.is_active ? "text-circuit bg-circuitlight border-circuit/40" : "text-brick bg-bricklight border-brick/40"}`}>
                        {u.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.role !== "ADMIN" && (
                        <button onClick={() => toggle(u.id)} className="text-xs text-circuit hover:underline">
                          {u.is_active ? "Deactivate" : "Activate"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
