import { useEffect, useState } from "react";
import { downloadTransferExcel, getBranches, getStatuses, getTransfers, updateTransferStatus } from "../../services/api";
import { useNavigate } from "react-router-dom";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState([]);
  const [branchMap, setBranchMap] = useState({});
  const [message, setMessage] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [status, setStatus] = useState("");
  const [statuses, setStatuses] = useState([]);
  const [editingTransferId, setEditingTransferId] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");

  const load = async () => {
    try {
      const [transferData, branches, statusData] = await Promise.all([
        getTransfers({ page, pageSize, status }),
        getBranches(),
        getStatuses()
      ]);
      setTransfers(transferData.items);
      setTotalCount(transferData.totalCount);
      setStatuses(statusData);
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
      setEditingTransferId(null);
      setSelectedStatus("");
    } catch (error) {
      setMessage(error.message || "Failed to update status.");
    }
  };

  const startEditStatus = (transferId, currentStatus) => {
    setEditingTransferId(transferId);
    setSelectedStatus(currentStatus);
  };

  const cancelEditStatus = () => {
    setEditingTransferId(null);
    setSelectedStatus("");
  };

  return (
    <section>
      <h2>Admin Dashboard</h2>
      <p>View all transfers and move status forward.</p>
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
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {transfers.map((t) => {
            return (
              <tr key={t.id}>
                <td>{t.transferNo}</td>
                <td>{t.transferDate}</td>
                <td>{branchMap[t.sourceBranchId] || t.sourceBranchId}</td>
                <td>{branchMap[t.destinationBranchId] || t.destinationBranchId}</td>
                <td>{t.status}</td>
                <td>
                  <div className="actions">
                    {editingTransferId === t.id ? (
                      <>
                        <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                          {statuses.map((s) => (
                            <option key={s.id} value={s.statusName}>
                              {s.statusName}
                            </option>
                          ))}
                        </select>
                        <button type="button" onClick={() => handleStatusUpdate(t.id, selectedStatus)}>
                          Save
                        </button>
                        <button type="button" onClick={cancelEditStatus}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button type="button" onClick={() => startEditStatus(t.id, t.status)}>
                        Edit Status
                      </button>
                    )}
                    <button type="button" onClick={() => navigate(`/admin/transfers/${t.id}/details`)}>
                      Details
                    </button>
                    <button type="button" onClick={() => downloadTransferExcel(t.id)}>
                      Download Excel
                    </button>
                  </div>
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
      {message && <p className="message">{message}</p>}
    </section>
  );
}
