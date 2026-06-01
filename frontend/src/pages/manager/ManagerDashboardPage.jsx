import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getBranches, getStatuses, getTransfers } from "../../services/api";

export default function ManagerDashboardPage() {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState([]);
  const [branchMap, setBranchMap] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [status, setStatus] = useState("");
  const [statuses, setStatuses] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [branches, statusData] = await Promise.all([getBranches(), getStatuses()]);
        if (cancelled) return;
        const map = {};
        branches.forEach((b) => {
          map[b.id] = `${b.branchCode} - ${b.branchName}`;
        });
        setBranchMap(map);
        setStatuses(statusData);
      } catch {
        if (!cancelled) {
          setStatuses([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const transferData = await getTransfers({ page, pageSize, status });
        if (cancelled) return;
        setTransfers(transferData.items);
        setTotalCount(transferData.totalCount);
      } catch {
        if (!cancelled) {
          setTransfers([]);
          setTotalCount(0);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, status]);

  return (
    <section>
      <h2>Manager Dashboard</h2>
      <p>All submitted stock transfer entries with current status.</p>
      <div className="actions">
        <label>
          Status
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All</option>
            {statuses.map((s) => (
              <option key={s.id} value={s.statusName}>
                {s.statusName}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="table-responsive">
      <table>
        <thead>
          <tr>
            <th>Transfer No</th>
            <th>Date</th>
            <th>Source</th>
            <th>Destination</th>
            <th>Status</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {transfers.map((t) => (
            <tr key={t.id}>
              <td>{t.transferNo}</td>
              <td>{t.transferDate}</td>
              <td>{branchMap[t.sourceBranchId] || t.sourceBranchId}</td>
              <td>{branchMap[t.destinationBranchId] || t.destinationBranchId}</td>
              <td>{t.status}</td>
              <td>
                <button type="button" onClick={() => navigate(`/manager/transfers/${t.id}/details`)}>
                  Details
                </button>
              </td>
            </tr>
          ))}
          {transfers.length === 0 && (
            <tr>
              <td colSpan="6">No transfer entries found.</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
      <div className="pagination-bar">
        <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
          Previous
        </button>
        <span>
          Page {page} of {Math.max(1, Math.ceil(totalCount / pageSize))}
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= Math.max(1, Math.ceil(totalCount / pageSize))}
        >
          Next
        </button>
      </div>
    </section>
  );
}
