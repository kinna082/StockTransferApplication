import { useEffect, useState } from "react";
import { getBranches, getTransfers, updateTransferStatus } from "../../services/api";

function nextStatus(currentStatus) {
  if (currentStatus === "Submitted") return "Inprogress";
  if (currentStatus === "Inprogress") return "Completed";
  return null;
}

export default function AdminDashboardPage() {
  const [transfers, setTransfers] = useState([]);
  const [branchMap, setBranchMap] = useState({});
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [status, setStatus] = useState("");

  const load = async () => {
    try {
      const [transferData, branches] = await Promise.all([getTransfers({ page, pageSize, status }), getBranches()]);
      setTransfers(transferData.items);
      setTotalCount(transferData.totalCount);
      const map = {};
      branches.forEach((b) => {
        map[b.id] = `${b.branchCode} - ${b.branchName}`;
      });
      setBranchMap(map);
    } catch {
      setMessage("Failed to load transfers.");
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize, status]);

  const handleStatusUpdate = async (transferId, status) => {
    if (!status) return;
    setMessage("");
    try {
      await updateTransferStatus(transferId, status);
      await load();
      setMessage("Status updated.");
    } catch (error) {
      setMessage(error.message || "Failed to update status.");
    }
  };

  return (
    <section>
      <h2>Admin Dashboard</h2>
      <p>View all transfers and move status forward.</p>
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
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {transfers.map((t) => {
            const next = nextStatus(t.status);
            return (
              <tr key={t.id}>
                <td>{t.transferNo}</td>
                <td>{t.transferDate}</td>
                <td>{branchMap[t.sourceBranchId] || t.sourceBranchId}</td>
                <td>{branchMap[t.destinationBranchId] || t.destinationBranchId}</td>
                <td>{t.status}</td>
                <td>
                  <button type="button" disabled={!next} onClick={() => handleStatusUpdate(t.id, next)}>
                    {next ? `Move to ${next}` : "Completed"}
                  </button>
                </td>
              </tr>
            );
          })}
          {transfers.length === 0 && (
            <tr>
              <td colSpan="6">No transfer entries found.</td>
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
      {message && <p className="message">{message}</p>}
    </section>
  );
}
