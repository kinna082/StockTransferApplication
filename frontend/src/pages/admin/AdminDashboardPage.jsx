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
  const [activeStatus, setActiveStatus] = useState("");
  const [statuses, setStatuses] = useState([]);
  const [editingTransferId, setEditingTransferId] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");

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
        if (!cancelled) setMessage("Failed to load master data.");
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
        const transferData = await getTransfers({ page, pageSize, status: activeStatus });
        if (cancelled) return;
        setTransfers(transferData.items);
        setTotalCount(transferData.totalCount);
      } catch {
        if (!cancelled) {
          setTransfers([]);
          setTotalCount(0);
          setMessage("Failed to load transfers.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, activeStatus]);

  const handleStatusUpdate = async (transferId, status) => {
    if (!status) return;
    setMessage("");
    try {
      await updateTransferStatus(transferId, status);
      const transferData = await getTransfers({ page, pageSize, status: activeStatus });
      setTransfers(transferData.items);
      setTotalCount(transferData.totalCount);
      setMessage("Status updated.");
      setEditingTransferId(null);
      setSelectedStatus("");
    } catch (error) {
      setMessage(error.message || "Failed to update status.");
    }
  };

  const selectStatusTab = (statusName) => {
    setActiveStatus(statusName);
    setPage(1);
    setEditingTransferId(null);
    setSelectedStatus("");
  };

  const startEditStatus = (transferId, currentStatus) => {
    setEditingTransferId(transferId);
    setSelectedStatus(currentStatus);
  };

  const cancelEditStatus = () => {
    setEditingTransferId(null);
    setSelectedStatus("");
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <section>
      <h2>Admin Dashboard</h2>
      <p>View all transfers and move status forward.</p>

      <div className="status-tabs" role="tablist" aria-label="Transfer status">
        <button
          type="button"
          role="tab"
          aria-selected={activeStatus === ""}
          className={`status-tab${activeStatus === "" ? " status-tab--active" : ""}`}
          onClick={() => selectStatusTab("")}
        >
          All
        </button>
        {statuses.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={activeStatus === s.statusName}
            className={`status-tab${activeStatus === s.statusName ? " status-tab--active" : ""}`}
            onClick={() => selectStatusTab(s.statusName)}
          >
            {s.statusName}
          </button>
        ))}
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
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => p + 1)}
          disabled={page >= totalPages}
        >
          Next
        </button>
      </div>
      {message && <p className="message">{message}</p>}
    </section>
  );
}
