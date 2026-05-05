import { useEffect, useState } from "react";
import { getBranches, getTransfers } from "../../services/api";

export default function ManagerDashboardPage() {
  const [transfers, setTransfers] = useState([]);
  const [branchMap, setBranchMap] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [status, setStatus] = useState("");

  useEffect(() => {
    Promise.all([getTransfers({ page, pageSize, status }), getBranches()])
      .then(([transferData, branches]) => {
        setTransfers(transferData.items);
        setTotalCount(transferData.totalCount);
        const map = {};
        branches.forEach((b) => {
          map[b.id] = `${b.branchCode} - ${b.branchName}`;
        });
        setBranchMap(map);
      })
      .catch(() => {
        setTransfers([]);
      });
  }, [page, pageSize, status]);

  return (
    <section>
      <h2>Manager Dashboard</h2>
      <p>All submitted stock transfer entries with current status.</p>
      <div className="actions">
        <label>
          Status
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All</option>
            <option value="Submitted">Submitted</option>
            <option value="Inprogress">Inprogress</option>
            <option value="Completed">Completed</option>
          </select>
        </label>
      </div>
      <table>
        <thead>
          <tr>
            <th>Transfer No</th>
            <th>Date</th>
            <th>Source</th>
            <th>Destination</th>
            <th>Status</th>
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
            </tr>
          ))}
          {transfers.length === 0 && (
            <tr>
              <td colSpan="5">No transfer entries found.</td>
            </tr>
          )}
        </tbody>
      </table>
      <div className="actions">
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
